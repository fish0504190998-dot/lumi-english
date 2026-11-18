#!/bin/bash
# builds the public website (Cloudflare Pages) from the offline single-file build
set -e
B=/tmp/claude-0/-home-user-lumi-english/d0cf8880-94af-5395-b228-967c754cd632/scratchpad/brand
SITE=/home/user/lumi-site
cp $B/apple-touch-icon.png $B/icon-192.png $B/icon-512.png $B/favicon-32.png $B/og.png $B/og-v2.png $B/og-v3.jpg $SITE/
cp $B/logo.svg $SITE/favicon.svg
cat > $SITE/manifest.webmanifest <<'M'
{
  "name": "Lumi English",
  "short_name": "Lumi",
  "description": "לומדים אנגלית בכיף, כל יום",
  "lang": "he",
  "dir": "rtl",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAF9F6",
  "theme_color": "#2F7D73",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
M
python3 - <<'P'
src=open('/home/user/lumi-english/lumi-english-offline.html').read()
tags='''<meta name="description" content="לומדים אנגלית בכיף, כל יום: סיפורים מדורגים, צלילים ואותיות, שיחה בקול ותחרות עם חברים. בחינם, בעברית, בלי הרשמה.">
<meta name="theme-color" content="#2F7D73">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-title" content="Lumi English">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lumi English">
<meta property="og:title" content="לומדים אנגלית בכיף, כל יום">
<meta property="og:description" content="סיפורים מדורגים, צלילים ואותיות, שיחה בקול ותחרות עם חברים. בחינם, בעברית, בלי הרשמה.">
<meta property="og:url" content="https://lumienglish.co.il/">
<meta property="og:image" content="https://lumienglish.co.il/og-v3.jpg">
<meta property="og:image:secure_url" content="https://lumienglish.co.il/og-v3.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="Lumi English: לומדים אנגלית בכיף, כל יום">
<link rel="image_src" href="https://lumienglish.co.il/og-v3.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="he_IL">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://lumienglish.co.il/og-v3.jpg">
'''
anchor='<meta name="viewport" content="width=device-width, initial-scale=1">'
assert src.count(anchor)==1
out=src.replace(anchor, anchor+'\n'+tags)
out=out.replace('<title>Lumi English</title>','<title>Lumi English · לומדים אנגלית בכיף</title>',1)
# offline favicon (inline) must not override the site's own icons
out=out.replace('<link rel="icon" href="data:image/svg+xml','<link rel="alternate icon" href="data:image/svg+xml')
open('/home/user/lumi-site/index.html','w').write(out)
P
echo site built
