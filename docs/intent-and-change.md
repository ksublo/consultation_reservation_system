# Project Frame

## Reservation domain

Rezervujeme konzultační termíny studentů u vyučujících.

## Purpose

Systém umožňuje studentům rezervovat si konzultační termín s vyučujícím. Cílem je zabránit kolizím rezervací a umožnit jednoduchou kontrolu dostupných konzultačních termínů.

## Users / Stakeholders

* Student – vytváří a ruší rezervace.
* Vyučující – poskytuje konzultační termíny a schvaluje rezervace.
* Administrátor – spravuje systém.

## Core concepts

* Reservation – rezervace konzultačního termínu.
* Resource – konkrétní konzultační termín.
* User – student nebo vyučující.
* Consultant – vyučující poskytující konzultaci.

## Core operations

* Create reservation
* Confirm / approve reservation
* Cancel reservation
* Check availability

## Persistent state

### Reservation

* ID rezervace
* ID uživatele
* ID konzultanta
* ID resource
* datum
* čas začátku
* čas konce
* stav rezervace

### Resource

* ID konzultačního termínu
* ID konzultanta
* datum
* čas začátku
* čas konce
* dostupnost

## State-changing operation

Rezervace může měnit svůj stav:

DRAFT → CONFIRMED → CANCELLED

## Common business rule

Confirmed reservations for the same resource must not overlap.

## Domain-specific business rule

Jeden student může mít u stejného vyučujícího maximálně jednu potvrzenou rezervaci za jeden den.

## External / system boundary

Notification Service.

Systém používá Notification Service pro odeslání upozornění studentovi při potvrzení nebo zrušení rezervace.

## Assumption

Předpokládáme, že konzultační termíny vytváří vyučující předem a student si může rezervovat pouze dostupný předem vytvořený termín.

## Unknown

Zatím nevíme, zda bude možné, aby vyučující změnil nebo zrušil konzultační termín, který už má student rezervovaný.
