# Evidence and Evolution

# C01 Engineering Spike

Question / unknown:
Dokážeme v backendu a databázi bezpečně ukládat rezervace a chránit systém před nekonzistentním stavem při změně rezervace nebo termínu?

What we did:
Provedli jsme spike nad persistencí a konzistencí rezervační domény. Ověřili jsme existenci backendových endpointů, Flyway migrací, PostgreSQL schématu a základních stavových operací nad konzultačními termíny a rezervacemi. Součástí změny bylo také sjednocení zrušení obsazeného termínu do jedné backendové transakce.

Observed result:
Systém ukládá uživatele, konzultační termíny, rezervace a historii změn. Backend obsahuje pravidla pro dostupnost a kolize. Frontend build, formátování, lint a typecheck byly ověřeny příkazy `npm run format:check`, `npm run lint`, `npm run typecheck` a `npm run build`.

Decision / what changes because of the result:
Pravidla konzistence rezervací budou umístěna primárně v backendové service vrstvě a chráněna databázovými omezeními. Operace, které mění více souvisejících stavů, budou vystaveny jako jeden backend endpoint místo skládání více nezávislých volání na frontendu.

## C01 review cycle

Issue/task: C01 engineering spike

Change:
Doplnění rezervační domény a ověření konzistence rušení obsazeného termínu.

Author:
Falplp

Reviewer:
ksublo

Integrated in PR:
https://github.com/ksublo/consultation_reservation_system/pull/15

## Evidence

- Backend obsahuje základní test spuštění aplikačního kontextu.
- Databázové schéma a ukázková data jsou spravovány Flyway migracemi.
- Backend obsahuje REST controllery pro uživatele, konzultační termíny a rezervace.
- Backend ukládá historii změn rezervace.
- Frontend aplikace existuje v samostatném adresáři `frontend`.

## Implemented functionality

- Přihlášení uživatele.
- Vytváření konzultačních termínů pedagogem.
- Zobrazení dostupných termínů.
- Vytvoření rezervace studentem.
- Schválení a zrušení rezervace.
- Kontrola dostupnosti a ochrana proti kolizím.
- Historie změn rezervace.

## Current limitations

- Notification Service zatím není implementovaná.
- CP1 walking skeleton je definovaný, ale není ještě kompletně ověřený jako samostatný end-to-end test.
- Backend test spuštění kontextu vyžaduje dostupnou PostgreSQL konfiguraci.

## Next steps

- Dopsat automatizovanou kontrolu pro CP1 walking skeleton.
- Doplnit nebo nahradit Notification Service stubem.
- Rozšířit testy pro kolize rezervací a rušení obsazeného termínu.
