export interface RollupSessionConfig {
  gameId: string;
  sessionId: string;
  maxPlayers: number;
  gameType: string;
  priority: 'low' | 'medium' | 'high';
  autoScale: boolean;
  persistentStorage: boolean;
  networkConfig: {
    maxLatency: number;
    bandwidthLimit: string;
    connectionTimeout: number;
  };
  resourceLimits: {
    cpu: string;
    memory: string;
    storage: string;
    duration: number;
  };
}

export interface RollupSessionState {
  sessionId: string;
  rollupId: string;
  status: 'initializing' | 'active' | 'scaling' | 'draining' | 'terminated';
  playerCount: number;
  createdAt: Date;
  lastStateUpdate: Date;
  stateHash: string;
  version: number;
  metrics: {
    transactionCount: number;
    averageLatency: number;
    errorRate: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
}

export interface SessionTransaction {
  id: string;
  sessionId: string;
  rollupId: string;
  transactionHash: string;
  blockHeight: number;
  timestamp: Date;
  type: string;
  playerId: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
  error?: string;
}

export interface SessionSnapshot {
  sessionId: string;
  rollupId: string;
  snapshotId: string;
  blockHeight: number;
  stateRoot: string;
  timestamp: Date;
  playerStates: Record<string, any>;
  gameState: Record<string, any>;
  size: number;
  checksum: string;
}

export interface SessionMigration {
  sessionId: string;
  sourceRollupId: string;
  targetRollupId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'preparing' | 'migrating' | 'completed' | 'failed';
  migrationData: {
    snapshotId: string;
    playerCount: number;
    transactionCount: number;
    dataSize: number;
  };
  error?: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  rollupId?: string;
  type: 'session_created' | 'session_started' | 'session_ended' | 'player_joined' | 'player_left' | 'rollup_assigned' | 'rollup_terminated' | 'state_synced' | 'error';
  timestamp: Date;
  playerId?: string;
  data: Record<string, any>;
  processed: boolean;
}

export interface SessionMetrics {
  sessionId: string;
  rollupId?: string;
  timeWindow: {
    start: Date;
    end: Date;
  };
  performance: {
    averageLatency: number;
    peakLatency: number;
    throughput: number;
    errorRate: number;
  };
  usage: {
    playerCount: {
      min: number;
      max: number;
      average: number;
    };
    transactionCount: number;
    dataTransferred: number;
  };
  resources: {
    cpu: {
      min: number;
      max: number;
      average: number;
    };
    memory: {
      min: number;
      max: number;
      average: number;
    };
    network: {
      min: number;
      max: number;
      average: number;
    };
  };
}

export interface SessionAlert {
  id: string;
  sessionId: string;
  rollupId?: string;
  type: 'performance' | 'resource' | 'error' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  data: Record<string, any>;
}

export interface SessionPolicy {
  gameType: string;
  autoProvision: boolean;
  autoScale: boolean;
  autoTerminate: boolean;
  maxDuration: number;
  maxPlayers: number;
  resourceLimits: {
    cpu: string;
    memory: string;
    storage: string;
  };
  performanceThresholds: {
    maxLatency: number;
    maxErrorRate: number;
    minThroughput: number;
  };
  costLimits: {
    maxHourlyCost: number;
    maxTotalCost: number;
  };
}