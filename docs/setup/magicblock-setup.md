# MagicBlock Development Environment Setup

This guide helps you set up the MagicBlock rollup integration for local development.

## Prerequisites

- Node.js 18+ installed
- Solana CLI tools installed
- Anchor framework installed
- Access to MagicBlock API (requires API key)

## Environment Configuration

### 1. Environment Variables

Copy the `.env.template` to `.env` and configure the following variables:

```bash
cp .env.template .env
```

### 2. MagicBlock Configuration

Update your `.env` file with your MagicBlock credentials:

```bash
# MagicBlock Configuration
MAGICBLOCK_API_KEY=your_actual_api_key_here
MAGICBLOCK_ROLLUP_ENDPOINT=https://rollup.magicblock.gg
MAGICBLOCK_ROUTER_ENDPOINT=https://router.magicblock.gg

# Rollup Configuration
ROLLUP_AUTO_PROVISION=true
ROLLUP_MAX_INSTANCES=10
ROLLUP_SESSION_TIMEOUT=3600

# Performance Configuration
TARGET_LATENCY_MS=50
MAX_CONCURRENT_USERS=1000
MONITORING_ENABLED=true
```

### 3. Get MagicBlock API Key

1. Visit [MagicBlock Console](https://console.magicblock.gg)
2. Sign up or log in to your account
3. Create a new project or select existing one
4. Generate API key from the project dashboard
5. Copy the API key to your `.env` file

## Development Setup

### 1. Install Dependencies

All MagicBlock SDK dependencies are already included in package.json:

```bash
npm ci
```

### 2. Build Anchor Program

Build the Solana program:

```bash
npm run anchor-build
```

### 3. Start Development Environment

For local development with Solana validator:

```bash
# Start local Solana validator and deploy program
make up/build
```

Or start just the Next.js development server:

```bash
npm run dev
```

### 4. Test MagicBlock Integration

Run the integration tests to verify setup:

```bash
npm test tests/rollup-integration.test.ts
```

## Rollup Testing Infrastructure

### Local Testing

The development environment includes:

- Local Solana validator for mainnet simulation
- MagicBlock router for transaction routing
- Performance monitoring tools
- Integration test suite

### Test Game Sessions

1. Create a test game session
2. Join players to the game
3. Execute high-frequency transactions (transfers, game actions)
4. Monitor rollup provisioning and performance
5. Verify state synchronization

## Development Workflow

### 1. Transaction Routing

The MagicBlock router automatically classifies transactions:

**Rollup Transactions (Ultra-low latency):**
- `transfer_token_between_users`
- `user_transfer_token_to_game`
- `take_token_from_game`
- `user_join_game`
- `user_quit_game`

**Mainnet Transactions (Security-critical):**
- `init_pool`
- `add_user_to_pool`
- `deposit`
- `init_game`
- `user_end_game`

### 2. Performance Monitoring

Monitor performance metrics:

```bash
# Run benchmarks
npm run test:benchmark

# Check performance metrics
tail -f logs/performance.log
```

### 3. Debugging

Enable debug logging in your `.env`:

```bash
DEBUG=magicblock:*
LOG_LEVEL=debug
```

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Verify your MagicBlock API key is correct
2. **Rollup Connection Failed**: Check network connectivity and endpoint URLs
3. **Transaction Routing Issues**: Verify game session is properly initialized
4. **Performance Issues**: Check rollup instance limits and scaling settings

### Debug Commands

```bash
# Check rollup status
curl -H "Authorization: Bearer $MAGICBLOCK_API_KEY" \
  $MAGICBLOCK_ROUTER_ENDPOINT/health

# View active rollup instances
curl -H "Authorization: Bearer $MAGICBLOCK_API_KEY" \
  $MAGICBLOCK_ROLLUP_ENDPOINT/instances

# Test transaction routing
npm run test:routing
```

## Next Steps

Once your development environment is set up:

1. Review the [Architecture Documentation](../architecture/rollup-integration.md)
2. Run the integration tests to verify functionality
3. Start implementing Phase 2 tasks from the [Task Plan](../specifications/001-implement-magic-block-rollup/TASK.md)

## Support

For issues with:
- MagicBlock SDK: [MagicBlock Documentation](https://docs.magicblock.gg)
- Development setup: Check the project's GitHub issues
- Solana integration: [Solana Developer Documentation](https://docs.solana.com)