import {
  SOLANA_CLUSTER_PROVIDER,
  FEE_PAYER,
  SOLANA_CLUSTER_TYPE,
} from '@/constants';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import {
  getGametokenpoolProgram,
  getGametokenpoolProgramId,
} from '@project/anchor';
import { clusterApiUrl, Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { Gametokenpool } from '../../../anchor/target/types/gametokenpool';
import { ClusterType } from '@/types/cluster-type.type';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { EndpointManager } from './endpoint-manager';
import { HealthChecker } from './health-checker';
import { ConnectionPool } from './connection-pool';
import {
  EndpointType,
  ConnectionSelection,
  ConnectionPoolConfig,
} from '@/types/enhanced-connection.types';
import { TransactionType } from '@/types/magicblock.types';

interface IConnectionMapValue {
  connection: Connection;
  endpoint: string;
}

interface ConnectionRequest {
  transactionType?: TransactionType;
  gameId?: string;
  preferRollup?: boolean;
  requiresLowLatency?: boolean;
}

export class ConnectionUtil {
  // Legacy connection map for backward compatibility
  public connectionMap: Map<string, IConnectionMapValue> = new Map([
    [
      'localnet',
      {
        connection: new Connection('http://localhost:8899', 'confirmed'),
        endpoint: 'http://localhost:8899',
      },
    ],
    [
      'devnet',
      {
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('devnet'),
          'confirmed',
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('devnet'),
      },
    ],
    [
      'testnet',
      {
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('testnet'),
          'confirmed',
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('testnet'),
      },
    ],
    [
      'mainnet-beta',
      {
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('mainnet-beta'),
          'confirmed',
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('mainnet-beta'),
      },
    ],
  ]);

  public provider: AnchorProvider;
  public program: Program<Gametokenpool>;
  public signerKeypair: Keypair;

  // Enhanced connection management components
  private endpointManager: EndpointManager;
  private healthChecker: HealthChecker;
  private connectionPool: ConnectionPool;
  private isEnhancedMode: boolean = false;

  private static self: ConnectionUtil;

  private constructor() {
    // Initialize enhanced connection management
    this.initializeEnhancedConnectionManagement();

    // Initialize legacy connection management for backward compatibility
    this.initializeLegacyConnectionManagement();
  }

  private initializeEnhancedConnectionManagement(): void {
    try {
      this.endpointManager = new EndpointManager();
      this.healthChecker = new HealthChecker(this.endpointManager);
      
      const poolConfig: ConnectionPoolConfig = {
        maxConnectionsPerEndpoint: 20,
        connectionTimeout: 30000,
        idleTimeout: 300000,
        healthCheckInterval: 60000,
        retryAttempts: 3,
        retryDelay: 1000,
        enableHealthChecks: true,
        enableMetrics: true,
      };
      
      this.connectionPool = new ConnectionPool(
        this.endpointManager,
        this.healthChecker,
        poolConfig
      );
      
      // Start health monitoring
      this.healthChecker.start();
      this.isEnhancedMode = true;
      
      console.log('[ConnectionUtil] Enhanced connection management initialized');
    } catch (error) {
      console.warn('[ConnectionUtil] Failed to initialize enhanced mode, falling back to legacy:', error);
      this.isEnhancedMode = false;
    }
  }

  private initializeLegacyConnectionManagement(): void {
    const connectionValue = this.connectionMap.get(SOLANA_CLUSTER_TYPE);

    if (!connectionValue)
      throw new Error(`Invalid cluster type: ${SOLANA_CLUSTER_TYPE}`);

    const { connection } = connectionValue;

    const signerKeypair = ConnectionUtil.getFeePayerKeypair();
    this.signerKeypair = signerKeypair;

    const wallet = new NodeWallet(signerKeypair);

    this.provider = new AnchorProvider(connection, wallet);
    setProvider(this.provider);

    const clusterType = SOLANA_CLUSTER_TYPE as ClusterType;
    const programId = getGametokenpoolProgramId(clusterType);
    this.program = getGametokenpoolProgram(this.provider, programId);
  }

  public static getConnection(request?: ConnectionRequest): Connection {
    const self = this.getSelf();

    // Use enhanced connection management if available
    if (self.isEnhancedMode && request) {
      const enhancedConnection = self.getEnhancedConnection(request);
      if (enhancedConnection) {
        return enhancedConnection.connection;
      }
    }

    // Fallback to legacy connection management
    const connection = self.connectionMap.get(SOLANA_CLUSTER_TYPE)?.connection;

    if (!connection)
      throw new Error(`Invalid SOLANA_CLUSTER_TYPE: ${SOLANA_CLUSTER_TYPE}`);

    return connection;
  }

  private getEnhancedConnection(request: ConnectionRequest): ConnectionSelection | null {
    try {
      // Determine preferred endpoint type based on request
      let preferredType: EndpointType | undefined;
      
      if (request.preferRollup || request.requiresLowLatency) {
        preferredType = EndpointType.ROLLUP;
      } else {
        // Map cluster type to endpoint type
        const clusterType = SOLANA_CLUSTER_TYPE as ClusterType;
        preferredType = this.mapClusterToEndpointType(clusterType);
      }

      // Get health status map
      const healthStatuses = new Map<string, boolean>();
      const healthResults = this.healthChecker.getAllHealthStatuses();
      healthResults.forEach(result => {
        healthStatuses.set(result.endpointId, result.isHealthy);
      });

      // Select endpoint
      const endpoint = this.endpointManager.selectEndpoint(
        preferredType,
        true, // healthyOnly
        healthStatuses
      );

      if (!endpoint) {
        return null;
      }

      // Get connection from pool
      return this.connectionPool.getConnection(endpoint.id).then(connection => {
        if (!connection) {
          return null;
        }

        return {
          connection,
          endpoint,
          reasoning: `Selected ${endpoint.type} endpoint for ${request.transactionType || 'general'} transaction`,
          fallbackAvailable: true,
          estimatedLatency: endpoint.type === EndpointType.ROLLUP ? 50 : 400,
        };
      }).catch(() => null);
    } catch (error) {
      console.error('[ConnectionUtil] Enhanced connection selection failed:', error);
      return null;
    }
  }

  private mapClusterToEndpointType(cluster: ClusterType): EndpointType {
    switch (cluster) {
      case 'localnet': return EndpointType.LOCALNET;
      case 'devnet': return EndpointType.DEVNET;
      case 'testnet': return EndpointType.TESTNET;
      case 'mainnet-beta': return EndpointType.MAINNET;
      default: return EndpointType.DEVNET;
    }
  }

  public static getProvider(): AnchorProvider {
    return this.getSelf().provider;
  }

  public static getProgram(): Program<Gametokenpool> {
    return this.getSelf().program;
  }

  public static getWallet() {
    const provider = this.getSelf().provider;

    return provider.wallet;
  }

  public static getSigner(): Keypair {
    return this.getSelf().signerKeypair;
  }

  public static getClusterType(): ClusterType {
    return SOLANA_CLUSTER_TYPE as ClusterType;
  }

  // Legacy methods remain unchanged for backward compatibility

  private static getFeePayerKeypair() {
    const keyString = FEE_PAYER;
    if (!keyString) throw new Error(`Invalid FEE_PAYER_KEY: ${keyString}`);

    const uint8 = Uint8Array.from(JSON.parse(keyString) as number[]);
    return Keypair.fromSecretKey(uint8);
  }

  // Enhanced connection methods
  public static async getRollupConnection(gameId: string): Promise<Connection | null> {
    const self = this.getSelf();
    
    if (!self.isEnhancedMode) {
      return null;
    }

    try {
      const endpointId = `rollup-${gameId}`;
      return await self.connectionPool.getConnection(endpointId);
    } catch (error) {
      console.error(`[ConnectionUtil] Failed to get rollup connection for game ${gameId}:`, error);
      return null;
    }
  }

  public static getConnectionWithFallback(
    request: ConnectionRequest
  ): Promise<ConnectionSelection> {
    const self = this.getSelf();

    return new Promise(async (resolve) => {
      if (self.isEnhancedMode) {
        const enhancedConnection = self.getEnhancedConnection(request);
        if (enhancedConnection) {
          const result = await enhancedConnection;
          if (result) {
            resolve(result);
            return;
          }
        }
      }

      // Fallback to legacy connection
      const legacyConnection = self.connectionMap.get(SOLANA_CLUSTER_TYPE)?.connection;
      if (legacyConnection) {
        const endpoint = self.endpointManager?.getCurrentClusterEndpoint();
        resolve({
          connection: legacyConnection,
          endpoint: endpoint || {
            id: SOLANA_CLUSTER_TYPE,
            type: self.mapClusterToEndpointType(SOLANA_CLUSTER_TYPE as ClusterType),
            url: legacyConnection.rpcEndpoint,
            cluster: SOLANA_CLUSTER_TYPE as ClusterType,
            commitment: 'confirmed',
            priority: 1,
            maxConnections: 10,
            healthCheckInterval: 60000,
            timeoutMs: 30000,
            retryAttempts: 3,
          },
          reasoning: 'Fallback to legacy connection',
          fallbackAvailable: false,
          estimatedLatency: 400,
        });
      } else {
        throw new Error(`No connection available for cluster: ${SOLANA_CLUSTER_TYPE}`);
      }
    });
  }

  public static addRollupEndpoint(gameId: string, rollupUrl: string): string | null {
    const self = this.getSelf();
    
    if (!self.isEnhancedMode) {
      return null;
    }

    try {
      return self.endpointManager.addRollupEndpoint(gameId, rollupUrl);
    } catch (error) {
      console.error(`[ConnectionUtil] Failed to add rollup endpoint for game ${gameId}:`, error);
      return null;
    }
  }

  public static removeRollupEndpoint(gameId: string): boolean {
    const self = this.getSelf();
    
    if (!self.isEnhancedMode) {
      return false;
    }

    try {
      const success = self.endpointManager.removeRollupEndpoint(gameId);
      if (success) {
        self.healthChecker.removeEndpoint(`rollup-${gameId}`);
        self.connectionPool.closeAllConnections(`rollup-${gameId}`);
      }
      return success;
    } catch (error) {
      console.error(`[ConnectionUtil] Failed to remove rollup endpoint for game ${gameId}:`, error);
      return false;
    }
  }

  public static getHealthStatus(): {
    enhanced: boolean;
    endpoints: { id: string; healthy: boolean; latency: number }[];
  } {
    const self = this.getSelf();
    
    if (!self.isEnhancedMode) {
      return {
        enhanced: false,
        endpoints: [{
          id: SOLANA_CLUSTER_TYPE,
          healthy: true,
          latency: 0,
        }],
      };
    }

    const healthResults = self.healthChecker.getAllHealthStatuses();
    return {
      enhanced: true,
      endpoints: healthResults.map(result => ({
        id: result.endpointId,
        healthy: result.isHealthy,
        latency: result.latency,
      })),
    };
  }

  public static getConnectionMetrics(): {
    enhanced: boolean;
    poolStats?: any;
    healthSummary?: any;
  } {
    const self = this.getSelf();
    
    if (!self.isEnhancedMode) {
      return { enhanced: false };
    }

    return {
      enhanced: true,
      poolStats: self.connectionPool.getPoolStatistics(),
      healthSummary: self.healthChecker.getHealthSummary(),
    };
  }

  public static shutdown(): void {
    const self = this.getSelf();
    
    if (self.isEnhancedMode) {
      self.healthChecker.stop();
      self.connectionPool.destroy();
      console.log('[ConnectionUtil] Enhanced connection management shut down');
    }
  }

  private static getSelf(): ConnectionUtil {
    if (!this.self) {
      this.self = new ConnectionUtil();
    }

    return this.self;
  }
}
