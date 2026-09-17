# Architecture and Decisions

## Architecture overview

Aplikace je rozdělena na frontend, backend a relační databázi.

- **Frontend:** React + Vite
- **Backend:** Java 21 + Spring Boot + Maven
- **Databáze:** PostgreSQL
- **Správa databázového schématu:** Flyway migrace

## Main components

- **Frontend** – uživatelské rozhraní pro přihlášení, zobrazení termínů a práci s rezervacemi.
- **Backend API** – REST API, validace požadavků, autorizace uživatelů a business pravidla.
- **PostgreSQL** – ukládá uživatele, konzultační termíny, rezervace, relace přihlášení a historii rezervací.
- **Notification Service** – oznámení po vytvoření, schválení nebo zrušení rezervace. *(ještě ve vývoji)*

## Data model

- `app_users` – uživatelé systému a jejich role.
- `consultation_slots` – termíny vytvořené pedagogy.
- `reservations` – rezervace termínů studenty.
- `reservation_history` – historie změn stavu rezervací.
- `auth_sessions` – relace přihlášených uživatelů.

## Key decisions

### Reservation uses a consultation slot

Student nerezervuje libovolný čas, ale konkrétní termín vytvořený pedagogem. Tím je jednodušší kontrolovat dostupnost termínů a zabránit kolizím.

### Pending reservation blocks the slot

Termín není dostupný nejen při stavu `CONFIRMED`, ale také při `PENDING`. Jeden termín proto nemůže současně rezervovat více studentů.

### Database constraints protect availability

Databáze obsahuje unikátní omezení pro aktivní rezervaci termínu a ochranu proti překryvu aktivních termínů jednoho pedagoga. Backend chyby zachytí a vrací je klientovi jako srozumitelnou odpověď.

### Reservation history is stored separately

Každá změna rezervace se uloží do historie. Lze tak dohledat vytvoření, schválení i zrušení rezervace včetně uživatele, který změnu provedl.

### Authentication uses sessions

Po přihlášení backend vytvoří relaci. Frontend posílá token relace při požadavcích na chráněné API.
