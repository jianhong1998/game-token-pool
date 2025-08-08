import { Connection, Commitment } from '@solana/web3.js';
import { ClusterType } from './cluster-type.type';
import { TransactionType } from './magicblock.types';

export interface EndpointConfig {
  id: string;
  type: EndpointType;
  url: string;
  cluster: ClusterType | 'rollup';
  commitment: Commitment;
  apiKey?: string;
  priority: number;
  maxConnections: number;
  healthCheckInterval: number;
  timeoutMs: number;
  retryAttempts: number;
  metadata?: Record<string, unknown>;
}

export enum EndpointType {
  MAINNET = 'mainnet',
  DEVNET = 'devnet',
  TESTNET = 'testnet',
  LOCALNET = 'localnet',
  ROLLUP = 'rollup',
}

export interface ConnectionPoolConfig {
  maxConnectionsPerEndpoint: number;
  connectionTimeout: number;
  idleTimeout: number;
  healthCheckInterval: number;
  retryAttempts: number;
  retryDelay: number;
  enableHealthChecks: boolean;
  enableMetrics: boolean;
}

export interface HealthCheckResult {
  endpointId: string;
  isHealthy: boolean;
  latency: number;
  timestamp: Date;
  error?: string;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface ConnectionMetrics {
  endpointId: string;
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageLatency: number;
  lastUsed: Date;
  successRate: number;
  requestCount: number;
}

export interface ConnectionPoolEntry {
  connection: Connection;
  endpoint: EndpointConfig;
  createdAt: Date;
  lastUsed: Date;
  requestCount: number;
  isHealthy: boolean;
  isActive: boolean;
}

export interface FailoverStrategy {
  strategy: 'round-robin' | 'lowest-latency' | 'priority-based' | 'load-based';
  fallbackOrder: EndpointType[];
  maxFailoverAttempts: number;
  cooldownPeriod: number;
  autoRecovery: boolean;
}

export interface ConnectionSelection {
  connection: Connection;
  endpoint: EndpointConfig;
  reasoning: string;
  fallbackAvailable: boolean;
  estimatedLatency: number;
}

export interface EndpointDiscoveryConfig {
  autoDiscovery: boolean;
  discoveryInterval: number;
  rollupProviders: string[];
  healthThreshold: number;
}

export interface TransactionRoutingPreference {
  transactionType: TransactionType;
  preferredEndpointTypes: EndpointType[];
  requiresGameSession: boolean;
  maxLatencyMs: number;
  fallbackStrategy: FailoverStrategy;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerState {
  endpointId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

export interface LoadBalancingConfig {
  algorithm: 'round-robin' | 'weighted' | 'least-connections' | 'response-time' | 'priority-based';
  weights?: Record<string, number>;
  stickySession?: boolean;
  healthAware: boolean;
}

export interface EndpointAuthentication {
  type: 'api-key' | 'bearer-token' | 'custom';
  credentials: Record<string, string>;
  refreshable: boolean;
  expiresAt?: Date;
}