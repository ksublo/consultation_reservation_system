# Rezervační systém konzultací

Webová aplikace pro rezervaci konzultačních termínů na univerzitě. Studenti si vybírají dostupné termíny a žádají o konzultaci; pedagogové termíny vytvářejí a žádosti schvalují.

## Obsah

- [Technologie a části aplikace](#technologie-a-části-aplikace)
- [Rychlé spuštění](#rychlé-spuštění)
- [Vývoj](#vývoj)
- [Dokumentace](#dokumentace)

## Technologie a části aplikace

| Část | Technologie | Umístění | Účel |
| --- | --- | --- | --- |
| Uživatelské rozhraní | React, Vite a TypeScript | `frontend/` | Přihlášení, nabídka termínů a správa rezervací |
| Serverové rozhraní | Java 21, Spring Boot a Maven | `backend/` | REST API, ověřování uživatelů a pravidla rezervací |
| Databáze | PostgreSQL a Flyway | `backend/src/main/resources/db/migration/` | Ukládání dat a správa databázového schématu |
| Dokumentace | Markdown a JSON | `docs/`, `frontend/src/features/docs/` | Projektové podklady a dokumentace zobrazovaná v aplikaci |

## Rychlé spuštění

Nejjednodušší je spustit všechny služby pomocí Docker Compose. Je potřeba mít nainstalovaný a spuštěný Docker Desktop.

```sh
docker compose up --build
```

Po spuštění jsou dostupné:

| Služba | Adresa |
| --- | --- |
| Aplikace | <http://localhost:5173> |
| Backend API | <http://localhost:8080> |
| PostgreSQL | `localhost:5432` |

Služby zastavíte příkazem `docker compose down`. Podrobnosti ke konfiguraci a práci s databázovým svazkem jsou v [návodu k Dockeru](DOCKER.md).

## Vývoj

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Další dostupné příkazy:

```sh
npm run build
npm test
npm run lint
npm run typecheck
npm run format
npm run format:check
```

### Backend

Nastavte připojení k PostgreSQL podle `backend/.env.example` a z adresáře `backend/` spusťte:

```sh
./mvnw spring-boot:run --spring.profiles.active=local
```

Ve Windows použijte `mvnw.cmd` místo `./mvnw`. Formátování a kontrolu formátování zajišťuje Google Java Format:

```sh
mvn fmt:format
mvn fmt:check
```

## Dokumentace

Dokumentace je rozdělená podle účelu. Projektové podklady a záznamy jsou v kořenové složce `docs/`; texty jednotlivých částí, které se zobrazují přímo ve webové aplikaci, jsou samostatně ve `frontend/src/features/docs/`.

### Projektové podklady (`docs/`)

| Soubor nebo složka | Obsah |
| --- | --- |
| [`docs/intent-and-change.md`](docs/intent-and-change.md) | Záměr projektu, jeho uživatelé, hlavní pojmy a operace |
| [`docs/architecture-and-decisions.md`](docs/architecture-and-decisions.md) | Architektura, datový model a technická rozhodnutí včetně ADR |
| [`docs/evidence-and-evolution.md`](docs/evidence-and-evolution.md) | Ověřovací důkazy, výsledky etap a vývoj projektu |
| [`docs/deployment-development.md`](docs/deployment-development.md) | Postup nasazení větve `development` |
| [`docs/diagrams/`](docs/diagrams/) | Zdrojové a vykreslené diagramy, například životní cyklus rezervace |
| [`DOCKER.md`](DOCKER.md) | Lokální spuštění služeb a nastavení Docker Compose |

### Dokumentace v aplikaci (`frontend/src/features/docs/`)

Obsah je uložen jako JSON soubory s českou a anglickou verzí pro každou část. V aplikaci se zobrazuje pomocí společného modelu a vykreslovače.

```text
frontend/src/features/docs/
├── README.md              # Struktura obsahu a pravidla pro jeho rozšíření
├── documentation-model.ts # Typy a validace dokumentů
├── DocumentationPage.tsx  # Společné zobrazení a navigace
├── c01/                   # C01
├── c02/                   # C02
├── c03a/                  # C03, část A
├── c03b/                  # C03, část B
└── c05/                   # C05
```

V každé složce části jsou soubory `cs.json` a `en.json`. Podrobný popis datového formátu a přidání nové části je v [`frontend/src/features/docs/README.md`](frontend/src/features/docs/README.md). Dokumentace C05 přebírá vybrané informace z projektových podkladů v `docs/`; při jejich změně je potřeba upravit také českou a anglickou kopii.
