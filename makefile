PROJECT_NAME = "game-token-pool"

up/build:
	@docker compose \
		-p ${PROJECT_NAME} \
		up --build -w --remove-orphans

up:
	@docker compose \
		-p ${PROJECT_NAME} \
		up -w

down:
	@docker compose \
		-p ${PROJECT_NAME} \
		down && \
		$(MAKE) clean-image

down/clean:
	@$(MAKE) down && \
		rm -rf ./solana-ledger && \
		$(MAKE) clean-image

clean-image:
	@docker image prune -f

solana/set/dev:
	@solana config set -ud -k ~/.config/solana/devnet-id.json

solana/set/local:
	@solana config set -ul -k ~/.config/solana/local-id.json

build:
	@cd ./anchor && \
		anchor build

test:
	@cd anchor && \
		IS_TESTING_ON_CHAIN=false anchor test --skip-local-validator --skip-deploy

test/onchain:
	@cd anchor && \
		IS_TESTING_ON_CHAIN=true anchor test --skip-local-validator

test/onchain/skip-deploy:
	@cd anchor && \
		IS_TESTING_ON_CHAIN=true anchor test --skip-local-validator --skip-deploy

deploy:
	@$(MAKE) build
	@cd ./anchor && \
		anchor deploy

deploy/dev: 
	@$(MAKE) build
	@cd ./anchor && \
		anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/devnet-id.json