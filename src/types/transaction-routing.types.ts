import { Connection, TransactionInstruction } from '@solana/web3.js';
import { TransactionType } from './magicblock.types';

export interface TransactionContext {
  transactionType: TransactionType;
  instruction: TransactionInstruction;
  gameId?: string;
  username?: string;
  priority: 'high' | 'medium' | 'low';
  requiresRealTime: boolean;
}

export interface RoutingDecision {
  useRollup: boolean;
  connection: Connection;
  endpoint: string;
  rollupId?: string;
  reason: string;
  estimatedLatency: number;
  fallbackAvailable: boolean;
}

export interface TransactionMetrics {
  transactionId: string;
  transactionType: TransactionType;
  routingDecision: RoutingDecision;
  startTime: number;
  endTime?: number;
  confirmationTime?: number;
  success: boolean;
  error?: string;
  latencyMs: number;
}

export interface BatchTransactionRequest {
  transactions: TransactionContext[];
  batchId: string;
  gameId?: string;
  atomicExecution: boolean;
}

export interface RoutingConfiguration {
  enableRollupRouting: boolean;
  fallbackToMainnet: boolean;
  maxRetries: number;
  timeoutMs: number;
  healthCheckInterval: number;
  routingRules: Map<TransactionType, RoutingRule>;
}

export interface RoutingRule {
  transactionType: TransactionType;
  useRollup: boolean;
  requiresGameSession: boolean;
  maxLatencyMs: number;
  retryCount: number;
}

export interface ConnectionPool {
  mainnet: Connection;
  rollups: Map<string, Connection>;
  healthStatus: Map<string, boolean>;
  lastHealthCheck: Map<string, Date>;
}

export interface FailoverStrategy {
  primaryEndpoint: string;
  fallbackEndpoints: string[];
  maxFailuresBeforeFailover: number;
  failoverCooldownMs: number;
  autoRecovery: boolean;
}
