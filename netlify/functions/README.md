# Netlify functions

- `groups.mjs` — study-group leaderboards (Netlify Blobs).
- `talk.mjs` — free conversation with an AI. Set ONE of these environment variables (Secret):
  - `GROQ_API_KEY` — Groq (free tier). Used first when present.
  - `GEMINI_API_KEY` — Google Gemini. Used when no Groq key exists, or when `AI_PROVIDER=gemini`.
  - Optional: `GROQ_MODEL` / `GEMINI_MODEL` (preferred model), `AI_DAILY_CAP` (messages per day for the whole site, default 800).
  - Diagnostics: open `/api/talk?check=1`.
