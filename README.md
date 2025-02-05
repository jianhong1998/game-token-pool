# game-token-pool

## Getting Started

### Prerequisites

- Node v18.18.0 or higher

- Rust v1.77.2 or higher
- Anchor CLI 0.30.1 or higher
- Solana CLI 1.18.17 or higher

### Installation

#### Clone the repo

```shell
git clone <repo-url>
cd <repo-name>
```

#### Install Dependencies

```shell
npm ci
```

#### Start the web app and local test validator (with Make)

```shell
make up/build
```

## Commands

### Build

#### Web App

```shell
npm run build
```

#### Program

```shell
make build
```

### Sync program keys

```shell
cd anchor
npm run anchor keys sync
```

### Deploy

#### To local test validator

```shell
# Deploy with preset account (without airdrop to the accounts)
make deploy

# Deploy with preset account (with airdrop to the accounts)
make deploy/with-airdrop
```

#### To Devnet

```shell
cd anchor

# Build anchor program
anchor build

# Sync anchor program ID
anchor keys sync

# Setup solana CLI
solana config set -ud -k <PATH_TO_KEYPAIR_JSON_FILE>

anchor deploy --provider.cluster devnet --provider.wallet <PATH_TO_KEYPAIR_JSON_FILE>

```
