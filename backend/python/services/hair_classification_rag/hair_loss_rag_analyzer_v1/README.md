# Hair Loss RAG Analyzer v1 (Pinecone)

This is the v1 copy configured to use Pinecone instead of FAISS.

## Prerequisites
- Python 3.10+
- Node.js 18+
- Pinecone API Key

## Backend (FastAPI)

1) Configure environment
- Create `backend/.env` with:
  - `PINECONE_API_KEY=...`
  - (Optional) `FRONTEND_URL=http://localhost:3000`
  - `DATASET_PATH` if you plan to add data from local folder

2) Install dependencies and run
- Windows PowerShell:
  - `./run_backend.ps1`
- Manual:
  - `cd backend`
  - `python -m venv .venv && . .venv/Scripts/Activate.ps1`
  - `pip install -r requirements.txt`
  - `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

API base: `http://localhost:8000/api`

## Frontend (React)

1) Configure environment
- `frontend/.env` already sets: `REACT_APP_API_URL=http://localhost:8000/api`

2) Install and run
- Windows PowerShell:
  - `./run_frontend.ps1`
- Manual:
  - `cd frontend`
  - `npm install`
  - `npm start`

## Notes
- v1 uses Pinecone for vector search. Do not recreate the index unless you intend to wipe and re-upload data. The UI sends `recreate_index: false` by default.
- If data is already in Pinecone, you can directly use the Analyze feature without pressing the Database Setup button.
- CORS: Backend allows `http://localhost:3000` by default; change `FRONTEND_URL` in `backend/app/config.py` or `.env` if needed.

