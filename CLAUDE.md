# Lumi English – מסמך העברה (handoff)

המשתמש מדבר עברית. תענה לו בעברית, בקצרה, בלי ז'רגון. הוא לא מתכנת.

## מה הפרויקט
אפליקציית ווב ללימוד אנגלית לדוברי עברית: סיפורים בצבעי LingQ, הקראה, מילון, כרטיסי חזרה (SRS), צלילים, שיחות, הישגים, קבוצות, פרופילים, סנכרון ענן (Supabase), סיפורי קהילה, **קורסים** (חדש).
אתר חי: https://lumienglish.co.il (Cloudflare Pages, פריסה אוטומטית מ-GitHub main). הועבר מ-Netlify (האתר הישן lumi-english.netlify.app כבר לא מתעדכן).

## פריסה (Cloudflare Pages)
- Build command: `npm run build` (מריץ `scripts/build.mjs`, בלי תלויות). Build output directory: `dist`. Root directory: ריק (שורש הריפו). Node 20 ומעלה.
- `scripts/build.mjs` מעתיק ל-`dist` רק את האתר הסטטי (index.html, manifest, אייקונים, תמונות og), יוצר `dist/_redirects` (`/* /index.html 200`) ו-`dist/_headers`, מזריק `window.__VIDEO_BASE_URL__` ל-index.html, ונכשל אם נמצא קובץ וידאו ב-dist. זה המקור היחיד ל-_redirects/_headers.
- `index.html` ב-repo נבנה מקומית: עורכים `src/*.jsx|js` ואז `node C:\claude\lumi-build\build_local.mjs`, ועושים commit ל-index.html.
- Pages Functions בתיקייה `functions/api/`: `talk.js` (פרוקסי AI), `groups.js` (קבוצות), `keep-alive.js` (שמירת Supabase ער).
- משתני סביבה (Settings > Variables and Secrets): `GROQ_API_KEY` (סוד), `GEMINI_API_KEY` (סוד, גיבוי), אופציונליים `AI_PROVIDER`, `GROQ_MODEL`, `GEMINI_MODEL`, `AI_DAILY_CAP`; `SUPABASE_URL`, `SUPABASE_ANON_KEY` (ל-keep-alive); `VITE_VIDEO_BASE_URL` (בסיס הכתובת של הסרטונים).
- KV: namespace ב-Workers KV וחיבור (Bindings) בשם `LUMI_KV` ל-Pages project. משמש לספירת הודעות AI יומית ולקבוצות. אבחון: `/api/talk?check=1`.
- וידאו: קובצי mp4/jpg לא נמצאים ב-dist. הם נטענים מ-R2 דרך `videoUrl()` ב-app.jsx: `<VIDEO_BASE_URL>/videos/<שם קובץ>` (ברירת מחדל https://lumienglish.co.il).
- keep-alive: `https://lumienglish.co.il/api/keep-alive` (לקרוא ב-cron חיצוני, למשל cron-job.org, פעם ביום-יומיים).

## מבנה
- קובץ יחיד: React 18 (UMD) + Tailwind מקומפל, בלי TypeScript/Vite. המקור ב-`src/`:
  `app.jsx` (האפליקציה), `courses.js` (נתוני קורסים), `head.html`, `build.sh`, ספריות הנתונים (stories, dict, talk, phonics ועוד).
- `functions/api/`: `groups.js` (קבוצות), `talk.js` (פרוקסי AI: Groq ראשי, Gemini גיבוי), `keep-alive.js`.
- `supabase-*.sql`: טבלאות ענן. **המשתמש עדיין צריך להריץ supabase-community.sql ב-Supabase** (לא אושר).
- `tests/`: בדיקות Playwright (t21 קורסים, t22 יחידה מלאה, t23 כרטיסי חזרה, t24 העתקה מהזיכרון, mock-supabase.js). הן מצפות לקובץ `lumi-english-offline.html` שנבנה עם build.sh (נתיבים בתוך הסקריפטים הם של סביבת הענן ויש להתאים).
- הערה: build.sh ו-build-site.sh נכתבו לסביבת הענן (נתיבי scratchpad). בבניה מקומית צריך להתאים נתיבים או לבקש מהמשתמש לבנות בענן.

## מצב הקורסים (העבודה האחרונה)
- לשונית "קורסים" ראשונה. קורס חדש `a1u` "A1 · מסלול מובנה": יחידה אחת מוכנה ("היכרות", 5 שיעורים + מבחן יחידה ב-80%).
- שיעור מסוג `rich`: דיאלוג ← כלל בעברית + "שימו לב" ← 10 מילים ← תרגילים (choose/fill/listen/order/type/copy/speak). לכל תרגיל הסבר "למה?".
- תרגיל copy: אחרי שני מעברים נכונים על משפט, ב-60% הוא מוסתר (כתיבה מהזיכרון, יש רמז). מצב ב-`state.copySeen`.
- כרטיסי חזרה: אפשרות בחירה מבין 4 פירושים, "תרגול מוקדם" כשאין מילים לחזרה, ושאלת "עוד סבב?" בסוף.
- שני קורסים ישנים (a1, a2, b1) הם רשימות מילים בלבד. המשתמש אמר שהם לא טובים; מתוכננים להיעלם כשהמסלול החדש יתמלא.

## מה הבא
1. לכתוב 7 יחידות נוספות ל-A1 באותו מבנה: to be בשאלות/שלילה, this/that+a/an/the, there is/are, have got+משפחה, present simple, can, אוכל+would like.
2. מבחן מיקום, הסתרת הקורסים הישנים, אולי A2.
3. החלטה פתוחה: ברירת המחדל של הלשונית (המשתמש ענה "לא" להצעה לפתוח על קורסים ולא הסביר; לשאול שוב לפני שינוי).

## מחקר (מסקנות)
מבנה מקובל: רמה (CEFR) ← יחידה ← שיעור קצר: קלט (דיאלוג) ← שפה מרכזית ← תרגול ← חידון. הוראה בעברית של ההבדלים (אין is/am/are בהווה, אין a/the). לא להעתיק תוכן מ-eshkolot, Duolingo, Oxford. מקורות חופשיים: Tatoeba (CC BY), NGSL.

## פתוחים אצל המשתמש
כתובת תמיכה אמיתית במקום `support@lumi-english.app` (SUPPORT_EMAIL ב-app.jsx); Site URL ב-Supabase; מחיקת מפתח Gemini ישן.

## הנחיות
- לבדוק בטלפון (360px) ובמחשב; ממשק RTL, אנגלית LTR.
- להריץ את הבדיקות ב-tests/ לפני פריסה. לדחוף ל-main רק כשהמשתמש ביקש או כשזו ההמשך הרגיל שלו.
- אין לשים סודות/מפתחות ב-repo.
