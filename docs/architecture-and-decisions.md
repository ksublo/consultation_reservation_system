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

## C03 — Část A: AS-IS mapování scénáře

### A1. Sledovaný scénář

| Položka | Hodnota |
| --- | --- |
| Scénář / operace | OP-05 — Schválení rezervace (Docs → C02, část 12) |
| Požadavky | REQ-05, související REQ-03 |
| Pravidla / invarianty | BR-02 — Jeden termín může mít nejvýše jednu aktivní rezervaci. |
| Baseline | v0.2 |

### A2. Hlavní průchod scénáře

| Krok scénáře | Jak je realizován | Doklad |
| --- | --- | --- |
| Pedagog vybere čekající žádost. | V přehledu svých žádostí zvolí schválení. | TeacherPage.tsx; client.ts — approveReservation() |
| Systém přijme požadavek. | Backend předá vybranou rezervaci ke zpracování. | ReservationController.approve() |
| Systém načte a ověří rezervaci. | Načte rezervaci a uvedeného uživatele. Ověří vlastnictví termínu a čekající stav. | ReservationService.approve(); UserService.get() |
| Systém potvrdí rezervaci. | Změní PENDING na CONFIRMED a zaznamená čas potvrzení. | Reservation.confirm() |
| Systém uloží výsledek. | Uloží změněnou rezervaci a záznam do historie, kdo a kdy ji potvrdil. | ReservationService.approve(); ReservationHistory |
| Student dostane oznámení. | V aplikaci vznikne oznámení o schválení. API vrátí potvrzenou rezervaci a přehled žádostí se obnoví. | NotificationService.create(); ReservationResponse.from(); TeacherPage.tsx |

Termín je blokovaný už čekající rezervací. Při schválení se kontrola kolize neopakuje; jednu aktivní rezervaci na termín chrání databázový index one_active_reservation_per_slot (migrace V1).

### A3. Chybová větev a nalezený rozdíl

| Co říká v0.2 | Kde se podmínka zjistí | Kde se rozhodne výsledek | Co dostane volající |
| --- | --- | --- | --- |
| Jiný pedagog nesmí rezervaci schválit. | Při porovnání uživatele uvedeného v požadavku s vlastníkem termínu. | ReservationService.approve() požadavek odmítne. | HTTP 403 — schválení není povoleno. Rezervace se nezmění. |

| Specifikace | Současná implementace | Doklad |
| --- | --- | --- |
| Schvalovat může pouze vlastník termínu. | Rozhraní ukazuje pouze vlastní žádosti. Backend ale důvěřuje ID uživatele zaslanému klientem. Test potvrdil, že jiný přihlášený pedagog může přímým požadavkem s ID vlastníka rezervaci schválit. Chyba zatím není opravena. | ReservationController.approve(); ReservationService.approve() |

### A4. Hlavní části implementace

| Část | Typ / obsah | Role ve scénáři | Doklad |
| --- | --- | --- | --- |
| Přihlášení | Modul: BearerTokenFilter, AuthService, SecurityConfig | Ověří přihlášení uživatele. | AuthService.authenticate() |
| Rezervační API | Modul: ReservationController | Přijme požadavek na schválení. | ReservationController.approve() |
| Zpracování rezervace | Modul: ReservationService, Reservation, UserService | Zkontroluje podmínky a potvrdí rezervaci. | ReservationService.approve(); Reservation.confirm() |
| Ukládání dat | Modul: ReservationRepository, ReservationHistoryRepository, AppUserRepository, AuthSessionRepository, NotificationRepository | Načte a uloží potřebná data. | Uvedená rozhraní repository |
| Oznámení | Modul: NotificationService | Vytvoří zprávu studentovi o schválení. | NotificationService.create() |

### A5. Stav a pravidlo

| Otázka | Odpověď | Doklad |
| --- | --- | --- |
| Kde je stav rezervace uložen? | V PostgreSQL, v tabulce reservations. Historie změn je v reservation_history. | Reservation; ReservationHistory; migrace V1 |
| Kdo rozhoduje a mění stav? | Služba rezervací zkontroluje podmínky a poté rezervaci přepne z čekající na potvrzenou. | ReservationService.approve(); Reservation.confirm() |

Pravidlo REQ-05: schválit lze pouze čekající rezervaci vlastníkem termínu. Nedostatek kontroly totožnosti je zaznamenán v A3.

| Otázka | Odpověď | Doklad |
| --- | --- | --- |
| Kde se zjistí podmínka? | Ve službě rezervací se porovná vlastník s uvedeným uživatelem a ověří čekající stav. | ReservationService.approve() |
| Kde se rozhodne? | Stejná služba schválení povolí, nebo požadavek odmítne. | ReservationService.approve() |
| Kde se provede změna? | Objekt rezervace nastaví potvrzený stav a čas potvrzení. | Reservation.confirm() |

### A6. Závislosti

| Závislost | Napojení na aplikaci | Která část zná technické API | Doklad |
| --- | --- | --- | --- |
| PostgreSQL | Ukládá rezervace, uživatele, přihlášení, historii a oznámení. | Část ukládání dat — repository a databázové entity. | Repository z A4; migrace V1, V4 a V11 |
| Interní oznámení | Zpracování rezervace požádá o vytvoření oznámení studentovi. | NotificationService a NotificationRepository. | NotificationService.create() |

Oznámení jsou součástí aplikace a ukládají se do stejné databáze. Externí služba ani externí poskytovatel přihlášení se zde nepoužívají.

### A7. Současné uspořádání scénáře

![Schválení rezervace: přihlášení → rezervační API → zpracování rezervace → oznámení. Přihlášení, zpracování a oznámení používají ukládání dat napojené na PostgreSQL.](../frontend/src/assets/docs/c03-approval-flow.svg)

Konkrétní třídy jednotlivých bloků:

- Přihlášení: BearerTokenFilter, AuthService, SecurityConfig.
- Rezervační API: ReservationController.
- Zpracování rezervace: ReservationService, Reservation, UserService.
- Ukládání dat: ReservationRepository, ReservationHistoryRepository, AppUserRepository, AuthSessionRepository, NotificationRepository.
- Oznámení: NotificationService.

### A8. Otázka pro další návrh

| Položka | Obsah |
| --- | --- |
| Otázka | Jak zajistíme, aby schválení vždy vycházelo z identity přihlášeného uživatele? |
| Doklad | Kontrola nyní používá ID zaslané klientem. Obejití této kontroly potvrdil test uvedený v A3. |
| Proč je důležitá | Pouze vlastník termínu smí rozhodovat o jeho rezervaci. |

### A9. AI a ověření

AI pomohla dohledat části kódu a připravit diagram. V běžící aplikaci jsme přes API provedli 9 testů a ověřili výsledky také v databázi:

| Co jsme testovali | Výsledek |
| --- | --- |
| Vlastník schvaluje čekající rezervaci. | HTTP 200. Rezervace přešla na CONFIRMED; uložil se čas potvrzení, záznam do historie a oznámení studentovi. |
| Jiný pedagog a student posílají vlastní ID (2 testy). | HTTP 403. Rezervace, historie a oznámení zůstaly beze změny. |
| Vlastník schvaluje již potvrzenou nebo zrušenou rezervaci (2 testy). | HTTP 409. Rezervace, historie a oznámení zůstaly beze změny. |
| Neexistující rezervace nebo uživatel uvedený v požadavku (2 testy). | HTTP 404. Testovací data se nezměnila. |
| Jiný přihlášený pedagog pošle ID vlastníka při schválení. | HTTP 200. Cizí rezervace byla potvrzena — chyba oprávnění se potvrdila. |
| Jiný přihlášený pedagog pošle ID vlastníka při zrušení čekající rezervace. | HTTP 200. Cizí rezervace byla zrušena — stejná chyba se potvrdila i zde. |

Testovali jsme na dočasných účtech a rezervacích, které jsme potom odstranili. Chyba oprávnění je zaznamenaná v A3 a zatím není opravena.
