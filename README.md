# urban-cool

A service-booking platform for home appliance repair — AC, refrigerator, washing machine, and microwave. Customers book a technician; ops assigns and tracks the job. See [PRODUCT.md](./PRODUCT.md) and [DESIGN.md](./DESIGN.md) for the product and visual system.

## Stack

- **`frontend/`** — React + TypeScript, built with Vite.
- **`backend/`** — Django + Django REST Framework, serving a JSON API.

The two run as separate dev servers during development (frontend on `:5173`, backend on `:8000`) and talk over CORS.

## First-time setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash; use .venv\Scripts\activate.bat on cmd.exe
pip install -r requirements.txt
cp .env.example .env               # then fill in DJANGO_SECRET_KEY etc.
python manage.py migrate
python manage.py createsuperuser   # optional, for /admin/
python manage.py runserver
```

API is now at `http://localhost:8000/api/`. Try `http://localhost:8000/api/health/`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env               # VITE_API_URL, defaults to http://localhost:8000
npm run dev
```

App is now at `http://localhost:5173`. It calls the backend health-check endpoint on load so you can confirm the two sides are wired together.

## Running both

Open two terminals — one in `backend/` (`python manage.py runserver`), one in `frontend/` (`npm run dev`).

## Project structure

```
urban-cool/
├── PRODUCT.md          # strategy: users, purpose, brand personality, register
├── DESIGN.md            # visual system: colors, typography, components
├── frontend/             # React + Vite + TypeScript
│   └── src/
│       ├── styles/tokens.css   # CSS custom properties mirroring DESIGN.md
│       ├── App.tsx
│       └── main.tsx
└── backend/              # Django + DRF
    ├── config/            # settings, root urls
    ├── bookings/           # first Django app (booking domain lives here)
    └── manage.py
```

## Next step

The scaffold above proves the two sides talk to each other — no product UI exists yet. Build the booking flow with:

```
/impeccable craft booking flow
```
