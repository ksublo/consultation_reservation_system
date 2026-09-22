# Evidence and Evolution

## C01 Engineering Spike

**Question / unknown:** Ověřit, zda rezervační systém ukládá a následně načítá data ze skutečné PostgreSQL databáze.

**What we did:** Spustili jsme PostgreSQL, backend a frontend přes Docker Compose. Flyway při spuštění backendu provedl databázové migrace a vložil ukázková data. Ve frontendu jsme následně načetli dostupné konzultační termíny z backendového API a data jsme ověřili také v PostgreSQL databázi.

**Observed result:** PostgreSQL databáze byla úspěšně vytvořena, Flyway aplikoval migrace a ukázkové termíny se zobrazily ve frontendu. Backend tedy správně zapisuje a čte perzistentní data z databáze.

**Decision / what changes because of the result:** PostgreSQL, Flyway a Docker Compose ponecháváme jako standardní základ projektu pro lokální spuštění a správu databázového schématu. Další funkce rezervací budeme implementovat nad tímto ověřeným perzistentním úložištěm.
