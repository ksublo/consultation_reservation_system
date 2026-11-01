# Nasazení větve `development`

Nasazujeme aktuální obsah větve `development` jako veřejné demo. Frontend bude na Vercelu, Spring Boot API na Renderu a PostgreSQL v Supabase. Produkční databáze bude samostatná od místní databáze.

## Větev a repozitář

GitHub repozitář: `ksublo/consultation_reservation_system`  
Větev pro nasazení: `development`

Po každém pushi do `development` Vercel a Render automaticky nasadí novou verzi.

## Frontend na Vercelu

Vytvořte projekt z GitHub repozitáře a nastavte:

- Production Branch: `development`
- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL` = veřejná URL Render API bez koncového `/api`

Po nasazení zkopírujte veřejnou URL webu, například `https://nazev-projektu.vercel.app`.

## Databáze v Supabase

Vytvořte nový PostgreSQL projekt ideálně v evropském regionu. Pro Render použijte připojovací údaje z Supabase a zapněte SSL. Heslo databáze ukládejte pouze do proměnných prostředí Renderu; nepatří do GitHubu.

Backend používá standardní Spring proměnné:

- `SPRING_DATASOURCE_URL` = `jdbc:postgresql://<host>:<port>/postgres?sslmode=require`
- `SPRING_DATASOURCE_USERNAME` = uživatel z připojovacích údajů
- `SPRING_DATASOURCE_PASSWORD` = heslo databáze

Při prvním startu Spring Boot automaticky spustí Flyway migrace.

## Backend na Renderu

Vytvořte Web Service z téhož repozitáře a nastavte:

- Branch: `development`
- Root Directory: nechte prázdné
- Runtime: Docker
- Dockerfile Path: `backend/Dockerfile`
- Instance: Free
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` a `SPRING_DATASOURCE_PASSWORD` podle Supabase
- `APP_CORS_ALLOWED_ORIGIN` = přesná veřejná URL Vercel webu, bez koncového `/`
- `WEBAUTHN_RP_ID` = hostname Vercel webu, například `consultation-reservation-system.vercel.app`
- `WEBAUTHN_ORIGIN` = přesná HTTPS URL webu, například `https://consultation-reservation-system.vercel.app`

Po prvním úspěšném nasazení zkopírujte veřejnou URL Render služby a vložte ji ve Vercelu do `VITE_API_BASE_URL`. Potom spusťte redeploy frontendu. CORS na backendu povolí pouze nastavený Vercel origin.

## Samostatná databáze a demonstrační data

Flyway v Supabase vytvoří také tabulky pro passkeys. Přihlásit se lze passkey nebo přímo loginem a heslem. Každý demo účet si může passkey založit pomocí demo hesla `password`; passkey tak zůstává pohodlnou možností, zatímco přihlášení heslem funguje i v nepodporovaném prohlížeči nebo zařízení.

## Omezení bezplatných plánů

Render může po nečinnosti uspávat backend; první požadavek potom může čekat přibližně minutu. Supabase může neaktivní bezplatný projekt pozastavit. Tato sestava je vhodná pro školní demo, ne pro službu, u které je nutná nepřetržitá dostupnost.
