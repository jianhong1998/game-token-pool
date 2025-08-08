import {
  EndpointConfig,
  EndpointType,
  LoadBalancingConfig,
  EndpointAuthentication,
  EndpointDiscoveryConfig,
} from '@/types/enhanced-connection.types';
import { ClusterType } from '@/types/cluster-type.type';
import {
  SOLANA_CLUSTER_PROVIDER,
  SOLANA_CLUSTER_TYPE,
  MAGICBLOCK_ROLLUP_ENDPOINT,
  MAGICBLOCK_API_KEY,
} from '@/constants';
import { clusterApiUrl } from '@solana/web3.js';

export class EndpointManager {
  private endpoints: Map<string, EndpointConfig> = new Map();
  private loadBalancingConfig: LoadBalancingConfig;
  private discoveryConfig: EndpointDiscoveryConfig;
  private roundRobinCounters: Map<EndpointType, number> = new Map();

  constructor(
    loadBalancingConfig?: LoadBalancingConfig,
    _discoveryConfig?: EndpointDiscoveryConfig,
  ) {
    this.loadBalancingConfig = loadBalancingConfig || {
      algorithm: 'priority-based',
      healthAware: true,
    };

    this.discoveryConfig = _discoveryConfig || {
      autoDiscovery: true,
      discoveryInterval: 300000, // 5 minutes
      rollupProviders: [],
      healthThreshold: 0.95,
    };

    this.initializeDefaultEndpoints();
  }

  private initializeDefaultEndpoints(): void {
    // Initialize Solana cluster endpoints
    const defaultEndpoints: EndpointConfig[] = [
      {
        id: 'localnet',
        type: EndpointType.LOCALNET,
        url: 'http://localhost:8899',
        cluster: 'localnet',
        commitment: 'confirmed',
        priority: 1,
        maxConnections: 10,
        healthCheckInterval: 30000,
        timeoutMs: 10000,
        retryAttempts: 3,
      },
      {
        id: 'devnet',
        type: EndpointType.DEVNET,
        url: SOLANA_CLUSTER_PROVIDER || clusterApiUrl('devnet'),
        cluster: 'devnet',
        commitment: 'confirmed',
        priority: 2,
        maxConnections: 20,
        healthCheckInterval: 60000,
        timeoutMs: 15000,
        retryAttempts: 3,
      },
      {
        id: 'testnet',
        type: EndpointType.TESTNET,
        url: SOLANA_CLUSTER_PROVIDER || clusterApiUrl('testnet'),
        cluster: 'testnet',
        commitment: 'confirmed',
        priority: 3,
        maxConnections: 20,
        healthCheckInterval: 60000,
        timeoutMs: 15000,
        retryAttempts: 3,
      },
      {
        id: 'mainnet-beta',
        type: EndpointType.MAINNET,
        url: SOLANA_CLUSTER_PROVIDER || clusterApiUrl('mainnet-beta'),
        cluster: 'mainnet-beta',
        commitment: 'confirmed',
        priority: 4,
        maxConnections: 50,
        healthCheckInterval: 30000,
        timeoutMs: 20000,
        retryAttempts: 3,
      },
    ];

    defaultEndpoints.forEach((endpoint) => {
      this.endpoints.set(endpoint.id, endpoint);
    });

    // Initialize MagicBlock rollup endpoint if configured
    if (MAGICBLOCK_ROLLUP_ENDPOINT && MAGICBLOCK_API_KEY) {
      const rollupEndpoint: EndpointConfig = {
        id: 'magicblock-rollup',
        type: EndpointType.ROLLUP,
        url: MAGICBLOCK_ROLLUP_ENDPOINT,
        cluster: 'rollup',
        commitment: 'processed',
        apiKey: MAGICBLOCK_API_KEY,
        priority: 0, // Highest priority for performance
        maxConnections: 100,
        healthCheckInterval: 15000,
        timeoutMs: 5000,
        retryAttempts: 2,
        metadata: {
          provider: 'magicblock',
          version: '0.2.5',
        },
      };
      this.endpoints.set(rollupEndpoint.id, rollupEndpoint);
    }
  }

  public addEndpoint(endpoint: EndpointConfig): void {
    this.validateEndpoint(endpoint);
    this.endpoints.set(endpoint.id, endpoint);
  }

  public removeEndpoint(endpointId: string): boolean {
    return this.endpoints.delete(endpointId);
  }

  public getEndpoint(endpointId: string): EndpointConfig | undefined {
    return this.endpoints.get(endpointId);
  }

  public getAllEndpoints(): EndpointConfig[] {
    return Array.from(this.endpoints.values());
  }

  public getEndpointsByType(type: EndpointType): EndpointConfig[] {
    return Array.from(this.endpoints.values()).filter(
      (endpoint) => endpoint.type === type,
    );
  }

  public getEndpointsByCluster(cluster: ClusterType | 'rollup'): EndpointConfig[] {
    return Array.from(this.endpoints.values()).filter(
      (endpoint) => endpoint.cluster === cluster,
    );
  }

  public getCurrentClusterEndpoint(): EndpointConfig | undefined {
    const clusterType = SOLANA_CLUSTER_TYPE as ClusterType;
    return Array.from(this.endpoints.values()).find(
      (endpoint) => endpoint.cluster === clusterType,
    );
  }

  public selectEndpoint(
    type?: EndpointType,
    healthyOnly: boolean = true,
    healthStatuses?: Map<string, boolean>,
  ): EndpointConfig | null {
    let candidates = Array.from(this.endpoints.values());

    // Filter by type if specified
    if (type) {
      candidates = candidates.filter((endpoint) => endpoint.type === type);
    }

    // Filter by health status if required
    if (healthyOnly && healthStatuses) {
      candidates = candidates.filter(
        (endpoint) => healthStatuses.get(endpoint.id) !== false,
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    return this.applyLoadBalancing(candidates, type);
  }

  private applyLoadBalancing(
    candidates: EndpointConfig[],
    type?: EndpointType,
  ): EndpointConfig {
    switch (this.loadBalancingConfig.algorithm) {
      case 'round-robin':
        return this.selectRoundRobin(candidates, type);
      case 'priority-based':
        return this.selectByPriority(candidates);
      case 'weighted':
        return this.selectWeighted(candidates);
      default:
        return this.selectByPriority(candidates);
    }
  }

  private selectRoundRobin(
    candidates: EndpointConfig[],
    type?: EndpointType,
  ): EndpointConfig {
    const key = type || EndpointType.DEVNET;
    const currentCounter = this.roundRobinCounters.get(key) || 0;
    const selectedIndex = currentCounter % candidates.length;
    this.roundRobinCounters.set(key, currentCounter + 1);
    return candidates[selectedIndex];
  }

  private selectByPriority(candidates: EndpointConfig[]): EndpointConfig {
    return candidates.sort((a, b) => a.priority - b.priority)[0];
  }

  private selectWeighted(candidates: EndpointConfig[]): EndpointConfig {
    if (!this.loadBalancingConfig.weights) {
      return this.selectByPriority(candidates);
    }

    const weights = this.loadBalancingConfig.weights;
    const totalWeight = candidates.reduce(
      (sum, endpoint) => sum + (weights[endpoint.id] || 1),
      0,
    );

    let random = Math.random() * totalWeight;
    for (const endpoint of candidates) {
      const weight = weights[endpoint.id] || 1;
      random -= weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return candidates[0];
  }

  public updateEndpoint(endpointId: string, updates: Partial<EndpointConfig>): boolean {
    const existing = this.endpoints.get(endpointId);
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...updates, id: endpointId };
    this.validateEndpoint(updated);
    this.endpoints.set(endpointId, updated);
    return true;
  }

  public addRollupEndpoint(
    gameId: string,
    rollupUrl: string,
    authentication?: EndpointAuthentication,
  ): string {
    const endpointId = `rollup-${gameId}`;
    const rollupEndpoint: EndpointConfig = {
      id: endpointId,
      type: EndpointType.ROLLUP,
      url: rollupUrl,
      cluster: 'rollup',
      commitment: 'processed',
      apiKey: authentication?.credentials?.apiKey || MAGICBLOCK_API_KEY,
      priority: 0,
      maxConnections: 50,
      healthCheckInterval: 10000,
      timeoutMs: 3000,
      retryAttempts: 2,
      metadata: {
        gameId,
        provider: 'magicblock',
        createdAt: new Date().toISOString(),
      },
    };

    this.endpoints.set(endpointId, rollupEndpoint);
    return endpointId;
  }

  public removeRollupEndpoint(gameId: string): boolean {
    const endpointId = `rollup-${gameId}`;
    return this.endpoints.delete(endpointId);
  }

  public getRollupEndpoints(): EndpointConfig[] {
    return Array.from(this.endpoints.values()).filter(
      (endpoint) => endpoint.type === EndpointType.ROLLUP,
    );
  }

  public getEndpointStatistics(): {
    total: number;
    byType: Record<EndpointType, number>;
    healthCheckInterval: { min: number; max: number; avg: number };
  } {
    const endpoints = Array.from(this.endpoints.values());
    const byType = {} as Record<EndpointType, number>;

    // Count by type
    for (const type of Object.values(EndpointType)) {
      byType[type] = endpoints.filter((e) => e.type === type).length;
    }

    // Health check intervals
    const intervals = endpoints.map((e) => e.healthCheckInterval);
    const healthCheckInterval = {
      min: Math.min(...intervals),
      max: Math.max(...intervals),
      avg: intervals.reduce((sum, val) => sum + val, 0) / intervals.length,
    };

    return {
      total: endpoints.length,
      byType,
      healthCheckInterval,
    };
  }

  private validateEndpoint(endpoint: EndpointConfig): void {
    if (!endpoint.id || !endpoint.url || !endpoint.type) {
      throw new Error('Endpoint must have id, url, and type');
    }

    if (endpoint.priority < 0) {
      throw new Error('Priority must be non-negative');
    }

    if (endpoint.maxConnections <= 0) {
      throw new Error('maxConnections must be positive');
    }

    if (endpoint.healthCheckInterval < 5000) {
      throw new Error('healthCheckInterval must be at least 5 seconds');
    }

    try {
      new URL(endpoint.url);
    } catch {
      throw new Error(`Invalid URL: ${endpoint.url}`);
    }
  }

  public setLoadBalancingConfig(config: LoadBalancingConfig): void {
    this.loadBalancingConfig = config;
  }

  public getLoadBalancingConfig(): LoadBalancingConfig {
    return { ...this.loadBalancingConfig };
  }
}