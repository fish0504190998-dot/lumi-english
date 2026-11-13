/* ---------- language engine: lemmas + automatic Hebrew transliteration ---------- */
function lemmaCandidates(w){
  const c=[]; const add=(b,t)=>{ if(b.length>=2) c.push([b,t]); };
  const undouble=b=>/([bdgklmnprt])\1$/.test(b)?b.slice(0,-1):null;
  if(w.endsWith("'s")) add(w.slice(0,-2),'poss');
  if(w.endsWith("s'")) add(w.slice(0,-1),'s');
  if(w.endsWith('ies')) add(w.slice(0,-3)+'y','s');
  if(w.endsWith('ves')){ add(w.slice(0,-3)+'f','s'); add(w.slice(0,-3)+'fe','s'); }
  if(w.endsWith('es')) add(w.slice(0,-2),'s');
  if(w.endsWith('s')&&!w.endsWith('ss')) add(w.slice(0,-1),'s');
  if(w.endsWith('ied')) add(w.slice(0,-3)+'y','past');
  if(w.endsWith('ed')){ const b=w.slice(0,-2); add(b,'past'); add(b+'e','past'); const u=undouble(b); if(u) add(u,'past'); }
  if(w.endsWith('ing')){ const b=w.slice(0,-3); add(b,'ing'); add(b+'e','ing'); const u=undouble(b); if(u) add(u,'ing'); }
  if(w.endsWith('ily')) add(w.slice(0,-3)+'y','ly');
  if(w.endsWith('ly')) add(w.slice(0,-2),'ly');
  if(w.endsWith('ier')) add(w.slice(0,-3)+'y','er');
  if(w.endsWith('er')){ const b=w.slice(0,-2); add(b,'er'); add(b+'e','er'); const u=undouble(b); if(u) add(u,'er'); }
  if(w.endsWith('iest')) add(w.slice(0,-4)+'y','est');
  if(w.endsWith('est')){ const b=w.slice(0,-3); add(b,'est'); add(b+'e','est'); const u=undouble(b); if(u) add(u,'est'); }
  return c;
}
const G2H_V={a:['ֶ',''],ah:['ַ',''],e:['ֶ',''],i:['ִ','י'],ii:['ִ','י'],o:['וֹ',''],u:['וּ',''],ei:['ֵ','יי'],ai:['ַ','יי'],au:['ָ','אוּ'],oi:['וֹ','י'],aa:['ַ','א'],A:['ָ','ה']};
const G2H_C={b:'בּ',d:'ד',f:'פ',h:'ה',j:"ג'",k:'ק',l:'ל',m:'מ',n:'נ',p:'פּ',r:'ר',t:'ט',v:'ב',w:'ו',z:'ז',q:'ק'};
const G2H_FINAL={'נ':'ן','מ':'ם','פ':'ף'};
function g2h(word){
  const w=word.toLowerCase().replace(/[^a-z]/g,''); if(!w) return '';
  const T=[]; const C=h=>T.push(['C',h]), V=k=>T.push(['V',k]);
  const n=w.length; const isV=c=>!!c&&'aeiou'.includes(c);
  let i=0;
  while(i<n){
    const r=w.slice(i), c=w[i], nx=w[i+1], pv=w[i-1]; let m;
    const hadV=T.some(t=>t[0]==='V');
    if(r.startsWith('ation')){ V('ei');C('שׁ');V('e');C('נ'); i+=5; continue; }
    if(r.startsWith('tion')){ C('שׁ');V('e');C('נ'); i+=4; continue; }
    if(r.startsWith('sion')){ C("ז'");V('e');C('נ'); i+=4; continue; }
    if(r==='ture'){ C("צ'");V('e');C('ר'); break; }
    if(r==='ous'){ V('e');C('ס'); break; }
    if(r.startsWith('eigh')){ V('ei'); i+=4; continue; }
    if(r.startsWith('igh')){ V('ai'); i+=3; continue; }
    if(r.startsWith('ough')||r.startsWith('augh')){ V('o'); i+=4; continue; }
    if(r.startsWith('tch')){ C("צ'"); i+=3; continue; }
    if(r==='dge'){ C("ג'"); break; }
    if(r.startsWith('ch')){ C("צ'"); i+=2; continue; }
    if(r.startsWith('sh')){ C('שׁ'); i+=2; continue; }
    if(r.startsWith('th')){ C("ת'"); i+=2; continue; }
    if(r.startsWith('ph')){ C('פ'); i+=2; continue; }
    if(r.startsWith('wh')){ C('ו'); i+=2; continue; }
    if(r.startsWith('ck')){ C('ק'); i+=2; continue; }
    if(i===0&&r.startsWith('wr')){ C('ר'); i+=2; continue; }
    if(i===0&&r.startsWith('kn')){ C('נ'); i+=2; continue; }
    if(r.startsWith('gh')){ if(i===0) C('ג'); i+=2; continue; }
    if(r.startsWith('qu')){ C('ק');C('ו'); i+=2; continue; }
    if(r.startsWith('sc')&&w[i+2]&&'eiy'.includes(w[i+2])){ C('ס'); i+=2; continue; }
    if(r==='mb'){ C('מ'); break; }
    if(r.startsWith('ng')&&!isV(w[i+2])){ C('נ');C('ג'); i+=2; continue; }
    if((m=r.match(/^([aiou])([bcdfgklmnprstvz])e(s|d)?$/))){
      V({a:'ei',i:'ai',o:'o',u:'u'}[m[1]]);
      const k=m[2]; C(k==='c'?'ס':k==='g'?"ג'":k==='s'?'ז':G2H_C[k]);
      if(m[3]==='s') C('ptkf'.includes(k)?'ס':'ז');
      if(m[3]==='d'){ if(k==='t'||k==='d'){ V('e'); C('ד'); } else C('ptkfsc'.includes(k)?'ט':'ד'); }
      break;
    }
    if(r.startsWith('ee')||r.startsWith('ea')){ V('ii'); i+=2; continue; }
    if(r.startsWith('oo')){ V('u'); i+=2; continue; }
    if(r.startsWith('ou')){ V('au'); i+=2; continue; }
    if(r.startsWith('ow')){ V(i+2>=n?'o':'au'); i+=2; continue; }
    if(r.startsWith('oa')){ V('o'); i+=2; continue; }
    if(r.startsWith('ai')||r.startsWith('ay')){ V('ei'); i+=2; continue; }
    if(r.startsWith('ey')){ V(i+2>=n&&hadV?'ii':'ei'); i+=2; continue; }
    if(r.startsWith('oi')||r.startsWith('oy')){ V('oi'); i+=2; continue; }
    if(r.startsWith('au')||r.startsWith('aw')){ V('o'); i+=2; continue; }
    if(r.startsWith('ew')){ if(pv&&!'lrj'.includes(pv)) C('י'); V('u'); i+=2; continue; }
    if(r.startsWith('ie')){ V(i+2>=n&&!hadV?'ai':'ii'); i+=2; continue; }
    if(r==='ue'||r.startsWith('ui')){ V('u'); i+=2; continue; }
    if(/^ar(?![aeiouyr])/.test(r)){ V(pv==='w'?'o':'aa'); C('ר'); i+=2; continue; }
    if(/^(er|ir|ur)(?![aeiou])/.test(r)){ V('e'); C('ר'); i+=2; continue; }
    if(/^or(?![aeiou])/.test(r)){ V(pv==='w'?'e':'o'); C('ר'); i+=2; continue; }
    if(c==='e'&&i===n-1){ if(!hadV) V('ii'); i++; continue; }
    if((r==='le'||r==='les')&&pv&&!isV(pv)&&pv!=='l'){ V('e'); C('ל'); if(r==='les') C('ז'); break; }
    if(r==='ed'&&hadV&&pv&&!isV(pv)){ if(pv==='t'||pv==='d'){ V('e'); C('ד'); } else C('ptkfsxc'.includes(pv)||/(sh|ch)ed$/.test(w)?'ט':'ד'); break; }
    if(r==='es'&&hadV&&pv){ if(/(s|x|z|ch|sh)$/.test(w.slice(0,i))){ V('e'); C('ז'); } else C('ptkf'.includes(pv)?'ס':'ז'); break; }
    if(c==='y'){ if(i===0||(isV(nx)&&isV(pv))) C('י'); else if(i===n-1) V(hadV?'ii':'ai'); else V('i'); i++; continue; }
    if(c==='a'){ if(i===n-1&&hadV) V('A'); else if(r.startsWith('all')) V('o'); else if(r.startsWith('alk')){ V('o'); i+=2; continue; } else if(pv==='w'&&nx&&!isV(nx)) V('o'); else V('a'); i++; continue; }
    if(c==='e'){ V('e'); i++; continue; }
    if(c==='i'){ V(/^i(nd|ld)$/.test(r)?'ai':'i'); i++; continue; }
    if(c==='o'){ V('o'); i++; continue; }
    if(c==='u'){ V(nx&&!isV(nx)&&isV(w[i+2])&&i+2<n-0&&w[i+2]!=='e'?'u':'ah'); i++; continue; }
    if(c===nx){ i++; continue; }
    if(c==='c'){ C(nx&&'eiy'.includes(nx)?'ס':'ק'); i++; continue; }
    if(c==='g'){ const soft=(nx==='e'&&i===n-2)||nx==='y'||r.startsWith('gen')||(i===0&&r.startsWith('gi')); C(soft?"ג'":'ג'); i++; continue; }
    if(c==='s'){
      if(i===n-1){ if(!pv||'ptkfs'.includes(pv)) C('ס'); else if(!isV(pv)) C('ז'); else C(isV(w[i-2])||w[i-2]==='y'||pv==='y'?'ז':'ס'); }
      else C(isV(pv)&&isV(nx)?'ז':'ס');
      i++; continue; }
    if(c==='x'){ C('ק'); C('ס'); i++; continue; }
    if(c==='h'&&i===n-1&&isV(pv)){ i++; continue; }
    if(G2H_C[c]) C(G2H_C[c]);
    i++;
  }
  let s='';
  for(let k=0;k<T.length;k++){ const t=T[k], nxt=T[k+1], prv=T[k-1];
    if(t[0]==='C'){ let h=t[1]; if(k>0&&h==='ו'&&prv[0]==='V') h='וו';
      if(!nxt) s+=(G2H_FINAL[h]||h); else if(nxt[0]==='V') s+=h; else s+=h+'ְ'; }
    else { const [niq,mater]=G2H_V[t[1]]; s+=((!prv||prv[0]==='V')?'א':'')+niq+mater; }
  }
  return s;
}
/* attach a suffix sound to an existing (hand-written) base pronunciation */
function heSuffix(base, type, w){
  const UNFINAL={'ן':'נ','ם':'מ','ף':'פ'};
  let b=base; const last=b[b.length-1]; if(UNFINAL[last]) b=b.slice(0,-1)+UNFINAL[last];
  const lastCh=b[b.length-1]; const cc=lastCh.charCodeAt(0); const open='יוהא'.includes(lastCh)||(cc>=0x5B0&&cc<=0x5BB);
  const sh=open?'':'ְ';
  const stem=w.replace(/'s$/,''); const prevLetter=stem[stem.length-(type==='s'||type==='poss'?2:1)]||'';
  if(type==='s'||type==='poss'){ if(/(s|x|z|ch|sh)es$/.test(w)) return b+'ֶז'; return b+sh+('ptkf'.includes(w.replace(/'?s$/,'').slice(-1))?'ס':'ז'); }
  if(type==='past'){ const bl=w.replace(/e?d$/,'').slice(-1); if(bl==='t'||bl==='d') return b+'ֶד'; return b+sh+('pkfsx'.includes(bl)||/(sh|ch|gh|ph)e?d$/.test(w)?'ט':'ד'); }
  if(type==='ing') return b+'ִינְג';
  if(type==='ly') return b+sh+'לִי';
  if(type==='er') return b+'ֶר';
  if(type==='est') return b+'ֶסְט';
  return b;
}
if(typeof module!=='undefined') module.exports={lemmaCandidates,g2h,heSuffix};
