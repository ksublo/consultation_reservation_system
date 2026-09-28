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
