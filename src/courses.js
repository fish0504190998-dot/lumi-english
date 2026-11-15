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

/* ---- rich lessons: dialogue -> rule (in Hebrew) -> vocab in phrases -> mixed exercises. Correct answer is always o[0]; options are shuffled when shown ---- */
const CH=(q,o,x)=>({t:'choose',q,o,x});
const FL=(en,o,he,x)=>({t:'fill',en,o,he,x});
const LI=(en,o)=>({t:'listen',en,o});
const OR=(he,words,en)=>({t:'order',he,words,en});
const TY=(he,ans,x)=>({t:'type',he,ans,x});
const SP=(en)=>({t:'speak',en});
COURSES.unshift({ id:'a1u', level:'A1', cover:'🌟', title:'A1 · מסלול מובנה (יחידה 1)', sub:'שלום, אני… נעים להכיר', desc:'יחידה ראשונה במסלול החדש: דיאלוג, הסבר קצר בעברית על כלל אחד, מילים בתוך משפטים, תרגילים מגוונים (בחירה, השלמה, סידור משפט, הקלדה, האזנה ודיבור) ומבחן יחידה. לומדים לפי הסדר.', tags:['חדש'], topics:[
 { id:'a1u-u1', icon:'👋', title:'יחידה 1: היכרות', goal:'בסוף היחידה תוכלו להציג את עצמכם, לשאול "מה שמך?" ו"מאיפה אתה?", ולהציג חבר.', lessons:[
  { id:'a1u-u1-1', type:'rich', title:'שלום ולהתראות', dialogue:[['Dan','Hello!','שלום!'],['Maya','Hi! Good morning.','היי! בוקר טוב.'],['Dan','Good morning.','בוקר טוב.'],['Maya','Goodbye, Dan.','להתראות, דן.'],['Dan','Bye, Maya!','ביי, מאיה!']],
    rule:{title:'ברכות לפי שעות היום', he:'Hello היא הברכה הרגילה בכל שעה, ו־Hi קלילה וחברית. Good morning אומרים עד הצהריים, Good evening בערב, ו־Good night רק כשנפרדים לפני השינה. Goodbye ו־Bye הן "להתראות".', ex:[['Hello!','שלום!'],['Good morning!','בוקר טוב!'],['Good night!','לילה טוב!']], pit:'Good night היא ברכת פרידה בערב, לא ברכת פגישה. כשנפגשים בערב אומרים Good evening.'},
    vocab:[['hello','שלום','הֶלוֹ'],['hi','היי','האי'],['goodbye','להתראות','גוּד־בַּאי'],['bye','ביי','באי'],['good morning','בוקר טוב','גוּד מוֹרנינג'],['good evening','ערב טוב','גוּד אִיבנינג'],['good night','לילה טוב','גוּד נַאיט'],['please','בבקשה','פְּלִיז'],['thank you','תודה','תֶנְק יוּ'],['sorry','סליחה','סוֹרי']],
    ex:[CH('איך אומרים "ערב טוב" באנגלית?',['Good evening','Good morning','Good night']),CH('אתם הולכים לישון. מה אומרים?',['Good night','Good morning','Hello']),LI('Good morning',['Good morning','Good evening','Goodbye']),FL('___ morning, Dan!',['Good','Hi','Bye'],'בוקר טוב, דן!'),OR('בוקר טוב',['morning','Good'],'Good morning'),OR('להתראות, דן',['Goodbye','Dan'],'Goodbye Dan'),TY('תודה',['thank you','thanks']),TY('שלום',['hello','hi']),CH('מה פירוש Sorry?',['סליחה','בבקשה','תודה']),SP('Good morning, Dan')] },
  { id:'a1u-u1-2', type:'rich', title:'I am… (אני…)', dialogue:[['Dan','Hello! I am Dan.','שלום! אני דן.'],['Maya','Hi! I am Maya.','היי! אני מאיה.'],['Dan','I am happy.','אני שמח.'],['Maya',"I'm happy too.",'גם אני שמחה.'],['Dan','I am a student.','אני סטודנט.'],['Maya','I am a teacher.','אני מורה.']],
    rule:{title:'הפועל am: חובה באנגלית', he:'בעברית אומרים "אני דן" בלי פועל. באנגלית כל משפט צריך פועל, ולכן אומרים I am Dan. am הוא הצורה של to be עם I. בדיבור מקצרים: I am = I\'m.', ex:[['I am Dan.','אני דן.'],["I'm happy.",'אני שמח.'],['I am a student.','אני סטודנט.']], pit:'הטעות הנפוצה ביותר של דוברי עברית: "I Dan" או "I happy". חסר am!'},
    vocab:[['I','אני','אַי'],['am','(אני) הוא/נמצא','אֶם'],['happy','שמח','הֶפִּי'],['tired','עייף','טַיירְד'],['hungry','רעב','הַנְגְרִי'],['student','סטודנט','סטיוּדנְט'],['teacher','מורה','טִיצ׳ר'],['doctor','רופא','דוֹקְטֶר'],['too','גם','טוּ'],['yes','כן','יֶס']],
    ex:[FL('I ___ Dan.',['am','is','are'],'אני דן'),FL('I ___ happy.',['am','is','are'],'אני שמח'),FL('I ___ a teacher.',['am','is','are'],'אני מורה'),CH('איזה משפט נכון?',['I am tired.','I tired.','I are tired.']),CH('מה פירוש "I am hungry"?',['אני רעב','אני עייף','אני שמח']),OR('אני דן',['I','am','Dan'],'I am Dan'),OR('אני שמח',['I','am','happy','is'],'I am happy'),OR('אני סטודנט',['I','am','a','student'],'I am a student'),TY('אני עייף',['i am tired',"i'm tired"]),TY('אני רופא',['i am a doctor',"i'm a doctor"],'שימו לב: לפני מקצוע באנגלית מוסיפים a.'),LI('I am a teacher',['I am a teacher','I am a student','I am a doctor']),SP('I am happy')] },
  { id:'a1u-u1-3', type:'rich', title:'My name is… (שמי…)', dialogue:[['Maya','Hello! What is your name?','שלום! מה שמך?'],['Dan','My name is Dan. And you?','שמי דן. ואת?'],['Maya','My name is Maya.','שמי מאיה.'],['Dan','Nice to meet you, Maya.','נעים להכיר, מאיה.'],['Maya','Nice to meet you too.','גם לי נעים.']],
    rule:{title:'my / your ושאלת השם', he:'my = שלי, your = שלך. אומרים My name is Dan (שמי דן) ושואלים What is your name? (מה שמך?). בשאלה הפועל is בא אחרי What.', ex:[['My name is Dan.','שמי דן.'],['What is your name?','מה שמך?'],['Nice to meet you.','נעים להכיר.']], pit:'לא אומרים "What your name?". בעברית אין פועל כאן, אבל באנגלית חייבים: What is your name?'},
    vocab:[['name','שם','נֵיים'],['my','שלי','מַאי'],['your','שלך','יוֹר'],['what','מה','וָואט'],['and','ו','אֶנְד'],['you','אתה/את','יוּ'],['nice','נעים/נחמד','נַאיס'],['meet','לפגוש','מִיט'],['friend','חבר','פְרֶנְד'],['new','חדש','נְיוּ']],
    ex:[CH('איך שואלים "מה שמך?"',['What is your name?','What your name?','Your name what is?']),FL('My ___ is Maya.',['name','you','am'],'שמי מאיה'),FL('What is ___ name?',['your','you','I'],'מה שמך?'),FL('Nice to ___ you.',['meet','name','happy'],'נעים להכיר'),OR('שמי דן',['My','name','is','Dan'],'My name is Dan'),OR('מה שמך',['What','is','your','name'],'What is your name'),TY('נעים להכיר',['nice to meet you']),TY('שמי מאיה',['my name is maya']),LI('Nice to meet you',['Nice to meet you','Nice to see you','Nice name']),CH('מה פירוש "my"?',['שלי','שלך','אני']),SP('My name is Dan')] },
  { id:'a1u-u1-4', type:'rich', title:'You, he, she (אתה, הוא, היא)', dialogue:[['Dan','You are Maya.','את מאיה.'],['Maya','Yes, I am.','כן, נכון.'],['Maya','He is Tom. He is my friend.','הוא טום. הוא חבר שלי.'],['Dan','And she is Anna. She is a teacher.','והיא אנה. היא מורה.'],['Maya','Yes, she is.','כן, נכון.']],
    rule:{title:'to be: I am, you are, he is, she is', he:'I am, you are, he is, she is. he = הוא, she = היא. המילה you משמשת לאתה, לאת ולאתם. בעברית אין is/are בהווה, באנגלית הם חובה.', ex:[['You are Maya.','את מאיה.'],['He is Tom.','הוא טום.'],['She is a teacher.','היא מורה.']], pit:'לא "She happy" אלא "She is happy". וגם לא "he are": ל־he ול־she אומרים is.'},
    vocab:[['he','הוא','הִי'],['she','היא','שִי'],['is','הוא/היא נמצא','אִיז'],['are','אתה/הם נמצאים','אר'],['man','גבר','מֶן'],['woman','אישה','וּוּמֶן'],['boy','ילד','בּוֹי'],['girl','ילדה','גֶרְל'],['brother','אח','בְּרָאדֶר'],['sister','אחות','סִיסְטֶר']],
    ex:[FL('He ___ Tom.',['is','am','are'],'הוא טום'),FL('She ___ a teacher.',['is','am','are'],'היא מורה'),FL('You ___ Maya.',['are','is','am'],'את מאיה'),FL('I ___ Dan.',['am','is','are'],'אני דן'),CH('איזה משפט נכון?',['She is happy.','She happy.','She are happy.']),CH('איזה משפט נכון?',['He is a doctor.','He are a doctor.','He a doctor.']),OR('היא מורה',['She','is','a','teacher','are'],'She is a teacher'),OR('הוא חבר שלי',['He','is','my','friend'],'He is my friend'),TY('את מאיה',['you are maya']),TY('הוא שמח',['he is happy']),LI('She is a girl',['She is a girl','He is a boy','She is a woman']),SP('He is my friend')] },
  { id:'a1u-u1-5', type:'rich', title:'Where are you from? (מאיפה אתה?)', dialogue:[['Maya','Where are you from?','מאיפה אתה?'],['Dan','I am from Israel. And you?','אני מישראל. ואת?'],['Maya','I am from Spain.','אני מספרד.'],['Dan','Spain is nice.','ספרד יפה.'],['Maya','Thank you!','תודה!']],
    rule:{title:'from = מ… (מאיפה אתה?)', he:'שואלים Where are you from? (מאיפה אתה?) ועונים I am from + מקום. המילה from מחליפה את האות מ־ בעברית: "אני מישראל" = I am from Israel.', ex:[['Where are you from?','מאיפה אתה?'],['I am from Israel.','אני מישראל.'],["I'm from Spain.",'אני מספרד.']], pit:'בעברית אומרים "מאיפה אתה" בלי פועל. באנגלית צריך are: Where are you from?'},
    vocab:[['where','איפה','וָור'],['from','מ־','פְרוֹם'],['Israel','ישראל','אִיזְרִיאֶל'],['Spain','ספרד','ספֵּיין'],['France','צרפת','פְרַאנְס'],['Italy','איטליה','אִיטְלִי'],['England','אנגליה','אִינְגְלֶנְד'],['America','אמריקה','אֲמֶרִיקָה'],['Germany','גרמניה','גֶ׳רְמָנִי'],['country','מדינה','קַאנְטְרִי']],
    ex:[CH('איך שואלים "מאיפה אתה?"',['Where are you from?','Where you from?','What are you from?']),FL('I am ___ Israel.',['from','in','to'],'אני מישראל'),FL('Where ___ you from?',['are','is','am'],'מאיפה אתה?'),FL('She ___ from Spain.',['is','are','am'],'היא מספרד'),OR('אני מישראל',['I','am','from','Israel'],'I am from Israel'),OR('מאיפה אתה',['Where','are','you','from'],'Where are you from'),OR('היא מצרפת',['She','is','from','France'],'She is from France'),TY('אני מישראל',['i am from israel',"i'm from israel"]),TY('איפה',['where']),LI('I am from Italy',['I am from Italy','I am from Spain','I am from France']),CH('מה פירוש "country"?',['מדינה','עיר','שם']),SP('I am from Israel')] }
 ]}
]});
/* explanations (why right / why wrong) and copy-writing practice */
const RICH_X={"a1u-u1-1": ["Good evening = ערב טוב. Good morning היא בוקר טוב, ו־Good night היא ברכת פרידה לפני השינה, לא ברכה לערב.", "Good night אומרים כשנפרדים לפני השינה. Good morning היא ברכה של בוקר, ו־Hello היא ברכת פגישה ולא פרידה.", "Good morning = בוקר טוב. Good evening נשמעת אחרת ('איבנינג') ו־Goodbye היא פרידה, לא ברכה של בוקר.", "Good morning = בוקר טוב. אי אפשר לומר 'Hi morning' או 'Bye morning': רק Good מתחברת ל־morning.", "בעברית אומרים 'בוקר טוב', באנגלית הסדר הפוך: קודם Good ואז morning.", "קודם הברכה Goodbye ואז השם: Goodbye, Dan. הפסיק לא משנה את סדר המילים.", "Thank you או Thanks (הקצרה והקלילה): שתיהן נכונות.", "Hello או Hi: שתיהן נכונות. Hello רשמית יותר, Hi קלילה.", "Sorry = סליחה או מצטער. Please = בבקשה, ו־Thank you = תודה.", "לחצו על הרמקול, הקשיבו וחזרו אחרי הקול. Good נשמעת 'גוּד' ו־morning נשמעת 'מוֹרנינג'."], "a1u-u1-2": ["עם I תמיד משתמשים ב־am. is שייך ל־he/she, ו־are שייך ל־you.", "אחרי I בא am גם לפני תואר (happy). בעברית אין פועל כאן, באנגלית הוא חובה.", "am + a + מקצוע: I am a teacher. is ו־are לא מתאימים ל־I.", "I am tired נכון. 'I tired' חסר את הפועל am, ו־'I are' משתמש בפועל של you.", "hungry = רעב. tired = עייף ו־happy = שמח.", "I + am + שם. בלי am המשפט חסר פועל ולא נכון באנגלית.", "am הולך עם I, ו־is שייך ל־he/she. לכן is נשאר בחוץ.", "a student: a בא לפני שם עצם בודד (סטודנט אחד). בלי a זה לא נשמע טבעי.", "I am tired או I'm tired. I'm הוא קיצור של I am בדיבור.", "אחרי am מוסיפים a לפני מקצוע: I am a doctor. בעברית אומרים 'אני רופא' בלי מילית כזו.", "שימו לב למילה האחרונה: teacher = מורה, student = סטודנט, doctor = רופא. היא מכריעה.", "am נשמע קצר: 'אֶם'. הקשיבו וחזרו אחרי הקול."], "a1u-u1-3": ["בשאלה צריך is: What is your name? בלי is המשפט לא נכון באנגלית, והסדר האחרון הפוך.", "My name is Maya: name = שם. you ו־am לא נותנים משפט נכון.", "your = שלך. you = אתה/את ואינו מתחבר ל־name, ו־I = אני.", "to meet = לפגוש. Nice to meet you = נעים להכיר. name ו־happy לא מתאימות כאן.", "my + name + is + שם: שמי דן.", "בשאלה is בא אחרי What, ו־your בא לפני name.", "Nice to meet you = נעים להכיר. meet = לפגוש.", "My name is Maya: השם בא אחרי is, בלי פועל נוסף.", "Nice to meet you = נעים להכיר. Nice to see you = נעים לראות אותך (כשכבר מכירים), ו־Nice name = שם נחמד.", "my = שלי. your = שלך ו־I = אני.", "אומרים את המשפט בשטף: 'מַאי נֵיים איז דן'. הקשיבו וחזרו."], "a1u-u1-4": ["he + is. am הוא ל־I ו־are ל־you.", "she + is. כמו he, גם she לוקחת is.", "you + are, תמיד, גם כשמדברים אל אישה אחת.", "I + am. הצורה לא משתנה.", "'She happy' חסר is ו־'She are' משתמש בפועל לא נכון. רק She is happy נכון.", "He is a doctor. 'He are' שגוי כי he לוקח is, ו־'He a doctor' חסר פועל.", "She is a teacher: are נשאר בחוץ כי הוא ל־you/we/they.", "he + is + my + friend: הוא חבר שלי.", "You are Maya: גם לאישה אומרים you are.", "he is happy: הפועל is חייב להופיע בין he ל־happy.", "girl = ילדה, boy = ילד, woman = אישה. she = היא, ולכן She is a girl.", "he is נשמע מחובר: 'הִי איז'. הקשיבו וחזרו."], "a1u-u1-5": ["השאלה: Where are you from? are בא אחרי Where. 'Where you from?' נשמע בדיבור אבל אינו תקני, ו־What שואל 'מה' ולא 'איפה'.", "from = מ… . in = ב… ו־to = אל, ולכן הן לא מתאימות ל'אני מישראל'.", "אחרי Where בא הפועל are, ורק אחריו you.", "she + is, ולכן She is from Spain.", "I + am + from + מקום.", "בשאלה are לפני you: Where are you from.", "she + is: She is from France.", "I am from Israel או I'm from Israel.", "where = איפה. אפשר גם Where? לבד.", "Italy נשמעת 'אִיטלי'. Spain ו־France נשמעות אחרת.", "country = מדינה. city = עיר ו־name = שם.", "I am from Israel: 'אַי אֶם פְרוֹם אִיזְרִיאֶל'. הקשיבו וחזרו."]};
const RICH_CP={"a1u-u1-1": [["Good morning, Dan!", "בוקר טוב, דן!"], ["Hello! Good evening.", "שלום! ערב טוב."], ["Goodbye, Maya.", "להתראות, מאיה."]], "a1u-u1-2": [["I am Dan.", "אני דן."], ["I'm happy.", "אני שמח."], ["I am a student.", "אני סטודנט."]], "a1u-u1-3": [["My name is Maya.", "שמי מאיה."], ["What is your name?", "מה שמך?"], ["Nice to meet you.", "נעים להכיר."]], "a1u-u1-4": [["He is my friend.", "הוא חבר שלי."], ["She is a teacher.", "היא מורה."], ["You are Maya.", "את מאיה."]], "a1u-u1-5": [["Where are you from?", "מאיפה אתה?"], ["I am from Israel.", "אני מישראל."], ["She is from France.", "היא מצרפת."]]};
COURSES.filter(c=>c.id==='a1u').forEach(c=>c.topics.forEach(t=>t.lessons.forEach(l=>{ l.ex.forEach((e,i)=>{ if(RICH_X[l.id]&&RICH_X[l.id][i]) e.x=RICH_X[l.id][i]; });
  l.ex.unshift(...(RICH_CP[l.id]||[]).map(([en,he])=>({t:'copy',en,he,ans:[en],x:'העתיקו בדיוק: אות גדולה בתחילת המשפט ונקודה או סימן בסוף. כתיבה ידנית של משפט עוזרת לזכור את האיות ואת סדר המילים.'}))); })));
COURSES.forEach(c=>{ c.lessonCount=c.topics.reduce((a,t)=>a+t.lessons.length,0); c.minutes=c.topics.reduce((a,t)=>a+t.lessons.reduce((b,l)=>b+(l.type==='story'?6:l.type==='talk'?5:l.type==='rich'?12:7),0)+4,0); });
