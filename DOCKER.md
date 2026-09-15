# Docker setup

Start Docker Desktop first, then run this command from the repository root:

```powershell
docker compose up --build
```

This starts PostgreSQL, the Spring Boot API and the React frontend.

| Service | Address |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

The database is persisted in the `postgres-data` Docker volume. Stop the stack
with `docker compose down`. To remove the database as well, run
`docker compose down -v`.

## Configuration

The default local credentials are suitable only for development. To override
them, copy `.env.example` to `.env` in the repository root and change the
values before running Compose. The `.env` file is ignored by Git.

The frontend sends relative `/api/...` requests to the Nginx container, which
proxies them to the backend service inside the Compose network.
