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

**Doplnění po hodnocení R1:** OP-01 specifikuje povinný `consultationMode` a požaduje, aby zvolený režim podporoval daný slot; současně stanoví nejméně tříhodinový předstih při vytvoření rezervace. OP-02 nezobrazuje sloty s kratším předstihem. API dostupnosti používá stejnou hranici jako `ReservationService.create()`; přesně tři hodiny před začátkem jsou přípustné.

**Doplnění po hodnocení R4/R5:** Vytvoření rezervace nyní odvozuje studenta z `AuthenticatedUser`; `ReservationAuthorizationTests` ověřuje, že ID v těle požadavku nemůže změnit vlastníka rezervace. `ReservationCreationPersistenceTests` prošel proti PostgreSQL a pokrývá obsazený termín (409), překryv (409) a povolené sousední intervaly z obou stran. Dne 2026-10-26 prošla celá backendová sada: 31 testů, 0 selhání, 0 chyb.

**Doplnění po hodnocení A2/A4 a C04:** Zrušení slotu s aktivní rezervací už nemění lifecycle v `ConsultationSlotService`. Oba endpointy slotu předávají ověřeného aktéra do `ReservationService`, který kontroluje vlastníka a jednotně zapisuje stav, historii a oznámení v jedné transakci. Quality concern, criterion, measurement, hranice testů a decision jsou výslovně označené v existující části C03B L2. Dne 26. 10. 2026 prošlo všech 14 testů `ReservationAuthorizationTests`, včetně regresí podvrženého aktéra a oprávněného zrušení slotu s aktivní rezervací.

**Zbývající předpoklad / neznámá:** Zamítnutí rezervace a automatické vypršení čekající žádosti nejsou v této verzi implementované. Tým také před odevzdáním doplní finální datum, jména schvalujících osob a případný tag release.

**Architektonické drivery přenesené do C03:** Transakční ochrana exkluzivity termínu, konzistentní stavový model rezervace a auditní historie všech změn stavu.

**Commit / tag aplikace:** Dokumentace C02 byla vytvořena v commitu `3afbab3`; tag `v0.2-c02` (`963b660`) označuje historický snapshot C02. Integrovaná baseline společná pro aktuální dokumentaci, kód a testy při hodnocení: `main@2b1e404` (`Update readme`).

## C03 — Oprava identity při schválení a rušení (2026-10-08)

**Baseline:** v0.2; OP-05/REQ-05, související OP-04/REQ-04 a BR-03.

**Původní verze:** commit `45bf7bd7fd9c4a9f284a7e8d5a5fd9bf125017b8`. Část A3/A9 v `architecture-and-decisions.md` zaznamenává možnost podstrčit ID vlastníka při schválení i rušení. Část A zůstává historickou evidencí.

**Co jsme opravili:** Controller předává identitu z ověřeného přihlášení. Služba rezervací podle ní ověřuje aktivní roli a vlastnictví a vybírá aktéra pro historii. Nový `ReservationTransitionRequest` obsahuje pouze poznámku; starší `actorUserId` se ignoruje. Frontend přestal ID aktéra pro schvalování a rušení rezervace odesílat.

**Rozhodnutí a delta:** ADR-01 a tabulka AS-IS → TO-BE v `architecture-and-decisions.md`.

### Ověření opravy

`ReservationAuthorizationTests` obsahuje 10 automatických testů přes MockMvc, skutečný bezpečnostní filtr, controller a službu rezervací. Ověření tokenu, načítání uživatelů, repository a oznámení jsou nahrazené testovacími objekty. Jde o regresní ověření API a rozhodování, nikoliv o nové end-to-end ověření ukládání do PostgreSQL nebo souběhu.

| Ověření                                                | Výsledek                                                |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Cizí pedagog podstrčí ID vlastníka při schválení       | 403; stav beze změny, žádný zápis historie ani oznámení |
| Cizí pedagog podstrčí ID vlastníka při rušení          | 403; bez změn                                           |
| Cizí student podstrčí ID studenta rezervace při rušení | 403; bez změn                                           |
| Student podstrčí ID pedagoga při schválení             | 403; bez změn                                           |
| Vlastník schválí PENDING bez ID v těle                 | 200; CONFIRMED, vytvoření historie a oznámení           |
| Opakované schválení CONFIRMED                          | 409; bez další historie a oznámení                      |
| Schválení CANCELLED                                    | 409; bez změny stavu, historie a oznámení               |
| Student zruší vlastní rezervaci                        | 200; CANCELLED a vytvoření historie                     |
| Pedagog zruší rezervaci vlastního termínu              | 200; CANCELLED a vytvoření historie                     |
| Schválení bez přihlášení                               | 4xx; požadavek se nedostane k načtení rezervace         |

**Opakování:** v `backend` spustit `mvn -Dtest=ReservationAuthorizationTests test`. Výsledek: 10 testů, 0 chyb. `mvn package` prošel se všemi 11 testy, včetně původního spuštění aplikačního kontextu s místní PostgreSQL. `npm run typecheck` ve frontendu prošel.

**Doklad:** `backend/target/surefire-reports/consultation_reservation_backend.ReservationAuthorizationTests.txt` (generuje se při spuštění testů).

**Zbývající rozsah:** Ostatní endpointy s klientskými ID nebyly touto opravou zabezpečené ani auditované. Zbývající diagramy, cross-view kontrola a samostatná kontrola architektonického pravidla C03 nejsou tímto záznamem prohlášeny za dokončené.

**Spuštění opravené verze:** `docker compose up -d --build backend frontend` úspěšně sestavilo a restartovalo obě části aplikace. Backend dokončil start s PostgreSQL; frontend odpověděl HTTP 200.

**Commit / tag integrované baseline:** `main@2b1e404` (`Update readme`) obsahuje dokumentaci, kód a testy C03; historický stav před opravou identity je `45bf7bd7fd9c4a9f284a7e8d5a5fd9bf125017b8`. Nový commit/tag opravy identity zatím nebyl vytvořen.

## Evidence C03B: přijatá architektura → běžící implementace

**Baseline:** v0.2 a AS-IS scénář schválení rezervace z C03A.

**Přijaté rozhodnutí:** `ReservationService` je transakční owner změn lifecycle rezervace. V jedné Spring transakci koordinuje změnu `Reservation`, zápis `ReservationHistory` a vytvoření interní `Notification`; PostgreSQL zůstává poslední autoritou pro exkluzivitu aktivní rezervace.

**Porovnané alternativy:** Orchestrace v controlleru/frontendu by rozptýlila pravidla a transakční hranici. Databázové procedury a triggery by ochránily data, ale přesunuly by workflow mimo čitelnou aplikační vrstvu. Pro současný monolit React + Spring Boot + PostgreSQL byla přijata služba aplikace.

**Ověřená architektonická pravidla:** Controller pouze deleguje na službu; `Reservation` nemá veřejný setter stavu; přechody `PENDING → CONFIRMED` a `PENDING/CONFIRMED → CANCELLED` se rozhodují v `ReservationService`; databázový index `one_active_reservation_per_slot` chrání souběžné vytvoření aktivní rezervace.

**Aktuální kontrola:** Frontend prošel `npm run lint`, `npm run typecheck` a `npm run build`. Backendové `mvnw.cmd test` prošlo bez chyb (2 testy, 0 failures, 0 errors).

**Zbývající riziko / delta CHANGE:** Autentizace vytvoří `AuthenticatedUser` v `SecurityContextu`, ale approve/cancel stále přijímají `actorUserId` z těla požadavku. Pro plnou shodu s architekturou musí budoucí změna odvozovat aktéra pouze z přihlášené relace.

**Artefakty:** Bilingvní C03A a C03B jsou dostupné v aplikaci v dokumentaci; zdroje každé části a jazyka jsou samostatně ve složkách `frontend/src/features/docs/c03a/` a `frontend/src/features/docs/c03b/`. Orientační materiály jsou v `docs/c03-a/` a `docs/c03-b/`.

**Commit / tag integrované baseline:** `main@2b1e404` (`Update readme`) obsahuje dokumentaci, kód a testy C03B. Samostatný tag C03B nebyl vytvořen.

## C05 DD Verification Evidence

**Revize:** 2026-10-19. **Jednotka:** schvalování rezervace, OP-05. [Návrh C05](architecture-and-decisions.md#c05-detailed-design) stanovuje požadované chování; tato část uvádí, jak bylo ověřeno a co ještě zbývá.

Návrh jsme porovnali se zadáním C05, požadavky C02 a aktuálními zdrojovými soubory. Zpřesnili jsme rozdělení odpovědností: `ReservationService` rozhoduje o schválení, `UserService` pouze načítá uživatele. Při navazující implementaci jsme přidali ReservationApprovalPersistenceTests se třemi integračními případy. Produkční logika nevyžadovala další změnu; testy potvrdily stávající transakční chování.

### 1. Testy odvozené z návrhu

Všech 12 nových případů je v [ReservationApprovalDesignTests](../backend/src/test/java/consultation_reservation_backend/ReservationApprovalDesignTests.java). Testovaná služba a doménové objekty jsou skutečné; repository, UserService a NotificationService jsou mocky. Žádný Spring kontext ani HTTP v této sadě neběží.

| DD element / decision      | What must hold?                                                                              | Test level                                | Test case                                           |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| D1: původ identity         | Chybějící aktér dostane 401 i pro neexistující ID; žádné čtení dat                           | Unit                                      | missingActorIsRejectedBeforeReadingReservation      |
| D1: aktivní role           | Student dostane 403 před načtením rezervace                                                  | Unit                                      | studentIsRejectedBeforeReadingReservation           |
| D2: vstupní ID             | Null ID je 400, bez čtení a zápisu                                                           | Unit                                      | missingIdIsRejectedBeforeReadingReservation         |
| D2: vstupní request        | Null tělo je 400, bez čtení a zápisu                                                         | Unit                                      | missingRequestIsRejectedBeforeReadingReservation    |
| D2: repository contract    | Optional.empty je 404, nenásleduje načtení aktéra ani zápis                                  | Unit                                      | missingReservationReturnsNotFoundWithoutWrites      |
| D3: priorita vlastnictví   | Cizí pedagog dostane 403 i pro CONFIRMED                                                     | Unit                                      | foreignTeacherCannotApproveEvenWhenStateIsInvalid   |
| D3: opakování              | CONFIRMED nelze schválit znovu; čas a stav se nemění                                         | Unit                                      | ownerCannotApproveConfirmedReservationAgain         |
| D3: zakázaný přechod       | CANCELLED nelze schválit; žádné zápisy                                                       | Unit                                      | ownerCannotApproveCancelledReservation              |
| D4–D5: úspěch a spolupráce | CONFIRMED, čas, správný aktér a přechod historie, oznámení správnému studentovi právě jednou | Unit (služba + entity, mockované hranice) | ownerApprovesWithCorrectAuditAndStudentNotification |
| Kontrakt poznámky          | Schválení dovoluje note=null                                                                 | Unit                                      | optionalNoteMayBeNull                               |
| D6: chyba historie         | Stejná výjimka opustí službu; oznámení nevzniká                                              | Unit                                      | historyFailurePropagatesAndPreventsNotification     |
| D6: chyba oznámení         | Výjimka se propaguje; služba nevrátí úspěšnou response                                       | Unit                                      | notificationFailurePropagatesWithoutSuccessResponse |

**Zdůvodnění úrovně, případ 1:** `missingActorIsRejectedBeforeReadingReservation` je unit test veřejného kontraktu služby. Záměr je chránit i jiné vstupy než controller; pouze HTTP test s filtrem by pořadí kontrol uvnitř služby neověřil. Mock repository umožní prokázat, že žádné čtení nenastalo.

**Zdůvodnění úrovně, případ 2:** `ownerApprovesWithCorrectAuditAndStudentNotification` je unit test spolupráce služby s mockovanými hranicemi. Ověřuje vlastnictví rozhodnutí, přechod entity a skutečný obsah vytvořené historie. DB není potřebná pro toto rozhodnutí; test však neprokazuje commit transakce. Privátní auditní data jsou kontrolována přes ReflectionTestUtils, aby kvůli testu nevznikaly nové produkční gettery.

**Zdůvodnění úrovně, případ 3:** `notificationFailurePropagatesWithoutSuccessResponse` ověřuje propagaci chyby bez Spring proxy. Pro důkaz fyzického rollbacku by byl nutný integrační test s PostgreSQL; výsledek tohoto unit testu není takovým důkazem.

### 2. Skutečně provedené ověření

Dne 2026-10-19 jsme z kořene projektu spustili celou sadu po čistém sestavení:

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 bash backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress clean test
```

| Sada                                           | Rozsah                                                         | Výsledek                                                      |
| ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| ReservationApprovalDesignTests                 | Pravidla služby a spolupráce s nahrazenými závislostmi         | 12 testů prošlo                                               |
| ReservationAuthorizationTests                  | MockMvc, bezpečnostní filtr, controller a služba               | 10 testů prošlo                                               |
| ReservationApprovalPersistenceTests            | Spring transakce a skutečná PostgreSQL: commit a dva rollbacky | 3 testy prošly                                                |
| ConsultationReservationBackendApplicationTests | Start aplikačního kontextu                                     | 1 test prošel                                                 |
| Celkem                                         | Celá backendová sada                                           | **26 testů, 0 selhání, 0 chyb, 0 vynechaných; BUILD SUCCESS** |

Běh skončil 2026-10-19 v 18:25:54 +02:00 a trval 13,235 s. Samostatné spuštění tří nových testů také prošlo. Spuštění vyžaduje Java 21 a lokální PostgreSQL na localhost:5432 s výchozím nastavením projektu. Omezené prostředí blokovalo databázové spojení; úspěšné běhy proběhly po povolení přístupu mimo něj.

Integrační sada vytváří náhodně pojmenované schéma c05_test_…, aplikuje skutečné Flyway migrace a po dokončení schéma odstraní. Výchozí data testu jsou commitnutá před voláním služby; testy samy neběží v automaticky vracené testovací transakci. Kontrola výsledku používá nové SQL čtení v nové transakci.

Technická chyba je řízeně vyvolaná testovacím spy objektem po flush zápisů do skutečné databáze. Test historie vynutí zápis změněné rezervace a historie; test oznámení provede skutečnou metodu create a vynutí všechny tři zápisy. Následně vyvolají RuntimeException a kontrolují původní PENDING, null confirmedAt a původní záznamy historie i oznámení. Pozitivní test ověřuje úspěšný commit a správného aktéra/příjemce. Nejde o simulaci výpadku síťového spojení ani o test souběhu.

Doklady: backend/target/surefire-reports/ pro čtyři uvedené třídy. Reporty se generují při běhu a nejsou verzované. Dřívější výsledek 22 testů byl cílenou kontrolou bez databázových testů; uvedených 26 je aktuální úplný běh.

### 3. Porovnání návrhu s implementací a řešení rozdílů

| Rozhodnutí z DD                                                 | Implementováno?           | Doklad                                                                                     | Rozhodnutí / další akce                                               |
| --------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Identita a role se kontrolují před načtením rezervace           | YES                       | ReservationService.approve; missingActor…, student…                                        | Ponechat existující úpravu; aktuální testy prošly.                    |
| Chybějící ID nebo request znamená 400                           | YES                       | approve; missingId…, missingRequest…                                                       | Ponechat explicitní kontrolu vstupu.                                  |
| Schválit smí vlastník a pouze PENDING                           | YES                       | approve; foreignTeacher…, ownerCannotApprove…                                              | Ponechat; odmítnutí nemění stav a nevytváří historii ani oznámení.    |
| Reservation vlastní status a confirmedAt                        | YES                       | Reservation.confirm; ownerApproves…                                                        | Ponechat; služba kontroluje podmínky před voláním confirm.            |
| Služba koordinuje historii a oznámení a předává technické chyby | YES                       | ownerApproves…; historyFailure…; notificationFailure…                                      | Ponechat; testy ověřují obsah a volání spolupracujících prvků.        |
| Všechny změny se uloží společně, nebo žádná                     | YES — pro ověřené scénáře | ReservationApprovalPersistenceTests: úspěšný commit a rollback při chybě historie/oznámení | Ponechat produkční transakci; doplněné tři integrační testy prošly.   |
| O schválení rozhoduje služba rezervací                          | YES                       | approve provádí kontroly; UserService.get načítá aktéra                                    | Zpřesněn text DD, který dříve uváděl společného vlastníka rozhodnutí. |

Návrh zachovává pravidla v jedné službě, protože nyní existuje jeden způsob schvalování. Samostatná policy třída není pro tento rozsah potřebná. Diagram proto ukazuje existující rozhraní repository a závislosti služby.

### 4. Integrační ověření a zbývající rizika

- Souběžná schválení nejsou serializována zámkem ani verzí entity; mohou vytvořit duplicitní historii/oznámení. Sekvenční 409 test není testem souběhu.
- Rollback je nyní ověřen proti PostgreSQL pro řízené RuntimeException po zápisech. Výpadek databázového spojení ani jiné druhy selhání tento test nepokrývá.
- `Reservation.confirm()` se spoléhá na kontrolu služby. Nový volající musí respektovat stejný kontrakt.

Následující případy v ReservationApprovalPersistenceTests **prošly**:

| DD element / decision                     | What must hold?                                                                            | Test level                             | Test case (PASS)                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| D4–D6: úspěšné společné uložení           | CONFIRMED, čas a právě jeden nový záznam historie i oznámení se správným aktérem/příjemcem | Integration: Spring proxy + PostgreSQL | successfulApprovalCommitsStateHistoryAndNotification |
| D6: atomická transakce při chybě oznámení | Po selhání zůstane v DB PENDING, confirmedAt=null a původní počty historie/oznámení        | Integration: Spring proxy + PostgreSQL | notificationFailureRollsBackApprovalAndHistory       |
| D6: atomická transakce při chybě historie | Po selhání se potvrzení neuloží a nevznikne oznámení                                       | Integration: Spring proxy + PostgreSQL | historyFailureRollsBackApproval                      |

**Proč integrační úroveň:** rozhodnutí o společné transakci realizuje Spring a databáze. Mocky neumějí prokázat commit ani rollback. Kontrola proto proběhne novým načtením z databáze po skončení volané transakce; podrobný postup je v C05 DD. Tyto případy doplňují existující unit testy propagace výjimek.

### 5. Kontrola úplnosti podle zadání

| Požadovaný výstup                                          | Stav                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Jedna jednotka, vazba na požadavky a scénář                | Hotovo v C05 DD, část 1                                                           |
| 3–7 odpovědností a jejich vlastníci                        | Hotovo, části 2–3                                                                 |
| Rozhraní a kontrakty                                       | Hotovo, části 4 a 6–7                                                             |
| Strukturální UML a detailní sekvence                       | Zahrnuty, části 5 a 8                                                             |
| Významné operace, algoritmus a stavy                       | Hotovo, části 6–7                                                                 |
| Nejméně 5 odvozených testů, zdůvodnění alespoň dvou úrovní | Hotovo, 12 případů v části 1 této evidence                                        |
| Spuštění unit/component testů                              | Hotovo, 26 testů prošlo v aktuální revizi                                         |
| Porovnání návrhu a implementace                            | Hotovo; zahrnuje databázový commit a rollback                                     |
| Doklad atomického uložení při chybě                        | Hotovo; oba rollback testy proti PostgreSQL prošly                                |
| C05 snapshot tag                                           | `v0.3-c05` (`87a4c5a`, historický snapshot); integrovaná baseline: `main@2b1e404` |

### 6. Commit/tag a další postup

**Commit / tag:** `v0.3-c05` (`87a4c5a`) identifies the historical C05 design/evidence snapshot. The integrated baseline shared by C05 documentation, code and tests at assessment time is `main@2b1e404` (`Update readme`).

Návrh, implementace vybraného scénáře i její ověření jsou pro uvedený rozsah hotové. Souběžné schvalování zůstává přiznaným návrhovým rizikem a vyžaduje samostatné rozhodnutí.

## C07 — risk review and verification (2026-11-02)

**Tested source revision:** commit `31a22ad` on `fix/docs-c07&corrections`, based on `main@3c25e78`. C07 evidence and review updates were pushed later in commit `50a2909`; those documentation changes do not change the tested application code. The C07 review added a database row lock and a regression test after reproducing concurrent approval processing.

### Verification results

| Check                                    | Result                                               | Evidence / scope                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend regression and persistence suite | **37 tests passed; 0 failures, 0 errors, 0 skipped** | `cd backend; .\mvnw.cmd test`; PostgreSQL 17.11, Flyway migrations, isolated test schemas; reports in `backend/target/surefire-reports/`.                                                                                                                                                                                                                                                                            |
| Concurrent approval regression           | **PASS**                                             | `ReservationApprovalPersistenceTests.concurrentApprovalsCommitOnlyOneLifecycleTransition`: one transaction commits; the competing approval waits and returns HTTP 409; exactly one additional history row and notification.                                                                                                                                                                                          |
| Race reproduction before the fix         | **FAIL as expected**                                 | The new test observed the second request reach notification creation before the first transaction committed. This demonstrated that the prior read/check/write sequence was not serialized.                                                                                                                                                                                                                          |
| Frontend unit tests                      | **10 tests passed across 4 files**                   | `cd frontend; npm test`.                                                                                                                                                                                                                                                                                                                                                                                             |
| Frontend lint                            | **Exit 0; 0 errors, 1 warning**                      | `npm run lint`; existing Fast Refresh warning in `src/components/HistoryPeriodFilter.tsx:34`.                                                                                                                                                                                                                                                                                                                        |
| Frontend typecheck and production build  | **PASS**                                             | `npm run typecheck`; `npm run build`.                                                                                                                                                                                                                                                                                                                                                                                |
| Docker build and application smoke       | **PASS**                                             | Isolated source copy without `.git`, `node_modules`, `target` or `dist`; fresh Compose project and database volume (ports 55434/18083/15177); PostgreSQL 17.11 became healthy, Flyway applied 14 migrations to v14, backend started, `NOV0001` login succeeded, authenticated `GET /api/slots` returned 12 seeded slots, frontend returned HTTP 200. Raw logs are in `docs/evidence/C07_clean_checkout_2026-11-02/`. |

### Code review and actual residual assessment

| Risk                                 | Code/evidence checked                                                                                                                                                                                    | C07 treatment and actual residual                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 concurrent lifecycle transition | `ReservationService.approve/cancel`; `ReservationRepository`; PostgreSQL integration test above.                                                                                                         | `findByIdForUpdate` and the active-reservation lookup now use `PESSIMISTIC_WRITE`; simultaneous approval test passes. **Actual: L=1, I=2, LOW (2).** Database outage and untested deployment-level contention remain outside this test.                                                                                                                    |
| R-02 stale verification evidence     | Full backend and frontend results above; corrected SHA256 manifest and the current `31a22ad` revision are recorded with the evidence.                                                                    | Evidence is tied to one current revision and the manifest was rechecked against all stored files. One non-blocking frontend lint warning remains. **Actual: L=1, I=2, LOW (2).**                                                                                                                                                                           |
| R-03 owners and capacity             | Commit authorship, the C07 ownership table and team confirmation on 2 Nov 2026.                                                                                                                          | Kseniia Blokhina owns backend/concurrency work with Fatima Tangatarova as backup; Fatima owns frontend/peer evidence with Kseniia as backup. Due date for the final review record: 2 Nov 2026. **Actual: L=1, I=2, LOW (2).**                                                                                                                              |
| R-04 clean demonstration startup     | Original isolated clean-source-copy Docker run in `docs/evidence/C07_clean_checkout_2026-11-02/`; Fatima's separate Compose build/start and review in `docs/evidence/C07_independent_check_2026-11-02/`. | Fatima completed the independent startup/evidence review on 2 Nov 2026; the new volume was healthy, 14 migrations reached v14, and backend/frontend started. The second run did not repeat the authenticated API request; the original run records login, 12 slots and HTTP 200. No startup/configuration defect was found. **Actual: L=1, I=2, LOW (2).** |

R-02–R-04 are LOW after the evidence refresh, explicit ownership plan, and Fatima's completed review. The separate browser E2E availability flow remains a quality improvement, not a release-blocking incident; a later code change requires rerunning the suite and refreshing the manifest.

**Overall C07 project RAG: GREEN / ON TRACK.** The recorded backend/frontend checks, clean startup evidence, ownership plan and independent review are complete; all four residual risks are LOW. The browser E2E availability flow and one non-blocking lint warning remain follow-ups, with no documented release blocker.

## C08 Verification Evidence — automatické storno neschválených rezervací

### 1. Identifikace výchozího stavu

| Položka         | Hodnota                                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before baseline | `main@99210f0158993b2b8a81f9b327f63e5736556c62` (`Docs/docs7 (#63)`), přímý rodič implementačního commitu `a5cf9d9`                                                                                 |
| Stav schématu   | Flyway V14; po změně přibyla V15, která povoluje null `actor_user_id` pro systémový auditní záznam                                                                                                  |
| Runtime         | Java 21 / Spring Boot 4.1.1 / Maven wrapper; frontend React + TypeScript + Vite; PostgreSQL 17 přes Docker Compose                                                                                  |
| Test setup      | Persistence testy vytváří izolované náhodné PostgreSQL schéma, použijí Flyway a SQL čtení committed stavu; frontend Vitest + Testing Library. Přihlašovací údaje se do tohoto dokumentu nekopírují. |
| After reference | `feat/auto-cancel-unapproved-reservations@a5cf9d99bfa860a31a6cccfc870edc8e4bc6d4c4`, PR #67                                                                                                         |

Kontrola historie potvrdila, že backendový strom `31a22ad` je shodný s backendem `main@99210f0`. C07 evidence proto dokládá běh backendové baseline: 37/37 testů 2. 11. 2026. Toto ověření pokrývá existující lifecycle, nikoli nový C08 cutoff scénář. Frontendový strom se mezi těmito commity liší; C07 frontend výsledky se nepřenášejí jako důkaz stejného souborového stavu.

### 2. Test cases dosavadního chování

Očekávání v této části vycházejí z pravidel a kódu `main@99210f0`, nikoli z nového chování po C08.

#### TC-C08-01 — vlastník schválí platnou čekající žádost

**Basis:** schválení vlastníkem slotu mění `PENDING` na `CONFIRMED`; úspěšná změna zapisuje historii a oznámení studentovi. **Data:** izolované schéma; přihlášený vlastník termínu, student, budoucí slot a rezervace `PENDING`. Existující persistence test používá slot `2030-01-07T10:00+01:00`.

| #   | Akce                                                                            | Expected před během                                                                      | Actual / evidence po běhu                                                                               |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Připravit a commitnout uživatele, slot, PENDING rezervaci a počáteční historii. | Jeden řádek rezervace ve stavu `PENDING`; počáteční historie existuje.                   | PASS v `ReservationApprovalPersistenceTests`; baseline testovaný na backendově shodné revizi `31a22ad`. |
| 2   | Zavolat approve jako pedagoga, který vlastní slot.                              | Úspěšný response; vlastník a stav jsou platné.                                           | PASS; `successfulApprovalCommitsStateHistoryAndNotification`.                                           |
| 3   | Znovu načíst committed řádek a počty historie/oznámení.                         | `CONFIRMED`, `confirmedAt` nastaveno, právě jeden záznam historie a oznámení studentovi. | PASS; C05 persistence evidence v této dokumentaci a C07 backend run 37/37.                              |
| 4   | Resetovat schéma pro opakování.                                                 | Testovací příprava je izolovaná a opakovatelná.                                          | PASS; persistence testy vytvářejí vlastní schéma a po běhu jej odstraňují.                              |

**Verdikt:** PASS pro běžnou schvalovací cestu na původním backendu. Test není důkazem chování těsně u tříhodinové hranice.

#### TC-C08-02 — pozdní schválení čekající žádosti na původní baseline

**Basis:** původní `ReservationService.approve()` ověřuje vlastníka a `PENDING`, ale nemá časovou kontrolu. **Data:** izolovaná `PENDING` rezervace s `startsAt = now + 2 h 59 min`, vlastník přihlášen jako pedagog.

| #   | Akce                                                                | Expected před během podle původní implementace                                             | Actual / evidence po běhu                                                          |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | Připravit a commitnout PENDING rezervaci se začátkem za 2 h 59 min. | PENDING blokuje slot; stav je nezávisle ověřen v DB.                                       | NOT RUN proti `main@99210f0`.                                                      |
| 2   | Zavolat approve jako vlastník.                                      | Původní kód nemá časový guard; podle skutečně vykonané cesty by schválení mělo pokračovat. | NOT RUN; zdrojový kód potvrzuje absenci guardu, ale to není náhrada za actual běh. |
| 3   | Znovu načíst stav a změny historie/oznámení.                        | Očekávaný výsledek baseline je `CONFIRMED`, jedna nová historie a oznámení.                | NOT RUN; neoznačovat jako PASS.                                                    |
| 4   | Resetovat izolovaná data a opakovat.                                | Stejný reprodukovatelný výsledek.                                                          | NOT RUN.                                                                           |

**Stav:** BLOCKED / NOT RUN pro samostatný C08 boundary test na before baseline. Při této dokumentační práci se neprováděl nový běh nad databází; lokální Compose služby byly na výslovnou žádost ponechány zastavené. Opakovatelný další krok: připravit izolovanou DB, checkout `99210f0`, spustit test nad předzměnovým `ReservationService` a uložit SQL/API výstup. Kódová inspekce není vykazována jako vykonání testu.

### 3. Ověření implementace `a5cf9d9`

| Ověření                               | Rozsah                                                                                                                                                          | Actual / omezení                                                                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ReservationExpiryPersistenceTests`   | 6 PostgreSQL/Spring testů: přesná hranice a idempotence, okamžik před hranicí, approve na hranici, ruční storno na hranici, selhání historie, selhání oznámení. | PASS všech 6 v plném běhu implementační pracovní kopie 10. 11. 2026. Čte se committed SQL stav; testovací hodiny jsou fixní.                                                                                                                           |
| `ReservationApprovalPersistenceTests` | Úspěšný commit a rollback při chybě historie/oznámení.                                                                                                          | PASS 4 testů v plném backendovém běhu.                                                                                                                                                                                                                 |
| `ReservationAuthorizationTests`       | MockMvc API, autorizace, pozdní ruční storno a přímý pokus o vytvoření rezervace méně než 3 h před slotem.                                                      | PASS 17/17 v cíleném běhu 10. 11. 2026; repository a uživatelé jsou v této sadě mockované, nejde o persistence důkaz.                                                                                                                                  |
| Kompletní backend                     | Sady aplikačního kontextu, approval design/persistence, autorizace, cancellation persistence, creation persistence a expiry persistence.                        | PASS 44/44 před přidáním posledního přímého API testu vytvoření pod 3 h. Poté cílená autorizace 17/17 prošla. **Netvrdíme, že kompletní sada 45/45 byla znovu spuštěna na finálním commitu.**                                                          |
| Frontend                              | Vitest / Testing Library, včetně studentské a pedagogické přesné UI hranice.                                                                                    | PASS 12/12 ve 4 souborech.                                                                                                                                                                                                                             |
| Frontend typecheck                    | `npm run typecheck`                                                                                                                                             | PASS.                                                                                                                                                                                                                                                  |
| Frontend lint                         | `npm run lint`                                                                                                                                                  | Exit 0; jedno existující Fast Refresh upozornění v `src/components/HistoryPeriodFilter.tsx:34`, mimo změněné soubory.                                                                                                                                  |
| Java format check                     | `mvnw.cmd fmt:check`                                                                                                                                            | FAIL kvůli čtyřem nesouvisejícím, před změnou nevyhovujícím souborům: `AuthController.java`, `ReservationResponse.java`, `ReservationCancellationPersistenceTests.java`, `ReservationApprovalPersistenceTests.java`. Dokumentační větev je neupravuje. |

Plný backendový běh skončil úspěšně po opravě očekávaného času v oznámení. Tato evidence nesmí být sloučena s předzměnovým TC-C08-02: post-change PASS neprokazuje chování staré baseline.

### 4. Pokryté acceptance oracles

| Oracle                 | Výsledek po změně                                                                                      | Konkrétní důkaz                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startsAt > now + 3 h` | Rezervace zůstane PENDING a před hranicí ji vlastník může schválit.                                    | `doesNotExpireOrBlockApprovalBeforeTheThreeHourBoundary`.                                                                                                                                   |
| `startsAt = now + 3 h` | Scheduler ji stornuje; approve ji stornuje a vrátí 409; ruční cancel vrátí 409.                        | `expiresAtExactThreeHourBoundaryAndDoesNotDuplicateAuditOrNotification`, `approvalAtExactBoundaryIsRejectedAndCommitsAutomaticCancellation`, `manualCancellationAtExactBoundaryIsRejected`. |
| Automatický audit      | `CANCELLED`, důvod ve zrušení i historii, `actor_user_id = NULL`, původní `CREATED` zachován.          | SQL assertions v `ReservationExpiryPersistenceTests`; Flyway V15.                                                                                                                           |
| Oznámení               | Student dostane jedno uložené `RESERVATION_CANCELLED` s termínem, pedagogem a důvodem.                 | Ověření počtu a zprávy; opakovaný scheduler call nevytvoří duplicitu.                                                                                                                       |
| Atomická chyba         | Selhání historie nebo oznámení vrátí DB zpět na PENDING a nevytvoří částečný audit/notification.       | Dva rollback testy nad skutečnou PostgreSQL.                                                                                                                                                |
| UI a API               | V UI jsou approve/cancel disabled přesně na hranici; API ruční storno a create pod 3 h vrací konflikt. | Frontendové testy přesného cutoffu; `ReservationAuthorizationTests`.                                                                                                                        |

### 5. Známé limity / residual exposure

1. Scheduler má fixed delay default 1000 ms. Při běžícím backendu je tedy plánovaný přechod zpožděn nejvýše přibližně o interval plus dobu DB operace; přesný commit v konkrétní nanosekundě není garantován. Listing rezervací i approve provádí dodatečnou synchronní kontrolu.
2. Backendový výpadek přeruší scheduler; po restartu proběhne sweep, ale změna a oznámení budou opožděné. Není zaveden samostatný queue/monitoring lag.
3. Create cutoff přijímá přesnou hranici `now + 3 h`, ale expiry a approve považují hranici za uzavřenou. Rezervace vytvořená přesně na hranici proto může být ihned zrušena. Přesné rozhodnutí pro další změnu: sjednotit hranici vytvoření, dostupnosti a expirace, nebo formálně přijmout toto chování.
4. Integrační testy ověřují idempotentní opakované zpracování, nikoli souběh více scheduler instancí. Query používá pessimistic write lock; dedikovaný distribuovaný lock/race test není doložen.
5. Peer approval z PR #67 není z git historie ověřitelný. Záznam review doplnit z PR události; jméno recenzenta se nevymýšlí.

**C08 stav:** projektový CR, dopady, alternativy, decision a implementační evidence jsou zapsané. Dva test cases baseline jsou definované; TC-C08-01 má navázaný skutečný integrační důkaz na shodném backendovém stromu, TC-C08-02 zůstává NOT RUN/BLOCKED. Před formálním označením všech DoD bodů jako hotových doplnit tento boundary běh a peer-review záznam PR.

### 3. Porovnání návrhu s implementací a řešení rozdílů

| Rozhodnutí z DD                                                 | Implementováno?           | Doklad                                                                                     | Rozhodnutí / další akce                                               |
| --------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Identita a role se kontrolují před načtením rezervace           | YES                       | ReservationService.approve; missingActor…, student…                                        | Ponechat existující úpravu; aktuální testy prošly.                    |
| Chybějící ID nebo request znamená 400                           | YES                       | approve; missingId…, missingRequest…                                                       | Ponechat explicitní kontrolu vstupu.                                  |
| Schválit smí vlastník a pouze PENDING                           | YES                       | approve; foreignTeacher…, ownerCannotApprove…                                              | Ponechat; odmítnutí nemění stav a nevytváří historii ani oznámení.    |
| Reservation vlastní status a confirmedAt                        | YES                       | Reservation.confirm; ownerApproves…                                                        | Ponechat; služba kontroluje podmínky před voláním confirm.            |
| Služba koordinuje historii a oznámení a předává technické chyby | YES                       | ownerApproves…; historyFailure…; notificationFailure…                                      | Ponechat; testy ověřují obsah a volání spolupracujících prvků.        |
| Všechny změny se uloží společně, nebo žádná                     | YES — pro ověřené scénáře | ReservationApprovalPersistenceTests: úspěšný commit a rollback při chybě historie/oznámení | Ponechat produkční transakci; doplněné tři integrační testy prošly.   |
| O schválení rozhoduje služba rezervací                          | YES                       | approve provádí kontroly; UserService.get načítá aktéra                                    | Zpřesněn text DD, který dříve uváděl společného vlastníka rozhodnutí. |

Návrh zachovává pravidla v jedné službě, protože nyní existuje jeden způsob schvalování. Samostatná policy třída není pro tento rozsah potřebná. Diagram proto ukazuje existující rozhraní repository a závislosti služby.

### 4. Integrační ověření a zbývající rizika

- Souběžná schválení nejsou serializována zámkem ani verzí entity; mohou vytvořit duplicitní historii/oznámení. Sekvenční 409 test není testem souběhu.
- Rollback je nyní ověřen proti PostgreSQL pro řízené RuntimeException po zápisech. Výpadek databázového spojení ani jiné druhy selhání tento test nepokrývá.
- `Reservation.confirm()` se spoléhá na kontrolu služby. Nový volající musí respektovat stejný kontrakt.

Následující případy v ReservationApprovalPersistenceTests **prošly**:

| DD element / decision                     | What must hold?                                                                            | Test level                             | Test case (PASS)                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| D4–D6: úspěšné společné uložení           | CONFIRMED, čas a právě jeden nový záznam historie i oznámení se správným aktérem/příjemcem | Integration: Spring proxy + PostgreSQL | successfulApprovalCommitsStateHistoryAndNotification |
| D6: atomická transakce při chybě oznámení | Po selhání zůstane v DB PENDING, confirmedAt=null a původní počty historie/oznámení        | Integration: Spring proxy + PostgreSQL | notificationFailureRollsBackApprovalAndHistory       |
| D6: atomická transakce při chybě historie | Po selhání se potvrzení neuloží a nevznikne oznámení                                       | Integration: Spring proxy + PostgreSQL | historyFailureRollsBackApproval                      |

**Proč integrační úroveň:** rozhodnutí o společné transakci realizuje Spring a databáze. Mocky neumějí prokázat commit ani rollback. Kontrola proto proběhne novým načtením z databáze po skončení volané transakce; podrobný postup je v C05 DD. Tyto případy doplňují existující unit testy propagace výjimek.

### 5. Kontrola úplnosti podle zadání

| Požadovaný výstup                                          | Stav                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Jedna jednotka, vazba na požadavky a scénář                | Hotovo v C05 DD, část 1                                                           |
| 3–7 odpovědností a jejich vlastníci                        | Hotovo, části 2–3                                                                 |
| Rozhraní a kontrakty                                       | Hotovo, části 4 a 6–7                                                             |
| Strukturální UML a detailní sekvence                       | Zahrnuty, části 5 a 8                                                             |
| Významné operace, algoritmus a stavy                       | Hotovo, části 6–7                                                                 |
| Nejméně 5 odvozených testů, zdůvodnění alespoň dvou úrovní | Hotovo, 12 případů v části 1 této evidence                                        |
| Spuštění unit/component testů                              | Hotovo, 26 testů prošlo v aktuální revizi                                         |
| Porovnání návrhu a implementace                            | Hotovo; zahrnuje databázový commit a rollback                                     |
| Doklad atomického uložení při chybě                        | Hotovo; oba rollback testy proti PostgreSQL prošly                                |
| C05 snapshot tag                                           | `v0.3-c05` (`87a4c5a`, historický snapshot); integrovaná baseline: `main@2b1e404` |

### 6. Commit/tag a další postup

**Commit / tag:** `v0.3-c05` (`87a4c5a`) identifies the historical C05 design/evidence snapshot. The integrated baseline shared by C05 documentation, code and tests at assessment time is `main@2b1e404` (`Update readme`).

Návrh, implementace vybraného scénáře i její ověření jsou pro uvedený rozsah hotové. Souběžné schvalování zůstává přiznaným návrhovým rizikem a vyžaduje samostatné rozhodnutí.
