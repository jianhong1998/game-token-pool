project_name := "game-token-pool"
# Quoted deliberately: reproduces the original Makefile's literal
# (non-tilde-expanding) behavior for --provider.wallet, since
# PROJECT_DEPLOY_KEY was itself a quoted Make variable.
project_deploy_key := "~/.config/solana/devnet-id.json"

up-build:
    @docker compose \
        -p {{project_name}} \
        up --build -w --remove-orphans

up:
    @docker compose \
        -p {{project_name}} \
        up -w

down:
    @docker compose \
        -p {{project_name}} \
        down && \
        just clean-image

down-clean:
    @just down && \
        just clean && \
        just clean-image

clean:
    @rm -rf ./solana-ledger && \
        rm -rf ./.next

clean-image:
    @docker image prune -f

solana-set-dev:
    @solana config set -ud -k ~/.config/solana/devnet-id.json

solana-set-local:
    @solana config set -ul -k ~/.config/solana/local-id.json

build:
    @cd anchor && \
        anchor build

test:
    @cd anchor && \
        anchor test

test-skip-deploy:
    @cd anchor && \
        anchor test --skip-deploy

deploy:
    @just build
    @cd anchor && \
        anchor deploy

deploy-dev:
    @just build
    @cd anchor && \
        anchor deploy --provider.cluster devnet --provider.wallet "{{project_deploy_key}}"

airdrop-program-owner:
    @solana airdrop 10 8SFmQipCrfKr9sZQarTD71zxa56z41Qv7LJDwBeEYWQ1

airdrop-fee-payer:
    @solana airdrop 10 FPhqPEd6qKRJNaLYJ2rLimYnSHMrzPxqq1Mwe6RFMZQA

deploy-with-airdrop:
    @just airdrop-program-owner && \
        just airdrop-fee-payer && \
        just deploy
