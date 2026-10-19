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

## Evidence C03B: přijatá architektura → běžící implementace

**Baseline:** v0.2 a AS-IS scénář schválení rezervace z C03A.

**Přijaté rozhodnutí:** `ReservationService` je transakční owner změn lifecycle rezervace. V jedné Spring transakci koordinuje změnu `Reservation`, zápis `ReservationHistory` a vytvoření interní `Notification`; PostgreSQL zůstává poslední autoritou pro exkluzivitu aktivní rezervace.

**Porovnané alternativy:** Orchestrace v controlleru/frontendu by rozptýlila pravidla a transakční hranici. Databázové procedury a triggery by ochránily data, ale přesunuly by workflow mimo čitelnou aplikační vrstvu. Pro současný monolit React + Spring Boot + PostgreSQL byla přijata služba aplikace.

**Ověřená architektonická pravidla:** Controller pouze deleguje na službu; `Reservation` nemá veřejný setter stavu; přechody `PENDING → CONFIRMED` a `PENDING/CONFIRMED → CANCELLED` se rozhodují v `ReservationService`; databázový index `one_active_reservation_per_slot` chrání souběžné vytvoření aktivní rezervace.

**Aktuální kontrola:** Frontend prošel `npm run lint`, `npm run typecheck` a `npm run build`. Backendové `mvnw.cmd test` prošlo bez chyb (2 testy, 0 failures, 0 errors).

**Zbývající riziko / delta CHANGE:** Autentizace vytvoří `AuthenticatedUser` v `SecurityContextu`, ale approve/cancel stále přijímají `actorUserId` z těla požadavku. Pro plnou shodu s architekturou musí budoucí změna odvozovat aktéra pouze z přihlášené relace.

**Artefakty:** Bilingvní C03A a C03B jsou dostupné v aplikaci v dokumentaci; zdroje každé části a jazyka jsou samostatně ve složkách `frontend/src/features/docs/c03a/` a `frontend/src/features/docs/c03b/`. Orientační materiály jsou v `docs/c03-a/` a `docs/c03-b/`.

**Commit / tag aplikace:** Doplní tým při odevzdání.

## C05 DD Verification Evidence

**Revize:** 2026-10-19. **Jednotka:** schvalování rezervace, OP-05. [Návrh C05](architecture-and-decisions.md#c05-detailed-design) stanovuje požadované chování; tato část uvádí, jak bylo ověřeno a co ještě zbývá.

Návrh jsme porovnali se zadáním C05, požadavky C02 a aktuálními zdrojovými soubory. Zpřesnili jsme rozdělení odpovědností: `ReservationService` rozhoduje o schválení, `UserService` pouze načítá uživatele. Při navazující implementaci jsme přidali ReservationApprovalPersistenceTests se třemi integračními případy. Produkční logika nevyžadovala další změnu; testy potvrdily stávající transakční chování.

### 1. Testy odvozené z návrhu


Všech 12 nových případů je v [ReservationApprovalDesignTests](../backend/src/test/java/consultation_reservation_backend/ReservationApprovalDesignTests.java). Testovaná služba a doménové objekty jsou skutečné; repository, UserService a NotificationService jsou mocky. Žádný Spring kontext ani HTTP v této sadě neběží.

| DD element / decision | What must hold? | Test level | Test case |
| --- | --- | --- | --- |
| D1: původ identity | Chybějící aktér dostane 401 i pro neexistující ID; žádné čtení dat | Unit | missingActorIsRejectedBeforeReadingReservation |
| D1: aktivní role | Student dostane 403 před načtením rezervace | Unit | studentIsRejectedBeforeReadingReservation |
| D2: vstupní ID | Null ID je 400, bez čtení a zápisu | Unit | missingIdIsRejectedBeforeReadingReservation |
| D2: vstupní request | Null tělo je 400, bez čtení a zápisu | Unit | missingRequestIsRejectedBeforeReadingReservation |
| D2: repository contract | Optional.empty je 404, nenásleduje načtení aktéra ani zápis | Unit | missingReservationReturnsNotFoundWithoutWrites |
| D3: priorita vlastnictví | Cizí pedagog dostane 403 i pro CONFIRMED | Unit | foreignTeacherCannotApproveEvenWhenStateIsInvalid |
| D3: opakování | CONFIRMED nelze schválit znovu; čas a stav se nemění | Unit | ownerCannotApproveConfirmedReservationAgain |
| D3: zakázaný přechod | CANCELLED nelze schválit; žádné zápisy | Unit | ownerCannotApproveCancelledReservation |
| D4–D5: úspěch a spolupráce | CONFIRMED, čas, správný aktér a přechod historie, oznámení správnému studentovi právě jednou | Unit (služba + entity, mockované hranice) | ownerApprovesWithCorrectAuditAndStudentNotification |
| Kontrakt poznámky | Schválení dovoluje note=null | Unit | optionalNoteMayBeNull |
| D6: chyba historie | Stejná výjimka opustí službu; oznámení nevzniká | Unit | historyFailurePropagatesAndPreventsNotification |
| D6: chyba oznámení | Výjimka se propaguje; služba nevrátí úspěšnou response | Unit | notificationFailurePropagatesWithoutSuccessResponse |

**Zdůvodnění úrovně, případ 1:** `missingActorIsRejectedBeforeReadingReservation` je unit test veřejného kontraktu služby. Záměr je chránit i jiné vstupy než controller; pouze HTTP test s filtrem by pořadí kontrol uvnitř služby neověřil. Mock repository umožní prokázat, že žádné čtení nenastalo.

**Zdůvodnění úrovně, případ 2:** `ownerApprovesWithCorrectAuditAndStudentNotification` je unit test spolupráce služby s mockovanými hranicemi. Ověřuje vlastnictví rozhodnutí, přechod entity a skutečný obsah vytvořené historie. DB není potřebná pro toto rozhodnutí; test však neprokazuje commit transakce. Privátní auditní data jsou kontrolována přes ReflectionTestUtils, aby kvůli testu nevznikaly nové produkční gettery.

**Zdůvodnění úrovně, případ 3:** `notificationFailurePropagatesWithoutSuccessResponse` ověřuje propagaci chyby bez Spring proxy. Pro důkaz fyzického rollbacku by byl nutný integrační test s PostgreSQL; výsledek tohoto unit testu není takovým důkazem.

### 2. Skutečně provedené ověření

Dne 2026-10-19 jsme z kořene projektu spustili celou sadu po čistém sestavení:

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 bash backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress clean test
```

| Sada | Rozsah | Výsledek |
| --- | --- | --- |
| ReservationApprovalDesignTests | Pravidla služby a spolupráce s nahrazenými závislostmi | 12 testů prošlo |
| ReservationAuthorizationTests | MockMvc, bezpečnostní filtr, controller a služba | 10 testů prošlo |
| ReservationApprovalPersistenceTests | Spring transakce a skutečná PostgreSQL: commit a dva rollbacky | 3 testy prošly |
| ConsultationReservationBackendApplicationTests | Start aplikačního kontextu | 1 test prošel |
| Celkem | Celá backendová sada | **26 testů, 0 selhání, 0 chyb, 0 vynechaných; BUILD SUCCESS** |

Běh skončil 2026-10-19 v 18:25:54 +02:00 a trval 13,235 s. Samostatné spuštění tří nových testů také prošlo. Spuštění vyžaduje Java 21 a lokální PostgreSQL na localhost:5432 s výchozím nastavením projektu. Omezené prostředí blokovalo databázové spojení; úspěšné běhy proběhly po povolení přístupu mimo něj.

Integrační sada vytváří náhodně pojmenované schéma c05_test_…, aplikuje skutečné Flyway migrace a po dokončení schéma odstraní. Výchozí data testu jsou commitnutá před voláním služby; testy samy neběží v automaticky vracené testovací transakci. Kontrola výsledku používá nové SQL čtení v nové transakci.

Technická chyba je řízeně vyvolaná testovacím spy objektem po flush zápisů do skutečné databáze. Test historie vynutí zápis změněné rezervace a historie; test oznámení provede skutečnou metodu create a vynutí všechny tři zápisy. Následně vyvolají RuntimeException a kontrolují původní PENDING, null confirmedAt a původní záznamy historie i oznámení. Pozitivní test ověřuje úspěšný commit a správného aktéra/příjemce. Nejde o simulaci výpadku síťového spojení ani o test souběhu.

Doklady: backend/target/surefire-reports/ pro čtyři uvedené třídy. Reporty se generují při běhu a nejsou verzované. Dřívější výsledek 22 testů byl cílenou kontrolou bez databázových testů; uvedených 26 je aktuální úplný běh.

### 3. Porovnání návrhu s implementací a řešení rozdílů

| Rozhodnutí z DD | Implementováno? | Doklad | Rozhodnutí / další akce |
| --- | --- | --- | --- |
| Identita a role se kontrolují před načtením rezervace | YES | ReservationService.approve; missingActor…, student… | Ponechat existující úpravu; aktuální testy prošly. |
| Chybějící ID nebo request znamená 400 | YES | approve; missingId…, missingRequest… | Ponechat explicitní kontrolu vstupu. |
| Schválit smí vlastník a pouze PENDING | YES | approve; foreignTeacher…, ownerCannotApprove… | Ponechat; odmítnutí nemění stav a nevytváří historii ani oznámení. |
| Reservation vlastní status a confirmedAt | YES | Reservation.confirm; ownerApproves… | Ponechat; služba kontroluje podmínky před voláním confirm. |
| Služba koordinuje historii a oznámení a předává technické chyby | YES | ownerApproves…; historyFailure…; notificationFailure… | Ponechat; testy ověřují obsah a volání spolupracujících prvků. |
| Všechny změny se uloží společně, nebo žádná | YES — pro ověřené scénáře | ReservationApprovalPersistenceTests: úspěšný commit a rollback při chybě historie/oznámení | Ponechat produkční transakci; doplněné tři integrační testy prošly. |
| O schválení rozhoduje služba rezervací | YES | approve provádí kontroly; UserService.get načítá aktéra | Zpřesněn text DD, který dříve uváděl společného vlastníka rozhodnutí. |

Návrh zachovává pravidla v jedné službě, protože nyní existuje jeden způsob schvalování. Samostatná policy třída není pro tento rozsah potřebná. Diagram proto ukazuje existující rozhraní repository a závislosti služby.

### 4. Integrační ověření a zbývající rizika


- Souběžná schválení nejsou serializována zámkem ani verzí entity; mohou vytvořit duplicitní historii/oznámení. Sekvenční 409 test není testem souběhu.
- Rollback je nyní ověřen proti PostgreSQL pro řízené RuntimeException po zápisech. Výpadek databázového spojení ani jiné druhy selhání tento test nepokrývá.
- `Reservation.confirm()` se spoléhá na kontrolu služby. Nový volající musí respektovat stejný kontrakt.

Následující případy v ReservationApprovalPersistenceTests **prošly**:

| DD element / decision | What must hold? | Test level | Test case (PASS) |
| --- | --- | --- | --- |
| D4–D6: úspěšné společné uložení | CONFIRMED, čas a právě jeden nový záznam historie i oznámení se správným aktérem/příjemcem | Integration: Spring proxy + PostgreSQL | successfulApprovalCommitsStateHistoryAndNotification |
| D6: atomická transakce při chybě oznámení | Po selhání zůstane v DB PENDING, confirmedAt=null a původní počty historie/oznámení | Integration: Spring proxy + PostgreSQL | notificationFailureRollsBackApprovalAndHistory |
| D6: atomická transakce při chybě historie | Po selhání se potvrzení neuloží a nevznikne oznámení | Integration: Spring proxy + PostgreSQL | historyFailureRollsBackApproval |

**Proč integrační úroveň:** rozhodnutí o společné transakci realizuje Spring a databáze. Mocky neumějí prokázat commit ani rollback. Kontrola proto proběhne novým načtením z databáze po skončení volané transakce; podrobný postup je v C05 DD. Tyto případy doplňují existující unit testy propagace výjimek.

### 5. Kontrola úplnosti podle zadání

| Požadovaný výstup | Stav |
| --- | --- |
| Jedna jednotka, vazba na požadavky a scénář | Hotovo v C05 DD, část 1 |
| 3–7 odpovědností a jejich vlastníci | Hotovo, části 2–3 |
| Rozhraní a kontrakty | Hotovo, části 4 a 6–7 |
| Strukturální UML a detailní sekvence | Zahrnuty, části 5 a 8 |
| Významné operace, algoritmus a stavy | Hotovo, části 6–7 |
| Nejméně 5 odvozených testů, zdůvodnění alespoň dvou úrovní | Hotovo, 12 případů v části 1 této evidence |
| Spuštění unit/component testů | Hotovo, 26 testů prošlo v aktuální revizi |
| Porovnání návrhu a implementace | Hotovo; zahrnuje databázový commit a rollback |
| Doklad atomického uložení při chybě | Hotovo; oba rollback testy proti PostgreSQL prošly |
| Commit/tag | `v0.3-c05` |

### 6. Commit/tag a další postup

**Commit/tag:** `v0.3-c05`

Návrh, implementace vybraného scénáře i její ověření jsou pro uvedený rozsah hotové. Souběžné schvalování zůstává přiznaným návrhovým rizikem a vyžaduje samostatné rozhodnutí.
