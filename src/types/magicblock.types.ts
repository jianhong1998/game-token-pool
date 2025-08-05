import { Connection } from '@solana/web3.js';

export interface RollupConfig {
  maxInstances: number;
  sessionTimeout: number;
  autoProvision: boolean;
  targetLatency: number;
  maxConcurrentUsers: number;
}

export interface RollupInstance {
  id: string;
  endpoint: string;
  status: 'provisioning' | 'active' | 'terminating' | 'terminated';
  createdAt: Date;
  lastUsed: Date;
  gameId?: string;
  userCount: number;
}

export interface RollupSession {
  id: string;
  rollupId: string;
  gameId: string;
  users: string[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended';
}

export interface TransactionRouting {
  shouldRouteToRollup: boolean;
  rollupId?: string;
  endpoint?: string;
  fallbackToMainnet: boolean;
  reason: string;
}

export interface PerformanceMeasurement {
  transactionSubmission: number;
  rollupConfirmation?: number;
  mainnetSync?: number;
  uiUpdate?: number;
  totalLatency: number;
}

export interface ConnectionHealth {
  endpoint: string;
  isHealthy: boolean;
  latency: number;
  lastChecked: Date;
  errorCount: number;
}

export interface MagicBlockMetrics {
  activeRollups: number;
  totalTransactions: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
}

export type TransactionType =
  | 'init_pool'
  | 'add_user_to_pool'
  | 'deposit'
  | 'init_game'
  | 'user_join_game'
  | 'user_quit_game'
  | 'user_transfer_token_to_game'
  | 'take_token_from_game'
  | 'transfer_token_between_users'
  | 'user_end_game';

export type RoutingStrategy = 'rollup-first' | 'mainnet-only' | 'auto';

export interface RollupConnectionConfig {
  apiKey: string;
  rollupEndpoint: string;
  routerEndpoint: string;
  config: RollupConfig;
}

export interface StateSync {
  rollupState: Record<string, any>;
  mainnetState: Record<string, any>;
  lastSyncTime: Date;
  pendingChanges: Array<{
    type: string;
    data: any;
    timestamp: Date;
  }>;
}
