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

Konzultační termíny lze vytvářet pouze v pracovní dny mezi 07:15 a 19:15.

Další implementovaná pravidla: student může mít maximálně pět čekajících rezervací a nesmí si rezervovat čas, který se překrývá s jeho jinou aktivní rezervací.

## External / system boundary

Notification Service – po vytvoření, schválení nebo zrušení rezervace bude systém vytvářet oznámení pro studenta nebo pedagoga. *(ještě ve vývoji)*

## Assumption

Každý pedagog má své konzultační termíny pod vlastní správou a může schvalovat pouze rezervace vytvořené pro své termíny.

## Unknown

Zatím není rozhodnuto, zda budou notifikace pouze přímo v aplikaci, nebo zda se budou odesílat také e-mailem.

## Selected future pressure

Category: R — Risk / Higher consequence

Concrete pressure:
Zrušení obsazeného konzultačního termínu nesmí nechat systém v částečně změněném stavu, například se zrušenou rezervací, ale stále aktivním termínem.

Why it is relevant to our reservation system:
Pedagog může rušit termín, který už má rezervovaný student. Taková operace mění stav rezervace i stav termínu, proto musí být konzistentní a provedená jako jedna transakce na backendu.
