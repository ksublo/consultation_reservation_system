# Consultation Reservation

Monorepo containing the application frontend and backend.

## Tým

Název týmu: Konzultační rezervační systém

Členové týmu:

- blo0021
- tan0075

Repository: https://github.com/ksublo/consultation_reservation_system

| Folder | Technology | Purpose |
| --- | --- | --- |
| `frontend` | React + Vite | Web user interface |
| `backend` | Spring Boot | REST API |

## Development

Start the frontend with `npm install` and `npm run dev` inside `frontend`.

Configure PostgreSQL using `backend/.env.example`, then start the backend with
`./mvnw spring-boot:run --spring.profiles.active=local` (or
`mvnw.cmd spring-boot:run --spring.profiles.active=local` on Windows).

## CP1 walking skeleton

Cílem CP1 walking skeleton je ověřit jednu end-to-end cestu vytvoření rezervace konzultačního termínu:

POST /reservations
→ ověření přihlášeného studenta
→ validace vybraného konzultačního termínu
→ kontrola dostupnosti a kolizí
→ uložení rezervace do PostgreSQL
→ vrácení ID vytvořené rezervace
→ automatická kontrola ověří, že rezervace byla uložena

Tato cesta ještě nemusí být v C01 kompletně implementovaná, ale je definovaná jako minimální runnable průchod pro CP1.
