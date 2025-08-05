// Global test setup for MagicBlock rollup integration tests

// Mock console.error to avoid noise in test output unless needed
const originalError = console.error;
console.error = (...args: any[]) => {
  // Only show errors that are not expected test errors
  if (!args[0]?.toString().includes('Expected test error')) {
    originalError(...args);
  }
};

// Set default environment variables for testing
if (!process.env.NODE_ENV) {
  (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
}

// Set up test environment variables
process.env.MAGICBLOCK_API_KEY = 'test-api-key';
process.env.MAGICBLOCK_ROLLUP_ENDPOINT = 'http://localhost:9900';
process.env.MAGICBLOCK_ROUTER_ENDPOINT = 'http://localhost:9901';
process.env.ROLLUP_MAX_INSTANCES = '10';
process.env.TARGET_LATENCY_MS = '50';

// Mock FEE_PAYER for testing
process.env.FEE_PAYER = JSON.stringify([
  18, 43, 42, 88, 149, 201, 30, 163, 170, 185, 27, 188, 141, 39, 38, 93,
  200, 98, 209, 66, 106, 58, 93, 16, 43, 55, 127, 39, 254, 143, 36, 89,
  156, 35, 255, 31, 147, 150, 245, 242, 169, 252, 100, 252, 249, 217, 158, 144,
  50, 119, 58, 16, 211, 245, 123, 207, 97, 108, 98, 35, 221, 4, 126, 197
]);
process.env.ADMIN_PASSWORD = 'test-admin-password';
process.env.SOLANA_CLUSTER_TYPE = 'localnet';