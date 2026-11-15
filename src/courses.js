/* Structured courses: course -> topics -> lessons -> topic quiz -> certificate.
   lesson types: words (cards + quiz + speaking), story (opens a built-in story), talk (opens a conversation) */
const COURSES = [
 { id:'a1', level:'A1', cover:'🌱', title:'אנגלית למתחילים', sub:'המילים והמשפטים הראשונים', desc:'קורס ראשון למי שמתחיל מאפס: ברכות, משפחה, אוכל, בית, מספרים ופעולות יומיומיות. כל שיעור מלווה בהקראה, הגייה בעברית ותרגול.', tags:['חדש'], topics:[
  { id:'a1-greet', icon:'👋', title:'היכרות וברכות', lessons:[
    { id:'a1-greet-1', type:'words', title:'ברכות ראשונות', words:['hello','goodbye','bye','please','thanks','sorry','yes','no','okay','welcome'] },
    { id:'a1-greet-2', type:'words', title:'להציג את עצמי', words:['name','friend','nice','meet','today','how','what','who','where','good'] },
    { id:'a1-greet-3', type:'talk', title:'שיחה: נעים להכיר', talk:'meet' } ] },
  { id:'a1-family', icon:'👨‍👩‍👧', title:'משפחה ואנשים', lessons:[
    { id:'a1-family-1', type:'words', title:'בני משפחה', words:['mother','father','brother','sister','son','daughter','baby','child','husband','wife'] },
    { id:'a1-family-2', type:'words', title:'אנשים סביבי', words:['friend','teacher','student','doctor','nurse','king','queen','man','woman','people'] },
    { id:'a1-family-3', type:'story', title:'סיפור: החתול שאהב פיצה', story:'pizza' } ] },
  { id:'a1-food', icon:'🍎', title:'אוכל ושתייה', lessons:[
    { id:'a1-food-1', type:'words', title:'בסיס השולחן', words:['bread','water','milk','coffee','tea','egg','cheese','rice','meat','salt'] },
    { id:'a1-food-2', type:'words', title:'פירות וירקות', words:['apple','banana','tomato','cucumber','carrot','potato','onion','fruit','vegetable','cake'] },
    { id:'a1-food-3', type:'talk', title:'שיחה: בבית קפה', talk:'cafe' },
    { id:'a1-food-4', type:'story', title:'סיפור: בישול ארוחת ערב', story:'pasta' } ] },
  { id:'a1-home', icon:'🏠', title:'בית וחפצים', lessons:[
    { id:'a1-home-1', type:'words', title:'חדרים וריהוט', words:['house','door','window','table','chair','bed','floor','roof','key','box'] },
    { id:'a1-home-2', type:'words', title:'חפצים יומיומיים', words:['bag','book','pen','phone','computer','clock','glass','cup','plate','bottle'] },
    { id:'a1-home-3', type:'story', title:'סיפור: ניקיון הבית', story:'cleaning' } ] },
  { id:'a1-numbers', icon:'⏰', title:'מספרים וזמן', lessons:[
    { id:'a1-numbers-1', type:'words', title:'מספרים 1–10', words:['one','two','three','four','five','six','seven','eight','nine','ten'] },
    { id:'a1-numbers-2', type:'words', title:'ימים וזמנים', words:['day','week','month','year','morning','night','today','tomorrow','yesterday','time'] },
    { id:'a1-numbers-3', type:'story', title:'סיפור: קפה של בוקר', story:'coffee' } ] },
  { id:'a1-actions', icon:'🏃', title:'פעולות יומיומיות', lessons:[
    { id:'a1-actions-1', type:'words', title:'פעולות בסיסיות', words:['eat','drink','sleep','work','read','write','walk','run','play','go'] },
    { id:'a1-actions-2', type:'words', title:'עוד פעולות', words:['come','give','take','see','hear','speak','buy','open','close','help'] },
    { id:'a1-actions-3', type:'story', title:'סיפור: טיול עם הכלב', story:'dogwalk' } ] }
 ]},
 { id:'a2', level:'A2', cover:'🌿', title:'אנגלית יומיומית', sub:'להסתדר בחנות, בנסיעה ואצל הרופא', desc:'קורס המשך: קניות, נסיעות, בריאות, מזג אוויר, רגשות ותכנון. כולל שיחות מוכנות וסיפורים קצרים מהחיים.', tags:['חדש'], topics:[
  { id:'a2-shop', icon:'🛍️', title:'קניות ובגדים', lessons:[
    { id:'a2-shop-1', type:'words', title:'לקנות ולשלם', words:['buy','sell','pay','price','cheap','expensive','money','store','market','shop'] },
    { id:'a2-shop-2', type:'words', title:'בגדים', words:['shirt','shoes','coat','dress','pants','socks','hat','size','color','jacket'] },
    { id:'a2-shop-3', type:'talk', title:'שיחה: בחנות בגדים', talk:'shop' },
    { id:'a2-shop-4', type:'story', title:'סיפור: חולצה חדשה', story:'shirt' } ] },
  { id:'a2-travel', icon:'🚆', title:'נסיעות ותחבורה', lessons:[
    { id:'a2-travel-1', type:'words', title:'תחבורה', words:['bus','train','taxi','ticket','station','airport','hotel','map','road','passport'] },
    { id:'a2-travel-2', type:'words', title:'מקומות וכיוונים', words:['travel','trip','ship','boat','bridge','city','country','street','left','right'] },
    { id:'a2-travel-3', type:'talk', title:'שיחה: שאלת דרך', talk:'way' },
    { id:'a2-travel-4', type:'story', title:'סיפור: קניית כרטיס רכבת', story:'train' } ] },
  { id:'a2-health', icon:'🩺', title:'בריאות', lessons:[
    { id:'a2-health-1', type:'words', title:'אצל הרופא', words:['doctor','hospital','medicine','fever','cough','headache','throat','stomach','tooth','head'] },
    { id:'a2-health-2', type:'words', title:'הגוף והרגשה', words:['sick','tired','hurt','sore','heart','hand','foot','leg','eye','ear'] },
    { id:'a2-health-3', type:'talk', title:'שיחה: אצל הרופא', talk:'doctor' },
    { id:'a2-health-4', type:'story', title:"סיפור: אצל הרופא", story:'clinic' } ] },
  { id:'a2-weather', icon:'☀️', title:'מזג אוויר וטבע', lessons:[
    { id:'a2-weather-1', type:'words', title:'שמיים ומזג אוויר', words:['sun','moon','star','cloud','rain','snow','wind','hot','cold','warm'] },
    { id:'a2-weather-2', type:'words', title:'עונות וטבע', words:['summer','winter','spring','autumn','tree','flower','river','lake','beach','mountain'] },
    { id:'a2-weather-3', type:'story', title:'סיפור: יום גשום', story:'rainy' },
    { id:'a2-weather-4', type:'story', title:'סיפור: יום בחוף הים', story:'beach' } ] },
  { id:'a2-feel', icon:'😊', title:'רגשות ותיאורים', lessons:[
    { id:'a2-feel-1', type:'words', title:'איך אני מרגיש', words:['happy','sad','angry','tired','hungry','thirsty','scared','proud','lonely','bored'] },
    { id:'a2-feel-2', type:'words', title:'לתאר דברים', words:['big','small','tall','short','long','young','old','new','beautiful','ugly'] },
    { id:'a2-feel-3', type:'talk', title:'שיחה: איך היה היום', talk:'day' } ] },
  { id:'a2-work', icon:'💼', title:'עבודה ותכנונים', lessons:[
    { id:'a2-work-1', type:'words', title:'בעבודה', words:['work','job','office','meeting','team','project','idea','problem','plan','busy'] },
    { id:'a2-work-2', type:'words', title:'ימי השבוע', words:['monday','tuesday','wednesday','thursday','saturday','sunday','weekend','week','holiday','birthday'] },
    { id:'a2-work-3', type:'story', title:'סיפור: שיחת טלפון', story:'phonecall' },
    { id:'a2-work-4', type:'story', title:'סיפור: בחדר הכושר', story:'gym' } ] }
 ]},
 { id:'b1', level:'B1', cover:'🌳', title:'סיפורים אמיתיים', sub:'קריאה בשטף מסיפורים שקרו באמת', desc:'שני נושאים של סיפורים אמיתיים וארוכים יותר, עם אוצר מילים מתקדם מכל סיפור ומבחן בסוף כל נושא. מתאים אחרי הקורסים הקודמים.', tags:[], topics:[
  { id:'b1-real1', icon:'📰', title:'סיפורים מפתיעים', lessons:[
    { id:'b1-real1-1', type:'story', title:'הכלב שחיכה', story:'hachiko' },
    { id:'b1-real1-2', type:'story', title:'דבש אף פעם לא מתקלקל', story:'honey' },
    { id:'b1-real1-3', type:'story', title:'הילד שהמציא את הארטיק', story:'popsicle' },
    { id:'b1-real1-4', type:'words', title:'מילים מתקדמות מהסיפורים', fromStories:['hachiko','honey','popsicle'], count:10 } ] },
  { id:'b1-real2', icon:'🌍', title:'אנשים שלא ויתרו', lessons:[
    { id:'b1-real2-1', type:'story', title:'מייל בארבע דקות', story:'mile' },
    { id:'b1-real2-2', type:'story', title:'הטעות המוצלחת שהצילה מיליונים', story:'penicillin' },
    { id:'b1-real2-3', type:'story', title:'הנער שתפס את הרוח', story:'windmill' },
    { id:'b1-real2-4', type:'words', title:'מילים מתקדמות מהסיפורים', fromStories:['mile','penicillin','windmill'], count:10 } ] }
 ]}
];
COURSES.forEach(c=>{ c.lessonCount=c.topics.reduce((a,t)=>a+t.lessons.length,0); c.minutes=c.topics.reduce((a,t)=>a+t.lessons.reduce((b,l)=>b+(l.type==='story'?6:l.type==='talk'?5:7),0)+4,0); });
