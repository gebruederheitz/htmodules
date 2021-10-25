build:
	yarn && yarn build

lint:
	yarn && yarn lint

test:
	@make lint


dev:
	yarn && yarn watch
