import { TransactionType, RoutingStrategy } from '@/types/magicblock.types';

export interface RoutingRule {
  transactionType: TransactionType;
  strategy: RoutingStrategy;
  requiresGameSession: boolean;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export const TRANSACTION_ROUTING_RULES: Record<TransactionType, RoutingRule> = {
  // High-frequency rollup transactions (ultra-low latency required)
  transfer_token_between_users: {
    transactionType: 'transfer_token_between_users',
    strategy: 'rollup-first',
    requiresGameSession: false,
    priority: 'high',
    description:
      'Real-time token transfers between players - route to rollup for instant execution',
  },

  user_transfer_token_to_game: {
    transactionType: 'user_transfer_token_to_game',
    strategy: 'rollup-first',
    requiresGameSession: true,
    priority: 'high',
    description:
      'Instant game token deposits - requires active game session rollup',
  },

  take_token_from_game: {
    transactionType: 'take_token_from_game',
    strategy: 'rollup-first',
    requiresGameSession: true,
    priority: 'high',
    description:
      'Instant game token withdrawals - requires active game session rollup',
  },

  user_join_game: {
    transactionType: 'user_join_game',
    strategy: 'rollup-first',
    requiresGameSession: true,
    priority: 'high',
    description:
      'Instant game joining - create or use existing game session rollup',
  },

  user_quit_game: {
    transactionType: 'user_quit_game',
    strategy: 'rollup-first',
    requiresGameSession: true,
    priority: 'high',
    description: 'Instant game leaving - use active game session rollup',
  },

  // Mainnet-only transactions (security-critical)
  init_pool: {
    transactionType: 'init_pool',
    strategy: 'mainnet-only',
    requiresGameSession: false,
    priority: 'medium',
    description: 'Pool creation and setup - security-critical, mainnet only',
  },

  add_user_to_pool: {
    transactionType: 'add_user_to_pool',
    strategy: 'mainnet-only',
    requiresGameSession: false,
    priority: 'medium',
    description:
      'Account creation and initial funding - security-critical, mainnet only',
  },

  deposit: {
    transactionType: 'deposit',
    strategy: 'mainnet-only',
    requiresGameSession: false,
    priority: 'medium',
    description: 'External fund deposits - security-critical, mainnet only',
  },

  init_game: {
    transactionType: 'init_game',
    strategy: 'mainnet-only',
    requiresGameSession: false,
    priority: 'medium',
    description: 'Game creation and setup - security-critical, mainnet only',
  },

  user_end_game: {
    transactionType: 'user_end_game',
    strategy: 'mainnet-only',
    requiresGameSession: false,
    priority: 'low',
    description:
      'Final game state commitment - security-critical, mainnet only',
  },
};

export const ROLLUP_TRANSACTION_TYPES: TransactionType[] = [
  'transfer_token_between_users',
  'user_transfer_token_to_game',
  'take_token_from_game',
  'user_join_game',
  'user_quit_game',
];

export const MAINNET_ONLY_TRANSACTION_TYPES: TransactionType[] = [
  'init_pool',
  'add_user_to_pool',
  'deposit',
  'init_game',
  'user_end_game',
];

export function shouldUseRollup(transactionType: TransactionType): boolean {
  const rule = TRANSACTION_ROUTING_RULES[transactionType];
  return rule.strategy === 'rollup-first' || rule.strategy === 'auto';
}

export function requiresGameSession(transactionType: TransactionType): boolean {
  const rule = TRANSACTION_ROUTING_RULES[transactionType];
  return rule.requiresGameSession;
}

export function getTransactionPriority(
  transactionType: TransactionType,
): 'high' | 'medium' | 'low' {
  const rule = TRANSACTION_ROUTING_RULES[transactionType];
  return rule.priority;
}
