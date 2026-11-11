# Project Frame

## Reservation domain

Rezervace konzultačních termínů pedagogů na univerzitě.

## Purpose

Systém umožňuje studentům rezervovat si konzultaci u konkrétního pedagoga. Pedagogové mohou vytvářet dostupné termíny, schvalovat žádosti studentů a rušit konzultace.

## Users / Stakeholders

- Student
- Pedagog
- Administrátor systému

## Core concepts

- **Reservation** – žádost studenta o konkrétní konzultační termín.
- **Resource** – konzultační termín vytvořený pedagogem.
- **User** – student nebo pedagog používající systém.
- **Consultation slot** – časový interval, který pedagog nabízí pro konzultaci.
- **Reservation history** – historie vytvoření, schválení a zrušení rezervace.

## Core operations

- Create reservation
- Confirm / approve reservation
- Cancel reservation
- Check availability

## Persistent state

U rezervace ukládáme identifikátor studenta, identifikátor termínu, název a popis důvodu konzultace, stav, datum vytvoření, datum schválení nebo zrušení a důvod zrušení.

U konzultačního termínu ukládáme identifikátor pedagoga, začátek, konec a stav termínu.

## State-changing operation

Rezervace při vytvoření přechází do stavu `PENDING`. Pedagog ji může schválit do stavu `CONFIRMED`, případně ji může student nebo pedagog zrušit do stavu `CANCELLED`.

## Common business rule

Pro stejný konzultační termín nemohou existovat dvě aktivní rezervace. Rezervace ve stavu `PENDING` i `CONFIRMED` blokují termín pro další studenty.

## Domain-specific business rule

Konzultační termíny lze vytvářet pouze v pracovní dny mezi 07:15 a 19:15. Rezervaci lze vytvořit nejméně tři hodiny před začátkem termínu; dostupné termíny s kratším předstihem se nenabízejí. Student může mít maximálně pět čekajících rezervací a nesmí si rezervovat čas, který se překrývá s jeho jinou aktivní rezervací.

## External / system boundary

Backend ukládá interní oznámení pro studenty a pedagogy při změnách rezervací. E-mailové doručování není součástí doložené implementace.

## Assumption

Každý pedagog má své konzultační termíny pod vlastní správou a může schvalovat pouze rezervace vytvořené pro své termíny.

## Unknown

E-mailové doručování oznámení není v této implementaci rozhodnuto ani doloženo.

## C08 / CR-08 — Automatické storno neschválených rezervací

### Původ a cíl změny

Požadavek je veden jako [GitHub issue #64](https://github.com/ksublo/consultation_reservation_system/issues/64). Pedagog nemusí na novou žádost včas reagovat; rezervace pak zůstává `PENDING` a blokuje konzultační termín. Požadované řešení automaticky stornuje nevyřízenou žádost tři hodiny před začátkem konzultace, uvolní termín a oznámí studentovi důvod.

### Baseline a implementační reference

| Položka                        | Identifikace                                                                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before baseline                | `main@99210f0158993b2b8a81f9b327f63e5736556c62` (`Docs/docs7 (#63)`), rodič implementačního commitu                                                                                                                                    |
| Databázové schéma před změnou  | Flyway V14                                                                                                                                                                                                                             |
| Runtime                        | Java 21, Spring Boot 4.1.1, Maven wrapper; React, TypeScript a Vite; PostgreSQL 17 přes Docker Compose                                                                                                                                 |
| Testovací konfigurace          | Backendové persistence testy používají izolovaná náhodně pojmenovaná PostgreSQL schémata a skutečné Flyway migrace. Frontendové testy používají Vitest a Testing Library. Tajné údaje se do evidence neukládají.                       |
| Implementace změny             | `a5cf9d99bfa860a31a6cccfc870edc8e4bc6d4c4` (`feat: Add automatic cancellation for unapproved reservations`) na `feat/auto-cancel-unapproved-reservations`; [PR #67](https://github.com/ksublo/consultation_reservation_system/pull/67) |
| Rozsah této dokumentační větve | `main`; změny jsou dokumentační a popisují uvedený implementační commit.                                                                                                                                                               |

Commit `a5cf9d9` má jako přímého rodiče `99210f0`; proto jsou v dokumentaci oddělené původní chování před změnou a implementace po změně. Backendové soubory na revizi `31a22ad`, jejíž C07 evidence zaznamenává integrační běh, jsou shodné s backendem baseline `main@99210f0`. Frontendové C07 dokumentační soubory se mezi revizemi liší, proto se jejich starší výsledky nepoužívají jako důkaz C08 frontendových úprav.

### Chování před změnou

`ReservationService.create()` ukládá žádost jako `PENDING`, vytvoří záznam `CREATED` a oznámí ji pedagogovi. Aktivní `PENDING` blokuje slot. Vlastník slotu může schválit každou čekající žádost; schválení před změnou nemělo tříhodinovou časovou kontrolu. Automatické storno neexistovalo. Ruční storno už mělo tříhodinový limit. Potvrzené a čekající žádosti sdílejí ochranu `one_active_reservation_per_slot`.

### Akceptační podmínky

| ID    | Pozorovatelné očekávání                                                                            | Rozhodnutí / přesná hranice                                                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Platnou žádost lze schválit před uzávěrkou; vznikne `CONFIRMED`, historie a oznámení studentovi.   | Schválení je dovoleno jen když `startsAt > now + 3 h`.                                                                                                                                  |
| AC-02 | Čekající žádost při dosažení uzávěrky přejde do `CANCELLED`; pozdní schválení vrátí konflikt.      | Hranice je inkluzivní: `startsAt <= now + 3 h` je po lhůtě. Při pokusu o pozdní schválení backend nejprve provede automatické storno a potom vrátí HTTP 409; storno se přesto commitne. |
| AC-03 | Student se dozví, že žádost nebyla včas schválena.                                                 | Právě jedno interní oznámení typu `RESERVATION_CANCELLED`, s datem, časem, pedagogem a důvodem `Pedagog žádost včas neschválil.`                                                        |
| AC-04 | Změna je auditovatelná a uvolní slot.                                                              | Původní `CREATED` zůstává; přibude `CANCELLED`, poznámka vysvětluje důvod. Změna stavu odstraní rezervaci z množiny blokujících stavů `PENDING`/`CONFIRMED`.                            |
| AC-05 | Oznámení, historie a změna rezervace jsou konzistentní a opakované zpracování nevytváří duplicity. | Zápisy proběhnou ve stejné transakci; chyba historie nebo oznámení rollbackne celé storno. Již stornovaná/potvrzená žádost se znovu nezpracuje.                                         |
| AC-06 | Ruční storno a schválení nejsou možné v posledních třech hodinách přes UI ani API.                 | Přesně tři hodiny se považují za uzavřenou hranici. Student i pedagog vidí neaktivní ovládací prvek; backend vrací 409 u ručního storna.                                                |

**Zachovaná hraniční výjimka:** pravidlo vytvoření rezervace odmítá jen sloty _dříve než_ `now + 3 h`; přesně tři hodiny předem tedy vytvoření ještě přijme. Nový expirační guard však považuje stejný okamžik za uzávěrku. Nově vytvořená žádost přesně na hranici tak může být vzápětí automaticky stornována. Implementační commit toto pravidlo nemění; je zapsáno jako zbytková produktová nejasnost k rozhodnutí, nikoli jako skrytě opravené chování.

### Impact matrix

| Oblast / konkrétní prvek | Dopad a důvod                                                                                                  | Rozhodnutí     | Akce a důkaz                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Požadavek a pravidla     | Nová lhůta pro přechod `PENDING`; student potřebuje výsledek.                                                  | CHANGE         | CR-08 a AC-01–AC-06 výše; zdroj issue #64.                                                                                                                          |
| Identita a role          | Stávající kontroly aktéra, role pedagoga a vlastnictví termínu zůstávají.                                      | NO IMPACT      | `ReservationService.approve()` ověřuje aktéra a vlastníka před změnou stavu.                                                                                         |
| Stavový model            | Používá existující `CANCELLED`, nový `EXPIRED` stav nevzniká.                                                  | CHANGE         | `Reservation.cancel(null, reason)`; test ověřuje status, čas, důvod a historii.                                                                                     |
| Vlastnictví rozhodnutí   | `ReservationService` zůstává autoritou pro lifecycle; scheduler jen spouští její transakční operaci.           | CHECK          | `ReservationExpiryScheduler` → `ReservationService.cancelExpiredPendingReservations()`.                                                                             |
| Detailní návrh a souběh  | Scheduler skenuje přes zamykající repository query; approve zamyká rezervaci a má druhý cutoff guard.          | CHANGE         | `findPendingForAutomaticCancellation`, `findByIdForUpdate`, integrační test hranice a opakovaného běhu. Zvláštní závodní test dvou scheduler instancí přidán nebyl. |
| Persistence a migrace    | Systémový aktér nemá uživatelské ID; rezervace je stornována s null aktérem.                                   | CHANGE         | Flyway V15 povoluje null v `reservation_history.actor_user_id`; integrační test kontroluje auditní řádek.                                                           |
| API a oprávnění          | Pozdní approve vrací 409; ruční cancel cutoff zůstává a vztahuje se na studenty i pedagogy.                    | CHANGE / CHECK | `ReservationController` stále deleguje do služby; `ReservationAuthorizationTests` pokrývá přímé API odmítnutí.                                                      |
| Frontend                 | Schválení a ruční storno se vypnou při rozdílu `<= 3 h`; seznamy se obnovují po 10 s.                          | CHANGE         | `TeacherPage`, `MyReservationsPage` a jejich testy ověřují přesnou hranici.                                                                                         |
| Oznámení                 | Interní oznámení se ukládá studentovi; nejde o e-mail ani externí službu.                                      | CHANGE         | Integrační test ověřuje typ, počet, text a detaily termínu; aplikace načítá oznámení v existujícím 30s intervalu.                                                   |
| Tvorba konzultačních termínů | Operace a pravidla tvorby slotů se nemění; C08 se týká až existující rezervace.                             | NO IMPACT      | Změna je omezena na lifecycle `PENDING` rezervace.                                                                                                                  |
| Konfigurace a nasazení   | Nový samostatný proces/služba není potřeba. Interval lze změnit vlastností.                                    | CHANGE         | `app.reservations.expiry-poll-interval-ms`, výchozí hodnota 1000 ms; běží uvnitř backendu.                                                                          |
| Release a návrat         | V15 je rozšiřující migrace. Řádky s null aktérem nelze bez dalšího vrátit pod NOT NULL.                        | CHECK          | Nasazovat kód a migraci společně; případný rollback schématu vyžaduje plán pro systémové auditní řádky.                                                             |
| Provoz a uživatel        | Při běžícím backendu scheduler vyhledává expirované žádosti; výpadek backendu může storno zpozdit do restartu. | CHECK          | Synchronní kontroly při načtení rezervací a pozdním schválení doplňují plánovaný běh; monitorování zpoždění jobu není implementované.                               |

### Varianty a rozhodnutí

| Varianta                                                 | Splnění potřeby                                                 | Přínosy                                                                                       | Náklady / rizika                                                                                                                                     | Ověření                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A — lazy expiry jen při schválení nebo načtení           | Částečné: po tichu bez návštěvy zůstává slot blokovaný.         | Málo kódu, bez scheduleru.                                                                    | Žádné proaktivní uvolnění; oznámení se zpozdí, dokud někdo nepřijde.                                                                                 | Hraniční approve/list test; neprokazuje autonomní storno.                    |
| B — scheduler + guard při approve + kontrola při načtení | Ano, při dostupném backendu; zachytí i požadavky bez interakce. | Uvolňuje slot, posílá oznámení; guards chrání proti pozdnímu schválení a zastaralému seznamu. | Polling může mít zpoždění do intervalu; při výpadku backendu se zpracuje až po obnovení; dvě scheduler instance nemají vlastní dedikovaný race test. | PostgreSQL hraniční testy, API testy, test rollbacku a front-endové hranice. |
| C — beze změny, pedagog řeší frontu ručně                | Ne; nesplní automatické uvolnění ani oznámení.                  | Bez změny kódu.                                                                               | PENDING může blokovat termín neomezeně.                                                                                                              | Pouze ruční proces; odmítnuto jako řešení CR-08.                             |

**Rozhodnutí: ACCEPT / implementováno v `a5cf9d9`.** Varianta B byla přijata, protože splňuje automatické chování a zachovává `ReservationService` jako jediného vlastníka lifecycle. Změna nepřidává nový stav ani externí scheduler. Vlastníkem implementačního commitu je Kseniia Blokhina. Peer review PR #67 je doloženo přímo v [PR #67](https://github.com/ksublo/consultation_reservation_system/pull/67): `Falplp` review schválil 11. 11. 2026, bez inline připomínek a bez požadovaných změn.

### Předání a zbývající rozhodnutí

Implementační delta a testy už jsou v commit `a5cf9d9`; navazující práce má zachovat AC-01–AC-06 a pokrýt především přesně tříhodinové vytvoření rezervace, závod dvou scheduler instancí a zpožděné zpracování po výpadku backendu. Vlastník produktu má rozhodnout, zda se vytvoření přesně na hranici změní na odmítnutí; současný kód ho stále přijímá. TC-C08-02 zůstává BLOCKED, protože baseline create odmítá požadovaný slot za 2 h 59 min; peer review PR #67 je naopak doloženo a schváleno.
