#!/bin/bash
set -e
S=/tmp/claude-0/-home-user/d0cf8880-94af-5395-b228-967c754cd632/scratchpad; L=$S/libs/node_modules; cd $S/v2
node -e "
const B=require('$L/@babel/standalone');const fs=require('fs');
fs.writeFileSync('app.js',B.transform(fs.readFileSync('app.jsx','utf8'),{presets:['react']}).code);
const lib=['lang.js','stories.js','stories_daily.js','dict_old.js','dict_new.js','extra.js','vocab2.js','phonics.js','talk.js','lookup.js'].map(f=>fs.readFileSync(f,'utf8').replace(/if\(typeof module[^\n]*\n?/g,'')).join('\n');
fs.writeFileSync('bundle.js',lib+'\n'+fs.readFileSync('app.js','utf8'));"
node --check bundle.js
(cd $S/libs && sed -i "s#content:\[[^]]*\]#content:['$S/v2/app.jsx']#" tw.config.js && sed -i "s#fontFamily:{[^}]*}#fontFamily:{display:['Heebo','system-ui','sans-serif'],he:['Heebo','system-ui','sans-serif'],en:['Literata','Georgia','serif']}#" tw.config.js && npx tailwindcss -c tw.config.js -i in.css -o tw.css 2>/dev/null)
{ cat head.html; echo '<div id="root"></div>'; echo '<script>'; cat bundle.js; echo '</script>'; } > /home/user/lumi-english/index.html
python3 - "$L" "$S" <<'PY'
import sys,re
L,S=sys.argv[1],sys.argv[2]
h=open('head.html').read(); tw=open(S+'/libs/tw.css').read()
h,n=re.subn(r'<script src="https://cdn.tailwindcss.com[^<]*</script>\s*<script>\s*tailwind.config[\s\S]*?</script>',lambda m:'<style>'+tw+'</style>',h); assert n==1
for name in ['react','react-dom']:
  tag=f'<script src="https://cdnjs.cloudflare.com/ajax/libs/{name}/18.3.1/umd/{name}.production.min.js"></script>'; assert tag in h
  h=h.replace(tag,'<script>'+open(f'{L}/{name}/umd/{name}.production.min.js').read()+'</script>')
tag=f'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"></script>'; assert tag in h
h=h.replace(tag,'<script>'+open(f'{L}/@supabase/supabase-js/dist/umd/supabase.js').read()+'</script>')
assert '<script src=' not in h
doc='<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'+h+'\n</head><body><div id="root"></div><script>'+open('bundle.js').read()+'</script></body></html>'
open('/home/user/lumi-english/lumi-english-offline.html','w').write(doc)
PY
ls -la /home/user/lumi-english/
