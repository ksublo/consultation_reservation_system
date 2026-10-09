# C03B — Accepted architecture and verification

This folder contains the architecture decision and verification material for the reservation-approval slice. The maintained bilingual source rendered by the application is in `frontend/src/features/docs/c03-b/`.

It describes the actual deployed architecture: a React frontend, one Spring Boot backend, PostgreSQL, transactional reservation-state ownership in `ReservationService`, persistent notification records, and the database constraints that protect availability.
