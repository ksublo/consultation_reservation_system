# C09 — Release candidate record

Datum ověření: 16. 11. 2026  
Větev: `docs/docs09`  
Ověřovaný zdrojový commit před dokumentační změnou: `c79b07251ea114cf2725bc01ae21b60dfe556680`  
Navazující C08 implementace: `3a49a89` (`feat: Add automatic cancellation for unapproved reservations (#67)`)  
Výchozí C08 baseline: `99210f0`

## Vazba na C08

C09 ověřuje skutečné rozhodnutí C08 `ACCEPT`, variantu B: scheduler, kontrola při schválení a kontrola při načtení. Ověřovaný rozsah je omezen na automatické storno čekajících rezervací tři hodiny před začátkem konzultace.

Acceptance criteria C08 jsou `AC-01` až `AC-06` v dokumentech [`intent-and-change.md`](intent-and-change.md) a [`architecture-and-decisions.md`](architecture-and-decisions.md). Změna zahrnuje lifecycle rezervace, scheduler, audit, interní oznámení, API/UI hranici a migraci Flyway V15. Nezměněné zůstávají identity a role, tvorba konzultačních termínů a použití existujícího stavu `CANCELLED`.

## Identita kandidáta

| Položka | Hodnota |
|---|---|
| Runtime | Java 21, Spring Boot 4.1.1, Maven wrapper |
| Frontend | React, TypeScript, Vite, Node/npm |
| Databáze | PostgreSQL 17.11 |
| Schéma | Flyway V1–V15; V15 povoluje `NULL` systémového aktéra v `reservation_history` |
| Konfigurace | Docker Compose; backend používá PostgreSQL službu `database` |
| Backend image | `consultation-reservation-backend:latest`, build manifest `sha256:070411fdaac96f586663155a579c13a580c21eb698222b6d2f7801d28bfbfc3f` |
| Frontend image | `consultation-reservation-frontend:latest`, build manifest `sha256:802e0833a718f4af75886860bd528fb00cfad0993571cc0204d0b68` |
| Frontend dependency lock | `frontend/package-lock.json` aktualizován; `npm audit` po aktualizaci hlásí 0 vulnerabilities |

## Provedené kontroly

| Kontrola | Příkaz | Očekávání | Skutečný výsledek |
|---|---|---|---|
| Backend build, unit a integrační testy | `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 bash backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress -DargLine=-javaagent:/home/netopus/.m2/repository/net/bytebuddy/byte-buddy-agent/1.18.11/byte-buddy-agent-1.18.11.jar clean test` | Build success, žádná chyba | PASS — 45 testů, 0 failures, 0 errors; `BUILD SUCCESS` |
| C08 expiry integrační testy | součást Maven běhu, `ReservationExpiryPersistenceTests` | 6 testů nad skutečným PostgreSQL a Flyway | PASS — 6/6 |
| C08 approval regrese | součást Maven běhu, `ReservationApprovalPersistenceTests`, `ReservationApprovalDesignTests` | zachování schválení a transakčního rollbacku | PASS — 16/16 |
| API a oprávnění regrese | součást Maven běhu, `ReservationAuthorizationTests` | zachování API hranic a cutoffu | PASS — 17/17 |
| Ostatní backendové regrese | součást Maven běhu | zachování lifecycle a persistence | PASS — 6/6 |
| Frontend testy | `cd frontend && npm ci && npm test` | všechny testy projdou | PASS — 12/12 |
| Frontend typecheck | `cd frontend && npm run typecheck` | bez TypeScript chyb | PASS |
| Frontend lint | `cd frontend && npm run lint` | bez lint errors | PASS — 0 errors, 1 existující warning v `HistoryPeriodFilter.tsx:34` |
| Frontend build | `cd frontend && npm run build` | produkční build projde | PASS |
| Frontend dependency audit | `cd frontend && npm ci && npm audit --audit-level=moderate` | žádné známé zranitelnosti | PASS — 0 vulnerabilities po aktualizaci lockfile |
| Compose build a start | `docker compose up -d --build` | PostgreSQL, backend a frontend healthy/running | PASS — všechny tři kontejnery nastartovaly |
| Flyway v běžícím backendu | `docker compose logs backend` | migrace V15 se aplikuje | PASS — PostgreSQL 17.11, schéma na V15 |

Při prvním hostitelském běhu bez PostgreSQL a bez Byte Buddy agenta testy neprošly kvůli prostředí. Tento výsledek není kandidátní testovací výsledek. Opakovaný běh s běžícím Compose PostgreSQL a explicitním `-javaagent` skončil výsledkem uvedeným výše.

## Review a reprodukce

Review C08 implementace je doložen v PR #67. Pro C09 musí jiný člen týmu z čistého checkoutu kandidátního commitu zopakovat minimálně:

```bash
git clone <repository-url>
cd consultation_reservation_system
git checkout <candidate-commit>
docker compose up -d --build
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
  bash backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress \
  -DargLine=-javaagent:/home/netopus/.m2/repository/net/bytebuddy/byte-buddy-agent/1.18.11/byte-buddy-agent-1.18.11.jar \
  clean test
cd frontend
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Stav nezávislé reprodukce: **PENDING**. Dokud nebude zapsán výsledek jiného člena, není splněno celé acceptance criterion C09-4.

## Známá omezení

- Scheduler pracuje s pevným intervalem; automatické storno může být opožděno o interval a dobu databázové operace.
- Při výpadku backendu se scheduler spustí až po obnovení backendu.
- Není doložen dedikovaný test závodu dvou scheduler instancí.
- Vytvoření rezervace přesně na hranici tří hodin je stále přijato, zatímco expiry a approve považují stejnou hranici za uzavřenou.

## Release decision

**CONDITIONAL**

Důvod: kandidát prošel backendovým během 45/45 testů, skutečnou PostgreSQL integrační kontrolou, migrací V15, frontendovými testy a Compose buildem. Rozhodnutí bude možné změnit na `READY` po nezávislém čistém checkoutu a opakování uvedených příkazů jiným členem týmu. Pokud reprodukce selže, kandidát přechází na `HOLD` až do opravy a opakování kontroly.
