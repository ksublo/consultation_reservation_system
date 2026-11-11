# Rezervační systém konzultací

Webová aplikace pro rezervaci konzultačních termínů na univerzitě. Studenti si vybírají dostupné termíny a žádají o konzultaci; pedagogové termíny vytvářejí a žádosti schvalují.

## Technologie

| Část                 | Technologie                 | Umístění                                   |
| -------------------- | --------------------------- | ------------------------------------------ |
| Uživatelské rozhraní | React, Vite, TypeScript     | `frontend/`                                |
| Serverové rozhraní   | Java 21, Spring Boot, Maven | `backend/`                                 |
| Databáze             | PostgreSQL, Flyway          | `backend/src/main/resources/db/migration/` |

## Rychlé spuštění

Vyžaduje Docker Desktop:

```sh
docker compose up --build
```

| Služba      | Adresa                  |
| ----------- | ----------------------- |
| Aplikace    | <http://localhost:5173> |
| Backend API | <http://localhost:8080> |
| PostgreSQL  | `localhost:5432`        |

Služby zastavíte příkazem `docker compose down`. Podrobnosti jsou v [návodu k Dockeru](DOCKER.md).

## Vývoj

Frontend:

```sh
cd frontend
npm install
npm run dev
```

Další frontendové příkazy: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format` a `npm run format:check`.

Backend spusťte s nakonfigurovaným PostgreSQL připojením z `backend/`:

```sh
./mvnw spring-boot:run --spring.profiles.active=local
```

Ve Windows použijte `mvnw.cmd`. Formátování zajišťuje Google Java Format (`mvn fmt:format`, `mvn fmt:check`).

## Dokumentace

Projektové podklady a rozhodnutí jsou v `docs/`; aplikační dokumentace je zobrazena v obou jazycích v `frontend/src/features/docs/`.

| Dokument                                                                   | Obsah                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`docs/intent-and-change.md`](docs/intent-and-change.md)                   | Záměr projektu, uživatelé, pravidla a C08 change request     |
| [`docs/architecture-and-decisions.md`](docs/architecture-and-decisions.md) | Architektura, datový model a technická rozhodnutí včetně C08 |
| [`docs/evidence-and-evolution.md`](docs/evidence-and-evolution.md)         | Testovací evidence, výsledky etap a omezení                  |
| [`docs/deployment-development.md`](docs/deployment-development.md)         | Vývojové a nasazovací podklady                               |
| [`docs/diagrams/`](docs/diagrams/)                                         | Zdrojové a vykreslené diagramy                               |

Aplikační dokumentace používá české a anglické JSON soubory. Jednotlivé části jsou `c01`, `c02`, `c03a`, `c03b`, `c05`, `c07` a `c08`; C06 se načítá z Markdownu. Renderer a obsahový model jsou v `frontend/src/features/docs/DocumentationPage.tsx` a `documentation-model.ts`. Struktura a postup rozšíření jsou popsány v [`frontend/src/features/docs/README.md`](frontend/src/features/docs/README.md).

C08 dokumentuje automatické storno neschválených rezervací podle implementačního commitu `a5cf9d9` a [PR #67](https://github.com/ksublo/consultation_reservation_system/pull/67). Projektové dokumenty i česká a anglická aplikační verze zachovávají rozdíl mezi skutečně spuštěnými testy, neprovedeným baseline testem a neověřeným PR review.
