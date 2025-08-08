import { TransactionInstruction, PublicKey } from '@solana/web3.js';
import { 
  TransactionType,
  TransactionRouting,
  TransactionContext,
  RoutingDecision,
} from '@/types/transaction-routing.types';
import {
  EndpointType,
  ConnectionSelection,
  TransactionRoutingPreference,
} from '@/types/enhanced-connection.types';
import { ConnectionUtil } from './connection';
import { shouldUseRollup, requiresGameSession, getTransactionPriority } from '@/config/routing-rules';
import { MagicBlockRouter } from './magicblock-router';

export interface TransactionClassification {
  type: TransactionType;
  priority: 'high' | 'medium' | 'low';
  requiresRollup: boolean;
  requiresGameSession: boolean;
  maxLatencyMs: number;
  programId?: PublicKey;
  instructionName?: string;
}

export class TransactionRouter {
  private magicBlockRouter: MagicBlockRouter;
  private routingPreferences: Map<TransactionType, TransactionRoutingPreference>;
  private static instance: TransactionRouter;

  private constructor() {
    this.magicBlockRouter = MagicBlockRouter.getInstance();
    this.initializeRoutingPreferences();
  }

  public static getInstance(): TransactionRouter {
    if (!TransactionRouter.instance) {
      TransactionRouter.instance = new TransactionRouter();
    }
    return TransactionRouter.instance;
  }

  private initializeRoutingPreferences(): void {
    this.routingPreferences = new Map([
      // High-frequency rollup transactions
      ['transfer_token_between_users', {
        transactionType: 'transfer_token_between_users',
        preferredEndpointTypes: [EndpointType.ROLLUP, EndpointType.DEVNET],
        requiresGameSession: true,
        maxLatencyMs: 100,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.ROLLUP, EndpointType.DEVNET, EndpointType.MAINNET],
          maxFailoverAttempts: 2,
          cooldownPeriod: 30000,
          autoRecovery: true,
        },
      }],
      ['user_transfer_token_to_game', {
        transactionType: 'user_transfer_token_to_game',
        preferredEndpointTypes: [EndpointType.ROLLUP, EndpointType.DEVNET],
        requiresGameSession: true,
        maxLatencyMs: 100,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.ROLLUP, EndpointType.DEVNET, EndpointType.MAINNET],
          maxFailoverAttempts: 2,
          cooldownPeriod: 30000,
          autoRecovery: true,
        },
      }],
      ['take_token_from_game', {
        transactionType: 'take_token_from_game',
        preferredEndpointTypes: [EndpointType.ROLLUP, EndpointType.DEVNET],
        requiresGameSession: true,
        maxLatencyMs: 100,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.ROLLUP, EndpointType.DEVNET, EndpointType.MAINNET],
          maxFailoverAttempts: 2,
          cooldownPeriod: 30000,
          autoRecovery: true,
        },
      }],
      ['user_join_game', {
        transactionType: 'user_join_game',
        preferredEndpointTypes: [EndpointType.ROLLUP, EndpointType.DEVNET],
        requiresGameSession: true,
        maxLatencyMs: 200,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.ROLLUP, EndpointType.DEVNET, EndpointType.MAINNET],
          maxFailoverAttempts: 2,
          cooldownPeriod: 30000,
          autoRecovery: true,
        },
      }],
      ['user_quit_game', {
        transactionType: 'user_quit_game',
        preferredEndpointTypes: [EndpointType.ROLLUP, EndpointType.DEVNET],
        requiresGameSession: true,
        maxLatencyMs: 200,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.ROLLUP, EndpointType.DEVNET, EndpointType.MAINNET],
          maxFailoverAttempts: 2,
          cooldownPeriod: 30000,
          autoRecovery: true,
        },
      }],
      
      // Mainnet-only transactions
      ['init_pool', {
        transactionType: 'init_pool',
        preferredEndpointTypes: [EndpointType.MAINNET, EndpointType.DEVNET],
        requiresGameSession: false,
        maxLatencyMs: 1000,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.MAINNET, EndpointType.DEVNET],
          maxFailoverAttempts: 3,
          cooldownPeriod: 60000,
          autoRecovery: true,
        },
      }],
      ['add_user_to_pool', {
        transactionType: 'add_user_to_pool',
        preferredEndpointTypes: [EndpointType.MAINNET, EndpointType.DEVNET],
        requiresGameSession: false,
        maxLatencyMs: 1000,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.MAINNET, EndpointType.DEVNET],
          maxFailoverAttempts: 3,
          cooldownPeriod: 60000,
          autoRecovery: true,
        },
      }],
      ['deposit', {
        transactionType: 'deposit',
        preferredEndpointTypes: [EndpointType.MAINNET, EndpointType.DEVNET],
        requiresGameSession: false,
        maxLatencyMs: 2000,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.MAINNET, EndpointType.DEVNET],
          maxFailoverAttempts: 3,
          cooldownPeriod: 60000,
          autoRecovery: true,
        },
      }],
      ['init_game', {
        transactionType: 'init_game',
        preferredEndpointTypes: [EndpointType.MAINNET, EndpointType.DEVNET],
        requiresGameSession: false,
        maxLatencyMs: 1000,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.MAINNET, EndpointType.DEVNET],
          maxFailoverAttempts: 3,
          cooldownPeriod: 60000,
          autoRecovery: true,
        },
      }],
      ['user_end_game', {
        transactionType: 'user_end_game',
        preferredEndpointTypes: [EndpointType.MAINNET, EndpointType.DEVNET],
        requiresGameSession: true,
        maxLatencyMs: 2000,
        fallbackStrategy: {
          strategy: 'priority-based',
          fallbackOrder: [EndpointType.MAINNET, EndpointType.DEVNET],
          maxFailoverAttempts: 3,
          cooldownPeriod: 60000,
          autoRecovery: true,
        },
      }],
    ]);
  }

  public async routeTransaction(
    instruction: TransactionInstruction,
    transactionType: TransactionType,
    gameId?: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<RoutingDecision> {
    try {
      // Classify the transaction
      const classification = this.classifyTransaction(instruction, transactionType);
      
      // Create transaction context
      const context: TransactionContext = {
        transactionType,
        instruction,
        gameId,
        userId,
        priority: classification.priority,
        requiresRealTime: classification.requiresRollup,
        metadata: {
          ...metadata,
          classification,
          timestamp: new Date().toISOString(),
        },
      };

      // Apply routing rules
      const routingDecision = await this.applyRoutingRules(context);

      // Log routing decision for monitoring
      this.logRoutingDecision(context, routingDecision);

      return routingDecision;
    } catch (error) {
      console.error('[TransactionRouter] Routing failed:', error);
      
      // Return fallback to mainnet connection
      return this.createFallbackRouting(transactionType, error as Error);
    }
  }

  public classifyTransaction(
    instruction: TransactionInstruction,
    transactionType: TransactionType,
  ): TransactionClassification {
    const programId = instruction.programId;
    const instructionData = instruction.data;
    
    // Get the first byte of instruction data as instruction discriminator
    const instructionName = this.getInstructionName(instructionData);

    return {
      type: transactionType,
      priority: getTransactionPriority(transactionType),
      requiresRollup: shouldUseRollup(transactionType),
      requiresGameSession: requiresGameSession(transactionType),
      maxLatencyMs: this.getMaxLatencyForTransaction(transactionType),
      programId,
      instructionName,
    };
  }

  private getInstructionName(data: Buffer): string {
    if (data.length === 0) {
      return 'unknown';
    }
    
    // For Anchor programs, the first 8 bytes are the instruction discriminator
    if (data.length >= 8) {
      return `discriminator_${data.subarray(0, 8).toString('hex')}`;
    }
    
    return `raw_${data.subarray(0, Math.min(4, data.length)).toString('hex')}`;
  }

  private getMaxLatencyForTransaction(transactionType: TransactionType): number {
    const preference = this.routingPreferences.get(transactionType);
    return preference?.maxLatencyMs || 1000;
  }

  private async applyRoutingRules(context: TransactionContext): Promise<RoutingDecision> {
    const preference = this.routingPreferences.get(context.transactionType);
    
    if (!preference) {
      // No specific routing preference, use default logic
      return this.createDefaultRouting(context);
    }

    // Check if game session is required but not provided
    if (preference.requiresGameSession && !context.gameId) {
      return this.createErrorRouting(
        context.transactionType,
        new Error('Game session required but not provided')
      );
    }

    // Try preferred endpoint types in order
    for (const endpointType of preference.preferredEndpointTypes) {
      const routingDecision = await this.tryEndpointType(context, endpointType, preference);
      
      if (routingDecision.connection) {
        return routingDecision;
      }
    }

    // If no preferred endpoints worked, try fallback strategy
    return this.applyFallbackStrategy(context, preference);
  }

  private async tryEndpointType(
    context: TransactionContext,
    endpointType: EndpointType,
    preference: TransactionRoutingPreference,
  ): Promise<RoutingDecision> {
    try {
      if (endpointType === EndpointType.ROLLUP && context.gameId) {
        // Try MagicBlock rollup routing
        return await this.magicBlockRouter.routeTransaction(
          context.instruction,
          context.transactionType,
          context.gameId
        );
      } else {
        // Try standard Solana cluster connection
        const connection = ConnectionUtil.getConnection({
          transactionType: context.transactionType,
          gameId: context.gameId,
          preferRollup: endpointType === EndpointType.ROLLUP,
          requiresLowLatency: preference.maxLatencyMs < 200,
        });

        if (connection) {
          return {
            connection,
            useRollup: false,
            endpoint: connection.rpcEndpoint,
            reason: `Routed to ${endpointType} cluster`,
            estimatedLatency: this.getEstimatedLatency(endpointType),
            fallbackAvailable: true,
          };
        }
      }
    } catch (error) {
      console.warn(`[TransactionRouter] Failed to route to ${endpointType}:`, error);
    }

    return {
      connection: null,
      useRollup: false,
      endpoint: '',
      reason: `${endpointType} unavailable`,
      estimatedLatency: 0,
      fallbackAvailable: true,
    };
  }

  private getEstimatedLatency(endpointType: EndpointType): number {
    switch (endpointType) {
      case EndpointType.ROLLUP: return 50;
      case EndpointType.LOCALNET: return 100;
      case EndpointType.DEVNET: return 400;
      case EndpointType.TESTNET: return 400;
      case EndpointType.MAINNET: return 400;
      default: return 400;
    }
  }

  private async applyFallbackStrategy(
    context: TransactionContext,
    preference: TransactionRoutingPreference,
  ): Promise<RoutingDecision> {
    const fallbackStrategy = preference.fallbackStrategy;
    
    for (const fallbackEndpoint of fallbackStrategy.fallbackOrder) {
      const routingDecision = await this.tryEndpointType(context, fallbackEndpoint, preference);
      
      if (routingDecision.connection) {
        routingDecision.reason += ' (fallback)';
        return routingDecision;
      }
    }

    // All fallback attempts failed
    return this.createErrorRouting(
      context.transactionType,
      new Error('All routing attempts failed')
    );
  }

  private createDefaultRouting(context: TransactionContext): RoutingDecision {
    const connection = ConnectionUtil.getConnection();
    
    return {
      connection,
      useRollup: false,
      endpoint: connection.rpcEndpoint,
      reason: 'Default routing to current cluster',
      estimatedLatency: 400,
      fallbackAvailable: false,
    };
  }

  private createFallbackRouting(transactionType: TransactionType, error: Error): RoutingDecision {
    const connection = ConnectionUtil.getConnection();
    
    return {
      connection,
      useRollup: false,
      endpoint: connection.rpcEndpoint,
      reason: `Fallback routing due to error: ${error.message}`,
      estimatedLatency: 400,
      fallbackAvailable: false,
      error: error.message,
    };
  }

  private createErrorRouting(transactionType: TransactionType, error: Error): RoutingDecision {
    return {
      connection: null,
      useRollup: false,
      endpoint: '',
      reason: `Routing failed: ${error.message}`,
      estimatedLatency: 0,
      fallbackAvailable: false,
      error: error.message,
    };
  }

  private logRoutingDecision(context: TransactionContext, decision: RoutingDecision): void {
    const logData = {
      transactionType: context.transactionType,
      gameId: context.gameId,
      userId: context.userId,
      priority: context.priority,
      useRollup: decision.useRollup,
      endpoint: decision.endpoint,
      reason: decision.reason,
      estimatedLatency: decision.estimatedLatency,
      timestamp: new Date().toISOString(),
      error: decision.error,
    };

    if (decision.error) {
      console.error('[TransactionRouter] Routing decision with error:', logData);
    } else {
      console.log('[TransactionRouter] Routing decision:', logData);
    }
  }

  public getRoutingPreferences(): Map<TransactionType, TransactionRoutingPreference> {
    return new Map(this.routingPreferences);
  }

  public updateRoutingPreference(
    transactionType: TransactionType,
    preference: TransactionRoutingPreference,
  ): void {
    this.routingPreferences.set(transactionType, preference);
  }

  public getRoutingStatistics(): {
    totalRoutes: number;
    rollupRoutes: number;
    mainnetRoutes: number;
    errorRoutes: number;
    averageLatency: number;
  } {
    // This would be implemented with actual metrics collection
    // For now, return mock data
    return {
      totalRoutes: 0,
      rollupRoutes: 0,
      mainnetRoutes: 0,
      errorRoutes: 0,
      averageLatency: 0,
    };
  }

  public async testRouting(
    transactionType: TransactionType,
    gameId?: string,
  ): Promise<{
    success: boolean;
    decision: RoutingDecision;
    latency: number;
  }> {
    const startTime = Date.now();
    
    // Create a mock instruction for testing
    const mockInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('11111111111111111111111111111111'),
      data: Buffer.from([0, 1, 2, 3]), // Mock instruction data
    });

    try {
      const decision = await this.routeTransaction(
        mockInstruction,
        transactionType,
        gameId,
      );

      const latency = Date.now() - startTime;

      return {
        success: decision.connection !== null && !decision.error,
        decision,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        success: false,
        decision: this.createErrorRouting(transactionType, error as Error),
        latency,
      };
    }
  }
}