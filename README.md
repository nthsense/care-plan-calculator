# care-plan-calculator

Build: `docker compose build --no-cache`
Prod: `docker compose -f docker-compose.prod.yml up`
Dev: `docker compose up -d`

Note: When switching between prod and dev builds, make sure to run `docker compose down -v` and then rebuild before starting the containers so you don't get stale volumes.
