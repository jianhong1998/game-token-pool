import { MagicBlockRouter } from '../src/util/server/magicblock-router';
import { RollupConnectionManager } from '../src/util/server/rollup-connection';
import { TransactionType } from '../src/types/magicblock.types';
import { SystemProgram, PublicKey } from '@solana/web3.js';

describe('MagicBlock Rollup Integration', () => {
  let router: MagicBlockRouter;
  let connectionManager: RollupConnectionManager;

  beforeEach(() => {
    router = MagicBlockRouter.getInstance();
    connectionManager = new RollupConnectionManager();
  });

  describe('MagicBlockRouter', () => {
    test('should route high-frequency transactions to rollup', async () => {
      const mockInstruction = SystemProgram.transfer({
        fromPubkey: PublicKey.default,
        toPubkey: PublicKey.default,
        lamports: 1000000,
      });

      const decision = await router.routeTransaction(
        mockInstruction,
        'transfer_token_between_users',
        'test-game-1',
      );

      expect(decision.useRollup).toBe(true);
      expect(decision.rollupId).toBe('test-game-1');
      expect(decision.estimatedLatency).toBeLessThan(100);
      expect(decision.fallbackAvailable).toBe(true);
    });

    test('should route security-critical transactions to mainnet', async () => {
      const mockInstruction = SystemProgram.transfer({
        fromPubkey: PublicKey.default,
        toPubkey: PublicKey.default,
        lamports: 1000000,
      });

      const decision = await router.routeTransaction(
        mockInstruction,
        'init_pool',
      );

      expect(decision.useRollup).toBe(false);
      expect(decision.reason).toContain('mainnet');
      expect(decision.fallbackAvailable).toBe(false);
    });

    test('should fallback to mainnet when rollup unavailable', async () => {
      const mockInstruction = SystemProgram.transfer({
        fromPubkey: PublicKey.default,
        toPubkey: PublicKey.default,
        lamports: 1000000,
      });

      // Test without gameId for transaction that requires game session
      const decision = await router.routeTransaction(
        mockInstruction,
        'user_join_game',
      );

      expect(decision.useRollup).toBe(false);
      expect(decision.reason).toContain('mainnet');
    });

    test('should provide health status for all endpoints', async () => {
      const healthStatus = await router.getHealthStatus();

      expect(Array.isArray(healthStatus)).toBe(true);
      expect(healthStatus.length).toBeGreaterThan(0);

      const mainnetStatus = healthStatus.find(
        (status) => !status.endpoint.includes('/game/'),
      );
      expect(mainnetStatus).toBeDefined();
      expect(mainnetStatus?.healthy).toBe(true);
    });
  });

  describe('RollupConnectionManager', () => {
    test('should create rollup session for game', async () => {
      const gameId = 'test-game-session';
      const session = await connectionManager.createRollupSession(gameId);

      expect(session.gameId).toBe(gameId);
      expect(session.status).toBe('active');
      expect(session.users).toEqual([]);
      expect(session.startTime).toBeInstanceOf(Date);
    });

    test('should provision rollup instance', async () => {
      const gameId = 'test-game-provision';
      const rollupInstance = await connectionManager.provisionRollup(gameId);

      expect(rollupInstance.gameId).toBe(gameId);
      expect(rollupInstance.status).toBe('provisioning');
      expect(rollupInstance.endpoint).toContain(gameId);
      expect(rollupInstance.userCount).toBe(0);
    });

    test('should get connection for game', async () => {
      const gameId = 'test-game-connection';
      const connection = await connectionManager.getConnection(gameId);

      expect(connection).toBeDefined();
      expect(connection.rpcEndpoint).toContain(gameId);
    });

    test('should list active rollups', async () => {
      const gameId1 = 'test-game-1';
      const gameId2 = 'test-game-2';

      await connectionManager.provisionRollup(gameId1);
      await connectionManager.provisionRollup(gameId2);

      // Wait for provisioning to complete
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const activeRollups = await connectionManager.listActiveRollups();
      expect(activeRollups.length).toBeGreaterThanOrEqual(2);
    });

    test('should terminate rollup session', async () => {
      const gameId = 'test-game-terminate';
      const session = await connectionManager.createRollupSession(gameId);

      await connectionManager.terminateRollupSession(session.id);

      // Session should be removed
      await expect(
        connectionManager.terminateRollupSession(session.id),
      ).rejects.toThrow('not found');
    });

    test('should check endpoint health', async () => {
      const endpoint = 'http://localhost:8899';
      const health = await connectionManager.checkEndpointHealth(endpoint);

      expect(health.endpoint).toBe(endpoint);
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(typeof health.isHealthy).toBe('boolean');
      expect(typeof health.latency).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete transaction routing flow', async () => {
      const gameId = 'integration-test-game';

      // Create rollup session
      const session = await connectionManager.createRollupSession(gameId);
      expect(session.status).toBe('active');

      // Route transaction
      const mockInstruction = SystemProgram.transfer({
        fromPubkey: PublicKey.default,
        toPubkey: PublicKey.default,
        lamports: 1000000,
      });

      const decision = await router.routeTransaction(
        mockInstruction,
        'transfer_token_between_users',
        gameId,
      );

      expect(decision.useRollup).toBe(true);
      expect(decision.rollupId).toBe(gameId);

      // Clean up
      await connectionManager.terminateRollupSession(session.id);
    });

    test('should handle rollup provisioning limits', async () => {
      const provisionPromises = [];

      // Try to provision more rollups than the limit allows
      for (let i = 0; i < 15; i++) {
        provisionPromises.push(
          connectionManager
            .provisionRollup(`test-game-limit-${i}`)
            .catch((error) => error.message),
        );
      }

      const results = await Promise.all(provisionPromises);
      const errors = results.filter((result) => typeof result === 'string');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Maximum rollup instances');
    });
  });
});

