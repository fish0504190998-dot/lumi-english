# Lumi English

אפליקציה ללימוד אנגלית לדוברי עברית: סיפורים מדורגים, מילון עם חיפוש וקול, תרגול כתיבה והכתבה.

האתר כולו נמצא ב־`index.html` (קובץ אחד). קובצי המקור נמצאים בתיקייה `src`.

## פריסה ב-Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: ריק (שורש הריפו)
- Node: 20 ומעלה
- פונקציות שרת (Pages Functions): `functions/api/talk.js`, `functions/api/groups.js`, `functions/api/keep-alive.js`
- משתני סביבה: `GROQ_API_KEY` (סוד), `GEMINI_API_KEY` (סוד), אופציונלי `AI_PROVIDER`, `GROQ_MODEL`, `GEMINI_MODEL`, `AI_DAILY_CAP`; `SUPABASE_URL`, `SUPABASE_ANON_KEY`; `VITE_VIDEO_BASE_URL`
- חיבור KV (Bindings): משתנה `LUMI_KV` (Workers KV namespace)
- אבחון ה-AI: `/api/talk?check=1`. שמירת Supabase ער: `/api/keep-alive`
- סרטונים (mp4) לא נכנסים ל-`dist`; הם מאוחסנים ב-R2 וכתובתם נקבעת ב-`VITE_VIDEO_BASE_URL` (ברירת מחדל https://lumienglish.co.il, הנתיב `/videos/<קובץ>`).
