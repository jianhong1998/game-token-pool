# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Solana-based game token pool application built with Next.js frontend and Anchor smart contracts. It enables token pooling and game management functionality where users can deposit tokens, join games, transfer tokens between users, and manage game sessions.

## Architecture

### Core Components

- **Smart Contract**: Anchor program (`anchor/programs/gametokenpool/`) written in Rust
- **Frontend**: Next.js 15 application with TypeScript, TailwindCSS, and DaisyUI
- **State Management**: React Query (@tanstack/react-query) with Jotai for local state
- **Blockchain Integration**: @solana/web3.js and @coral-xyz/anchor for Solana interaction

### Key Program Instructions

The Anchor program (`anchor/programs/gametokenpool/src/lib.rs`) provides these main functions:

- `init_pool` - Initialize a token pool
- `add_user_to_pool` - Add users with initial token amounts
- `transfer_token_between_users` - Transfer tokens between users
- `deposit` - User deposits tokens into their account
- `init_game` - Create new game sessions
- `user_join_game` / `user_quit_game` - Game participation
- `user_transfer_token_to_game` / `take_token_from_game` - Game token management

### Frontend Structure

- **Pages**: Admin dashboard (`/admin`), game interface (`/game`), user profiles (`/[username]`)
- **Components**: Modular React components in `src/components/` organized by functionality
- **Actions**: Server actions in `src/app/actions/` for backend operations
- **Types**: TypeScript type definitions in `src/types/`

## Development Commands

### Setup and Build

```bash
# Install dependencies
npm ci

# Build Next.js app
npm run build

# Build Anchor program
make build
# or
npm run anchor-build
```

### Development Server

```bash
# Start development server
npm run dev

# Start with Docker (includes local Solana validator)
make up/build
```

### Testing

```bash
# Run Anchor tests (off-chain)
make test

# Run Anchor tests (on-chain)
make test/onchain

# Run Anchor tests (on-chain, skip deploy)
make test/onchain/skip-deploy
```

### Deployment

```bash
# Deploy to local validator
make deploy

# Deploy with account airdrops
make deploy/with-airdrop

# Deploy to devnet
make deploy/dev
```

### Solana Configuration

```bash
# Set to devnet
make solana/set/dev

# Set to local
make solana/set/local

# Sync program keys
cd anchor && npm run anchor keys sync
```

### Linting and Type Checking

```bash
# ESLint
npm run lint
```

## Key File Locations

- **Program Entry**: `anchor/programs/gametokenpool/src/lib.rs`
- **Program States**: `anchor/programs/gametokenpool/src/states/`
- **Program Instructions**: `anchor/programs/gametokenpool/src/instructions/`
- **Frontend Pages**: `src/app/`
- **React Components**: `src/components/`
- **TypeScript Types**: `src/types/`
- **Utilities**: `src/util/`

## Testing Strategy

The project uses Anchor's testing framework with both off-chain (bankrun) and on-chain testing capabilities. Test files are located in `anchor/tests/specs/` with supporting utilities in `anchor/tests/test-functions/` and `anchor/tests/utils/`.

## Docker Setup

The project includes Docker configuration for running a complete development environment with local Solana validator. Use `make up/build` to start everything or individual make commands for specific operations.
