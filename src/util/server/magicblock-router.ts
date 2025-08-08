import { Connection, TransactionInstruction } from '@solana/web3.js';
import {
  TransactionType,
  TransactionRouting,
  RollupConnectionConfig,
} from '@/types/magicblock.types';
import {
  TransactionContext,
  RoutingDecision,
  ConnectionPool,
} from '@/types/transaction-routing.types';
import {
  MAGICBLOCK_API_KEY,
  MAGICBLOCK_ROLLUP_ENDPOINT,
  MAGICBLOCK_ROUTER_ENDPOINT,
  ROLLUP_AUTO_PROVISION,
  ROLLUP_MAX_INSTANCES,
  TARGET_LATENCY_MS,
} from '@/constants';
import { shouldUseRollup, requiresGameSession } from '@/config/routing-rules';
import { ConnectionUtil } from './connection';
import { EndpointManager } from './endpoint-manager';
import { HealthChecker } from './health-checker';

export class MagicBlockRouter {
  private config: RollupConnectionConfig;
  private connectionPool: ConnectionPool;
  private endpointManager: EndpointManager | null = null;
  private healthChecker: HealthChecker | null = null;
  private static instance: MagicBlockRouter;

  private constructor() {
    this.config = {
      apiKey: MAGICBLOCK_API_KEY || '',
      rollupEndpoint: MAGICBLOCK_ROLLUP_ENDPOINT,
      routerEndpoint: MAGICBLOCK_ROUTER_ENDPOINT,
      config: {
        maxInstances: parseInt(ROLLUP_MAX_INSTANCES),
        sessionTimeout: 3600,
        autoProvision: ROLLUP_AUTO_PROVISION === 'true',
        targetLatency: parseInt(TARGET_LATENCY_MS),
        maxConcurrentUsers: 1000,
      },
    };

    this.connectionPool = {
      mainnet: ConnectionUtil.getConnection(),
      rollups: new Map(),
      healthStatus: new Map(),
      lastHealthCheck: new Map(),
    };

    // Try to initialize enhanced connection components
    this.initializeEnhancedComponents();
  }

  private initializeEnhancedComponents(): void {
    try {
      // These will be null if enhanced mode is not available
      const healthStatus = ConnectionUtil.getHealthStatus();
      if (healthStatus.enhanced) {
        console.log('[MagicBlockRouter] Enhanced connection management detected');
      }
    } catch (error) {
      console.warn('[MagicBlockRouter] Enhanced components not available:', error);
    }
  }

  public static getInstance(): MagicBlockRouter {
    if (!MagicBlockRouter.instance) {
      MagicBlockRouter.instance = new MagicBlockRouter();
    }
    return MagicBlockRouter.instance;
  }

  public async routeTransaction(
    instruction: TransactionInstruction,
    transactionType: TransactionType,
    gameId?: string,
  ): Promise<RoutingDecision> {
    const context: TransactionContext = {
      transactionType,
      instruction,
      gameId,
      priority: this.getTransactionPriority(transactionType),
      requiresRealTime: shouldUseRollup(transactionType),
    };

    // Check if transaction should use rollup
    const useRollup = this.shouldRouteToRollup(context);

    if (useRollup && gameId) {
      const rollupConnection = await this.getRollupConnection(gameId);
      if (rollupConnection) {
        return {
          useRollup: true,
          connection: rollupConnection,
          endpoint: this.getRollupEndpoint(gameId),
          rollupId: gameId,
          reason: 'Transaction routed to rollup for low latency',
          estimatedLatency: this.config.config.targetLatency,
          fallbackAvailable: true,
        };
      }
    }

    // Fallback to mainnet
    return {
      useRollup: false,
      connection: this.connectionPool.mainnet,
      endpoint: this.getMainnetEndpoint(),
      reason: useRollup
        ? 'Rollup unavailable, falling back to mainnet'
        : 'Transaction requires mainnet execution',
      estimatedLatency: 400, // Standard Solana block time
      fallbackAvailable: false,
    };
  }

  private shouldRouteToRollup(context: TransactionContext): boolean {
    // Check if rollup routing is enabled for this transaction type
    if (!shouldUseRollup(context.transactionType)) {
      return false;
    }

    // Check if game session is required and available
    if (requiresGameSession(context.transactionType) && !context.gameId) {
      return false;
    }

    // Check if MagicBlock is properly configured
    if (!this.config.apiKey) {
      console.warn(
        '[MagicBlockRouter] API key not configured, falling back to mainnet',
      );
      return false;
    }

    return true;
  }

  private async getRollupConnection(
    gameId: string,
  ): Promise<Connection | null> {
    try {
      // Try enhanced connection management first
      const enhancedConnection = await ConnectionUtil.getRollupConnection(gameId);
      if (enhancedConnection) {
        return enhancedConnection;
      }

      // Fallback to legacy connection management
      const existingConnection = this.connectionPool.rollups.get(gameId);
      if (existingConnection && (await this.isConnectionHealthy(gameId))) {
        return existingConnection;
      }

      // Create new rollup connection
      const rollupEndpoint = this.getRollupEndpoint(gameId);
      const rollupConnection = new Connection(rollupEndpoint, 'confirmed');

      // Add to enhanced connection management if available
      const endpointId = ConnectionUtil.addRollupEndpoint(gameId, rollupEndpoint);
      if (endpointId) {
        console.log(`[MagicBlockRouter] Added rollup endpoint ${endpointId} for game ${gameId}`);
      }

      // Store in legacy pool as backup
      this.connectionPool.rollups.set(gameId, rollupConnection);
      this.connectionPool.healthStatus.set(gameId, true);
      this.connectionPool.lastHealthCheck.set(gameId, new Date());

      return rollupConnection;
    } catch (error) {
      console.error(
        `[MagicBlockRouter] Failed to get rollup connection for game ${gameId}:`,
        error,
      );
      return null;
    }
  }

  private getRollupEndpoint(gameId: string): string {
    // For now, return a mock endpoint. In production, this would be the actual rollup endpoint
    // provided by MagicBlock for the specific game session
    return `${this.config.rollupEndpoint}/game/${gameId}`;
  }

  private getMainnetEndpoint(): string {
    return ConnectionUtil.getConnection().rpcEndpoint;
  }

  private async isConnectionHealthy(gameId: string): Promise<boolean> {
    const lastCheck = this.connectionPool.lastHealthCheck.get(gameId);
    const healthStatus = this.connectionPool.healthStatus.get(gameId);

    if (!lastCheck || !healthStatus) {
      return false;
    }

    // Consider connection healthy if checked within last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    return lastCheck > thirtySecondsAgo && healthStatus;
  }

  private getTransactionPriority(
    transactionType: TransactionType,
  ): 'high' | 'medium' | 'low' {
    const highPriorityTypes: TransactionType[] = [
      'transfer_token_between_users',
      'user_transfer_token_to_game',
      'take_token_from_game',
      'user_join_game',
      'user_quit_game',
    ];

    return highPriorityTypes.includes(transactionType) ? 'high' : 'medium';
  }

  public async getHealthStatus(): Promise<
    { endpoint: string; healthy: boolean; lastChecked: Date }[]
  > {
    // Try enhanced health status first
    const enhancedStatus = ConnectionUtil.getHealthStatus();
    if (enhancedStatus.enhanced) {
      return enhancedStatus.endpoints.map(endpoint => ({
        endpoint: endpoint.id,
        healthy: endpoint.healthy,
        lastChecked: new Date(), // Enhanced system provides latency, we convert to lastChecked
      }));
    }

    // Fallback to legacy health status
    const status = [];

    // Mainnet status
    status.push({
      endpoint: this.getMainnetEndpoint(),
      healthy: true, // Assume mainnet is always healthy for now
      lastChecked: new Date(),
    });

    // Rollup statuses
    for (const [gameId, _connection] of this.connectionPool.rollups) {
      const healthy = this.connectionPool.healthStatus.get(gameId) || false;
      const lastChecked =
        this.connectionPool.lastHealthCheck.get(gameId) || new Date();

      status.push({
        endpoint: this.getRollupEndpoint(gameId),
        healthy,
        lastChecked,
      });
    }

    return status;
  }

  public getConfiguration(): RollupConnectionConfig {
    return { ...this.config };
  }

  public async cleanupRollupConnection(gameId: string): Promise<void> {
    try {
      // Remove from enhanced connection management
      const removed = ConnectionUtil.removeRollupEndpoint(gameId);
      if (removed) {
        console.log(`[MagicBlockRouter] Removed rollup endpoint for game ${gameId}`);
      }

      // Clean up legacy connection pool
      this.connectionPool.rollups.delete(gameId);
      this.connectionPool.healthStatus.delete(gameId);
      this.connectionPool.lastHealthCheck.delete(gameId);
    } catch (error) {
      console.error(`[MagicBlockRouter] Failed to cleanup rollup connection for game ${gameId}:`, error);
    }
  }

  public getConnectionStatistics(): {
    totalRollups: number;
    activeRollups: number;
    enhanced: boolean;
    metrics?: any;
  } {
    const metrics = ConnectionUtil.getConnectionMetrics();
    
    return {
      totalRollups: this.connectionPool.rollups.size,
      activeRollups: Array.from(this.connectionPool.healthStatus.values())
        .filter(healthy => healthy).length,
      enhanced: metrics.enhanced,
      metrics: metrics.enhanced ? metrics : undefined,
    };
  }
}
