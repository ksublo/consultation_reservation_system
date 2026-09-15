# Consultation Reservation

Monorepo containing the application frontend and backend.

| Folder | Technology | Purpose |
| --- | --- | --- |
| `frontend` | React + Vite | Web user interface |
| `backend` | Spring Boot | REST API |

## Development

Start the frontend with `npm install` and `npm run dev` inside `frontend`.

Configure PostgreSQL using `backend/.env.example`, then start the backend with
`./mvnw spring-boot:run --spring.profiles.active=local` (or
`mvnw.cmd spring-boot:run --spring.profiles.active=local` on Windows).
