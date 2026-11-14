/* ---------- word lookup: meaning + pronunciation for ANY English word ---------- */
const MEANING = {}, PRON = {}, HARD = {};
for(const k in DICT){ MEANING[k]=DICT[k][0]; PRON[k]=DICT[k][1]; if(DICT[k][2]) HARD[k]=1; }
for(const k in NAME_HE) MEANING[k]=NAME_HE[k];
for(const k in MORE_NAME_PRON) if(!(k in PRON)) PRON[k]=MORE_NAME_PRON[k];
EXTRA_SRC.split('|').forEach(e=>{ const i=e.indexOf('='); if(i<1) return; const k=e.slice(0,i).trim(); if(!(k in MEANING)) MEANING[k]=e.slice(i+1).trim(); });
(VOCAB2+'|'+VOCAB3).split('|').forEach(e=>{ const [k,he,pr]=e.split('='); if(!k||!he) return; if(!(k in MEANING)) MEANING[k]=he; if(pr && !(k in PRON)) PRON[k]=pr; });
PRON_SRC.split('|').forEach(e=>{ const i=e.indexOf('='); if(i<1) return; const k=e.slice(0,i).trim(); if(!(k in PRON)) PRON[k]=e.slice(i+1).trim(); });
let CUSTOM = {};
let NET = {};              // words fetched from the online dictionary, cached in LocalStorage
           // translations the reader typed or fetched; synced from app state
const INFO_CACHE = new Map();
const TRICKY = new Set('could would should one once two who whole know knew known said done gone come some many any busy build built friend heart heard walk talk island science quiet minute medicine machine sugar sure women answer hour eye buy lose move live give honey money month front country touch young world word work worth war break great bread dead head ready heavy learn early earth idea human music juice fruit color doctor'.split(' '));
const TYPE_NOTE = {past:'צורת עבר של', ing:'צורת ‎-ing של', s:'צורה של', poss:'של', ly:'נגזר מ־', er:'נגזר מ־', est:'נגזר מ־'};
function findLemma(k){ for(const [b,t] of lemmaCandidates(k)) if(b in MEANING && !NAMES.has(b)) return [b,t]; return null; }
function posOf(k, he, lem){
  if(NAMES.has(k)) return 'שם פרטי';
  if(k.includes("'")) return k.endsWith("'s") && !MEANING[k] ? 'שם עצם (שייכות)' : 'צירוף מקוצר';
  if(POS_OF[k]){ const tags=[...POS_OF[k]];
    if(he && !tags.includes('פועל') && he.split(/[\/·]/).some(a=>isInfinitive(a))) tags.push('פועל');
    return tags.slice(0,2).join(' / '); }
  if(!he) return null;
  if(/\((עבר|צורה) של /.test(he)) return 'פועל (צורת עבר)';
  if(!MEANING[k] && lem){ const bp=posOf(lem[0], MEANING[lem[0]], null);
    if(lem[1]==='past') return 'פועל (צורת עבר)'; if(lem[1]==='ing') return 'פועל (צורת ‎-ing)'; if(lem[1]==='ly') return 'תואר הפועל';
    if(lem[1]==='er'||lem[1]==='est') return bp&&bp.includes('שם תואר')?'שם תואר (השוואה)':'שם עצם';
    return bp; }
  const alts=he.replace(/\([^)]*\)/g,'').split(/[\/·]/).map(a=>a.trim()).filter(Boolean);
  const v=alts.some(isInfinitive), n=alts.some(a=>!isInfinitive(a));
  return v&&n ? 'פועל / שם עצם' : v ? 'פועל' : 'שם עצם';
}
function isInfinitive(a){ const w=a.trim().split(' ')[0]; return w==='לתת' || /^ל[\u05D0-\u05EA]{3,}$/.test(w) && !NOT_INFINITIVE.has(w); }
function wordInfo(k){
  let c=INFO_CACHE.get(k);
  if(!c){
    let he=MEANING[k]||null, base=null, note=null;
    const lem=findLemma(k);
    if(!he && lem){ base=lem[0]; he=MEANING[base]; note=TYPE_NOTE[lem[1]]+' '+base; }
    let pron=PRON[k], auto=false;
    if(!pron){ const pl=lem && PRON[lem[0]] ? lem : null;
      if(pl) pron=heSuffix(PRON[pl[0]], pl[1], k); else { pron=g2h(k); auto=true; } }
    const hard=!!HARD[k] || (!DICT[k] && (k.length>=8 || /gh|tion|sion|ture|ph|^kn|^wr|mb$/.test(k) || TRICKY.has(k)));
    c={he, base, note, pron, auto, hard, inDict:!!he, pos:posOf(k, he, lem)}; INFO_CACHE.set(k,c);
  }
  if(CUSTOM[k]) return {...c, he:CUSTOM[k], custom:true, note:c.he?c.note:null};
  if(!c.he && NET[k] && NET[k].he) return {...c, he:NET[k].he, net:true};
  return c;
}
if(typeof module!=='undefined') module.exports={wordInfo,MEANING,PRON};
