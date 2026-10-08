# Evidence and Evolution

## C01 Engineering Spike

**Question / unknown:** Ověřit, zda rezervační systém ukládá a následně načítá data ze skutečné PostgreSQL databáze.

**What we did:** Spustili jsme PostgreSQL, backend a frontend přes Docker Compose. Flyway při spuštění backendu provedl databázové migrace a vložil ukázková data. Ve frontendu jsme následně načetli dostupné konzultační termíny z backendového API a data jsme ověřili také v PostgreSQL databázi.

**Observed result:** PostgreSQL databáze byla úspěšně vytvořena, Flyway aplikoval migrace a ukázkové termíny se zobrazily ve frontendu. Backend tedy správně zapisuje a čte perzistentní data z databáze.

**Decision / what changes because of the result:** PostgreSQL, Flyway a Docker Compose ponecháváme jako standardní základ projektu pro lokální spuštění a správu databázového schématu. Další funkce rezervací budeme implementovat nad tímto ověřeným perzistentním úložištěm.

## Evidence C02: specifikace → běžící aplikace

**Přijatá baseline:** v0.1 obsahuje vytvoření rezervace, kontrolu dostupnosti, potvrzení pedagogem a zrušení rezervace. Baseline v0.2 doplňuje explicitní schvalovací krok: nová rezervace vzniká ve stavu `PENDING` a pedagog ji může změnit na `CONFIRMED`.

**Předvedené základní operace:** V běžící aplikaci a API jsou dostupné operace vytvoření rezervace, zobrazení volných termínů, schválení rezervace pedagogem a zrušení rezervace studentem nebo vlastníkem termínu.

**Skutečně provedené příklady ověření:** Aplikace byla spuštěna přes Docker Compose; databáze, backend i frontend běží a frontend odpovídá na `http://localhost:5173` stavem `200`. Flyway ověřil a aplikoval databázové migrace. Seedovaná data obsahují rezervaci `PENDING`, rezervaci `CONFIRMED` a odpovídající záznamy v `reservation_history`.

**Nalezený nesoulad a způsob vyřešení:** Při revizi bylo nutné sjednotit význam stavu `PENDING`. Je nyní explicitně blokující ve specifikaci, při vyhledávání dostupných termínů, v API i v databázovém unikátním indexu `one_active_reservation_per_slot`.

**Shrnutí dopadu změny:** Rezervace se po vytvoření nepotvrzuje automaticky. Čeká na rozhodnutí pedagoga ve stavu `PENDING`; schválení mění stav na `CONFIRMED` a oba aktivní stavy blokují termín proti další rezervaci.

**Zbývající předpoklad / neznámá:** Zamítnutí rezervace a automatické vypršení čekající žádosti nejsou v této verzi implementované. Tým také před odevzdáním doplní finální datum, jména schvalujících osob a případný tag release.

**Architektonické drivery přenesené do C03:** Transakční ochrana exkluzivity termínu, konzistentní stavový model rezervace a auditní historie všech změn stavu.

**Commit / tag aplikace:** Dokumentace C02 byla vytvořena v commitu `3afbab3`; baseline C02 je označena tagem `v0.2-c02`.

## C03 — Oprava identity při schválení a rušení (2026-10-08)

**Baseline:** v0.2; OP-05/REQ-05, související OP-04/REQ-04 a BR-03.

**Původní verze:** commit `45bf7bd7fd9c4a9f284a7e8d5a5fd9bf125017b8`. Část A3/A9 v `architecture-and-decisions.md` zaznamenává možnost podstrčit ID vlastníka při schválení i rušení. Část A zůstává historickou evidencí.

**Co jsme opravili:** Controller předává identitu z ověřeného přihlášení. Služba rezervací podle ní ověřuje aktivní roli a vlastnictví a vybírá aktéra pro historii. Nový `ReservationTransitionRequest` obsahuje pouze poznámku; starší `actorUserId` se ignoruje. Frontend přestal ID aktéra pro schvalování a rušení rezervace odesílat.

**Rozhodnutí a delta:** ADR-01 a tabulka AS-IS → TO-BE v `architecture-and-decisions.md`.

### Ověření opravy

`ReservationAuthorizationTests` obsahuje 10 automatických testů přes MockMvc, skutečný bezpečnostní filtr, controller a službu rezervací. Ověření tokenu, načítání uživatelů, repository a oznámení jsou nahrazené testovacími objekty. Jde o regresní ověření API a rozhodování, nikoliv o nové end-to-end ověření ukládání do PostgreSQL nebo souběhu.

| Ověření | Výsledek |
| --- | --- |
| Cizí pedagog podstrčí ID vlastníka při schválení | 403; stav beze změny, žádný zápis historie ani oznámení |
| Cizí pedagog podstrčí ID vlastníka při rušení | 403; bez změn |
| Cizí student podstrčí ID studenta rezervace při rušení | 403; bez změn |
| Student podstrčí ID pedagoga při schválení | 403; bez změn |
| Vlastník schválí PENDING bez ID v těle | 200; CONFIRMED, vytvoření historie a oznámení |
| Opakované schválení CONFIRMED | 409; bez další historie a oznámení |
| Schválení CANCELLED | 409; bez změny stavu, historie a oznámení |
| Student zruší vlastní rezervaci | 200; CANCELLED a vytvoření historie |
| Pedagog zruší rezervaci vlastního termínu | 200; CANCELLED a vytvoření historie |
| Schválení bez přihlášení | 4xx; požadavek se nedostane k načtení rezervace |

**Opakování:** v `backend` spustit `mvn -Dtest=ReservationAuthorizationTests test`. Výsledek: 10 testů, 0 chyb. `mvn package` prošel se všemi 11 testy, včetně původního spuštění aplikačního kontextu s místní PostgreSQL. `npm run typecheck` ve frontendu prošel.

**Doklad:** `backend/target/surefire-reports/consultation_reservation_backend.ReservationAuthorizationTests.txt` (generuje se při spuštění testů).

**Zbývající rozsah:** Ostatní endpointy s klientskými ID nebyly touto opravou zabezpečené ani auditované. Zbývající diagramy, cross-view kontrola a samostatná kontrola architektonického pravidla C03 nejsou tímto záznamem prohlášeny za dokončené.

**Spuštění opravené verze:** `docker compose up -d --build backend frontend` úspěšně sestavilo a restartovalo obě části aplikace. Backend dokončil start s PostgreSQL; frontend odpověděl HTTP 200.

**Commit opravy:** změny zatím v pracovní kopii, bez nového commitu/tagu.
