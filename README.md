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

## CP1 walking skeleton

**End-to-end cesta:**

`POST /api/reservations` → validace → uložení do PostgreSQL → odpověď `201 Created` s ID rezervace → automatická kontrola

1. Student odešle požadavek na `POST /api/reservations` s `slotId`, `studentId`, `reasonTitle` a `reasonDescription`.
2. Backend ověří povinná data, existenci studenta a termínu, dostupnost termínu, budoucí čas termínu a nepřítomnost kolizní aktivní rezervace.
3. Backend uloží rezervaci do tabulky `reservations` se stavem `PENDING` a zapíše vytvoření do `reservation_history`.
4. API vrátí odpověď `201 Created` včetně nového `reservationId`.
5. Automatický integrační test vytvoří rezervaci přes API, ověří stavový kód `201`, existenci vráceného ID a načtení stejné rezervace z PostgreSQL databáze.

Tato cesta bude po C03 spustitelná s PostgreSQL databází a představuje CP1 walking skeleton před C04.
