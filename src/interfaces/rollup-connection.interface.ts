import { Connection, TransactionInstruction } from '@solana/web3.js';
import {
  RollupInstance,
  TransactionRouting,
  TransactionType,
  PerformanceMeasurement,
  ConnectionHealth,
  RollupSession,
} from '@/types/magicblock.types';

export interface IRollupConnectionManager {
  getConnection(gameId?: string): Promise<Connection>;
  getRoutingDecision(
    instruction: TransactionInstruction,
    transactionType: TransactionType,
  ): Promise<TransactionRouting>;
  createRollupSession(gameId: string): Promise<RollupSession>;
  terminateRollupSession(sessionId: string): Promise<void>;
  getHealthStatus(): Promise<ConnectionHealth[]>;
  measurePerformance(transactionId: string): Promise<PerformanceMeasurement>;
}

export interface IRollupProvisioner {
  provisionRollup(gameId: string): Promise<RollupInstance>;
  terminateRollup(rollupId: string): Promise<void>;
  scaleRollup(rollupId: string, targetUsers: number): Promise<void>;
  getRollupStatus(rollupId: string): Promise<RollupInstance>;
  listActiveRollups(): Promise<RollupInstance[]>;
}

export interface ITransactionRouter {
  routeTransaction(
    instruction: TransactionInstruction,
    transactionType: TransactionType,
  ): Promise<{
    connection: Connection;
    routing: TransactionRouting;
  }>;
  shouldUseRollup(transactionType: TransactionType, gameId?: string): boolean;
  getFallbackConnection(): Connection;
}

export interface IStateManager {
  syncStateToMainnet(rollupId: string): Promise<void>;
  verifyStateConsistency(rollupId: string): Promise<boolean>;
  resolveStateConflict(rollupId: string, conflictData: any): Promise<void>;
  getPendingChanges(rollupId: string): Promise<any[]>;
}

export interface IPerformanceMonitor {
  startMeasurement(transactionId: string): void;
  recordLatency(transactionId: string, stage: string, timestamp: number): void;
  completeMeasurement(transactionId: string): PerformanceMeasurement;
  getAverageLatency(timeWindow?: number): number;
  getSuccessRate(timeWindow?: number): number;
}

export interface IHealthChecker {
  checkEndpointHealth(endpoint: string): Promise<ConnectionHealth>;
  monitorConnectionHealth(): void;
  getHealthReport(): Promise<ConnectionHealth[]>;
  isEndpointHealthy(endpoint: string): Promise<boolean>;
}
