# game-token-pool

## Getting Started

### Prerequisites

- Node v22 or higher
- Rust v1.85 or higher (in practice, building anchor-cli 1.1.2 itself via
  `avm` needs rustc >= 1.89 -- the 1.85 floor is Anchor's own stated minimum,
  not what this repo's toolchain was actually verified against)
- Anchor CLI 1.1.2
- Solana CLI 3.1.10
- surfpool (replaces `solana-test-validator`)

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

#### Start the web app and local surfpool validator (with Make)

```shell
make up/build
```

This starts two compose services: `surfpool` (the local Solana validator,
`surfpool/surfpool:latest`) and `client` (the Next.js app). The client
reaches the validator at `http://surfpool:8899` via
`SOLANA_CLUSTER_PROVIDER`, not `localhost` -- compose no longer uses
`network_mode: host` (which did not behave correctly on macOS).

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

#### To local surfpool validator

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
