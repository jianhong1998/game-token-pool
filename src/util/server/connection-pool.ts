import { Connection } from '@solana/web3.js';
import {
  EndpointConfig,
  ConnectionPoolConfig,
  ConnectionPoolEntry,
  ConnectionMetrics,
} from '@/types/enhanced-connection.types';
import { EndpointManager } from './endpoint-manager';
import { HealthChecker } from './health-checker';

export class ConnectionPool {
  private endpointManager: EndpointManager;
  private healthChecker: HealthChecker;
  private config: ConnectionPoolConfig;
  private connections: Map<string, ConnectionPoolEntry[]> = new Map();
  private metrics: Map<string, ConnectionMetrics> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    endpointManager: EndpointManager,
    healthChecker: HealthChecker,
    config?: ConnectionPoolConfig,
  ) {
    this.endpointManager = endpointManager;
    this.healthChecker = healthChecker;
    this.config = config || {
      maxConnectionsPerEndpoint: 10,
      connectionTimeout: 30000,
      idleTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableHealthChecks: true,
      enableMetrics: true,
    };

    this.startCleanupProcess();
  }

  public async getConnection(
    endpointId: string,
    forceNew: boolean = false,
  ): Promise<Connection | null> {
    const endpoint = this.endpointManager.getEndpoint(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    // Check endpoint health if health checking is enabled
    if (this.config.enableHealthChecks && !this.isEndpointHealthy(endpointId)) {
      return null;
    }

    // Try to get an existing connection if not forcing new
    if (!forceNew) {
      const existingConnection = this.getExistingConnection(endpointId);
      if (existingConnection) {
        this.updateConnectionUsage(existingConnection);
        this.updateMetrics(endpointId, 'reused');
        return existingConnection.connection;
      }
    }

    // Create new connection if under limits
    if (this.canCreateNewConnection(endpointId)) {
      const connection = await this.createNewConnection(endpoint);
      if (connection) {
        this.updateMetrics(endpointId, 'created');
        return connection.connection;
      }
    }

    // No connection available
    this.updateMetrics(endpointId, 'rejected');
    return null;
  }

  private getExistingConnection(endpointId: string): ConnectionPoolEntry | null {
    const endpointConnections = this.connections.get(endpointId) || [];
    
    // Find an active, healthy connection
    const availableConnection = endpointConnections.find(
      (entry) => entry.isActive && entry.isHealthy,
    );

    return availableConnection || null;
  }

  private canCreateNewConnection(endpointId: string): boolean {
    const endpoint = this.endpointManager.getEndpoint(endpointId);
    if (!endpoint) {
      return false;
    }

    const existingConnections = this.connections.get(endpointId) || [];
    const activeConnections = existingConnections.filter((entry) => entry.isActive);
    
    return activeConnections.length < endpoint.maxConnections;
  }

  private async createNewConnection(
    endpoint: EndpointConfig,
  ): Promise<ConnectionPoolEntry | null> {
    try {
      const connection = new Connection(endpoint.url, endpoint.commitment);
      
      // Test the connection
      await this.testConnection(connection, endpoint);

      const entry: ConnectionPoolEntry = {
        connection,
        endpoint,
        createdAt: new Date(),
        lastUsed: new Date(),
        requestCount: 0,
        isHealthy: true,
        isActive: true,
      };

      // Add to pool
      const endpointConnections = this.connections.get(endpoint.id) || [];
      endpointConnections.push(entry);
      this.connections.set(endpoint.id, endpointConnections);

      return entry;
    } catch (error) {
      console.error(
        `[ConnectionPool] Failed to create connection for ${endpoint.id}:`,
        error,
      );
      return null;
    }
  }

  private async testConnection(connection: Connection, endpoint: EndpointConfig): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Connection test timeout after ${endpoint.timeoutMs}ms`));
      }, endpoint.timeoutMs);
    });

    try {
      await Promise.race([
        this.performConnectionTest(connection, endpoint),
        timeoutPromise,
      ]);
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`);
    }
  }

  private async performConnectionTest(
    connection: Connection,
    endpoint: EndpointConfig,
  ): Promise<void> {
    if (endpoint.type === 'rollup') {
      // For rollup endpoints, test with getVersion
      await connection.getVersion();
    } else {
      // For Solana clusters, test with getSlot
      await connection.getSlot();
    }
  }

  private updateConnectionUsage(entry: ConnectionPoolEntry): void {
    entry.lastUsed = new Date();
    entry.requestCount += 1;
  }

  private isEndpointHealthy(endpointId: string): boolean {
    return this.healthChecker.isEndpointHealthy(endpointId);
  }

  public releaseConnection(endpointId: string, connection: Connection): void {
    const endpointConnections = this.connections.get(endpointId);
    if (!endpointConnections) {
      return;
    }

    const entry = endpointConnections.find((e) => e.connection === connection);
    if (entry) {
      entry.isActive = true; // Mark as available for reuse
    }
  }

  public removeConnection(endpointId: string, connection: Connection): void {
    const endpointConnections = this.connections.get(endpointId);
    if (!endpointConnections) {
      return;
    }

    const index = endpointConnections.findIndex((e) => e.connection === connection);
    if (index >= 0) {
      endpointConnections.splice(index, 1);
      this.updateMetrics(endpointId, 'removed');
    }
  }

  public async closeAllConnections(endpointId?: string): Promise<void> {
    if (endpointId) {
      // Close connections for specific endpoint
      const endpointConnections = this.connections.get(endpointId);
      if (endpointConnections) {
        for (const entry of endpointConnections) {
          entry.isActive = false;
        }
        this.connections.delete(endpointId);
      }
    } else {
      // Close all connections
      for (const [id, connections] of this.connections.entries()) {
        for (const entry of connections) {
          entry.isActive = false;
        }
      }
      this.connections.clear();
    }
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.idleTimeout);
  }

  private performCleanup(): void {
    const now = new Date();
    const idleThreshold = new Date(now.getTime() - this.config.idleTimeout);

    for (const [endpointId, connections] of this.connections.entries()) {
      const activeConnections: ConnectionPoolEntry[] = [];

      for (const entry of connections) {
        if (entry.lastUsed > idleThreshold && entry.isHealthy) {
          activeConnections.push(entry);
        } else {
          // Mark inactive connection for removal
          entry.isActive = false;
          this.updateMetrics(endpointId, 'cleaned');
        }
      }

      if (activeConnections.length !== connections.length) {
        this.connections.set(endpointId, activeConnections);
      }
    }
  }

  private updateMetrics(endpointId: string, operation: string): void {
    if (!this.config.enableMetrics) {
      return;
    }

    const existing = this.metrics.get(endpointId) || {
      endpointId,
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      lastUsed: new Date(),
      successRate: 1,
      requestCount: 0,
    };

    switch (operation) {
      case 'created':
        existing.totalConnections += 1;
        existing.activeConnections += 1;
        break;
      case 'reused':
        existing.requestCount += 1;
        break;
      case 'removed':
      case 'cleaned':
        existing.activeConnections = Math.max(0, existing.activeConnections - 1);
        break;
      case 'rejected':
        existing.failedConnections += 1;
        break;
    }

    existing.lastUsed = new Date();
    existing.successRate = existing.totalConnections > 0 
      ? (existing.totalConnections - existing.failedConnections) / existing.totalConnections 
      : 1;

    this.metrics.set(endpointId, existing);
  }

  public getConnectionMetrics(endpointId: string): ConnectionMetrics | null {
    return this.metrics.get(endpointId) || null;
  }

  public getAllConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.metrics.values());
  }

  public getPoolStatistics(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    endpointBreakdown: Record<string, number>;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;
    const endpointBreakdown: Record<string, number> = {};

    for (const [endpointId, connections] of this.connections.entries()) {
      const endpointActiveCount = connections.filter((c) => c.isActive).length;
      const endpointIdleCount = connections.length - endpointActiveCount;

      totalConnections += connections.length;
      activeConnections += endpointActiveCount;
      idleConnections += endpointIdleCount;
      endpointBreakdown[endpointId] = connections.length;
    }

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      endpointBreakdown,
    };
  }

  public async healthCheckConnections(): Promise<void> {
    for (const [endpointId, connections] of this.connections.entries()) {
      const endpoint = this.endpointManager.getEndpoint(endpointId);
      if (!endpoint) {
        continue;
      }

      for (const entry of connections) {
        try {
          await this.testConnection(entry.connection, endpoint);
          entry.isHealthy = true;
        } catch (error) {
          entry.isHealthy = false;
          console.warn(
            `[ConnectionPool] Connection health check failed for ${endpointId}:`,
            error,
          );
        }
      }
    }
  }

  public getConfiguration(): ConnectionPoolConfig {
    return { ...this.config };
  }

  public updateConfiguration(updates: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart cleanup process if idle timeout changed
    if (updates.idleTimeout && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.startCleanupProcess();
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.closeAllConnections();
  }
}