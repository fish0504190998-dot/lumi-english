/* Unit content for the 16 video lessons (units 0-15): the learning loop around each video.
   BEFORE (before.learn: 3 bullets, before.meet: 5 key words) -> VIDEO -> AFTER (words: 8-10 words with an example sentence,
   ex: 10 exercises, quiz: 5 questions with a "למה?" explanation) -> RECAP (recap.bullets, recap.rule, recap.say).
   Built from the lesson specs in english-videos/unitNN/spec.mjs: same rules, same example sentences, same Hebrew wording.
   Exercise objects have the exact shape the 'rich' lesson runner (ExItem / ExerciseRunner in app.jsx) expects:
     choose {t,q,o,x}  fill {t,en,o,he,x}  listen {t,en,o,x}  order {t,he,words,en,x}  type {t,he,ans,x}  copy {t,en,he,ans,x}  speak {t,en}
   (o[0] is always the correct option; the runner shuffles the options. x = the Hebrew "למה?" explanation.)
   Globals defined here: UNIT_CONTENT, UNIT_STAGES, UNIT_REVIEWS, STAGE_TESTS. Plain data, no JSX. Hebrew display text is unpointed. */
const UNIT_CONTENT = (() => {
 const ch=(q,o,x)=>({t:'choose',q,o,x});
 const fl=(en,o,he,x)=>({t:'fill',en,o,he,x});
 const li=(en,o,x)=>({t:'listen',en,o,x});
 const or=(he,words,en,x)=>({t:'order',he,words,en,x});
 const ty=(he,ans,x)=>({t:'type',he,ans,x});
 const cp=(en,he,x)=>({t:'copy',en,he,ans:[en],x});
 const sp=(en)=>({t:'speak',en});
 const w=(en,he,ex,exHe,tr)=>tr?{en,he,ex,exHe,tr}:{en,he,ex,exHe};
 const wb=(en,base,he,ex,exHe)=>({en,he,ex,exHe,base});
 const U={};
 const unit=(n,o)=>{ U[n]=Object.assign({n},o); };

/* ================= יחידה 0 ================= */
unit(0,{ stage:0, title:'קוראים אנגלית', promise:'תדע לקרוא בקול מילים קצרות ופשוטות באנגלית, בלי תעתיק',
 videoMins:8, practiceMins:10,
 before:{
  learn:['לקרוא באנגלית משמאל לימין, ולהבדיל בין שם האות לבין הצליל שלה','להכיר את חמש התנועות a e i o u ואת הצליל הקצר שלהן במילים כמו bus ו־ten','לזהות את e השקטה בסוף מילה (make, home) ואת הצירופים sh, ch, th, wh'],
  meet:[['bus','אוטובוס'],['ten','עשר'],['six','שש'],['home','בית'],['what','מה']] },
 words:[
  w('bus','אוטובוס','The word is bus.','קוראים: באס. פירוש: אוטובוס.','באס'),
  w('ten','עשר','The word is ten.','קוראים: טן. פירוש: עשר.','טן'),
  w('six','שש','The word is six.','קוראים: סיקס. פירוש: שש.','סיקס'),
  w('can','יכול','The word is can.','קוראים: קן. פירוש: יכול.','קן'),
  w('help','עזרה','The word is help.','קוראים: הלפ. פירוש: עזרה.','הלפ'),
  w('desk','שולחן כתיבה','The word is desk.','קוראים: דסק. פירוש: שולחן כתיבה.','דסק'),
  w('home','בית','The word is home.','קוראים: הום. פירוש: בית.','הום'),
  w('make','להכין','The word is make.','קוראים: מייק. פירוש: להכין.','מייק'),
  w('she','היא','The word is she.','קוראים: שי. פירוש: היא.','שי'),
  w('what','מה','The word is what.','קוראים: וואט. פירוש: מה.','וואט') ],
 ex:[
  ch('באיזה כיוון קוראים באנגלית?',['משמאל לימין','מימין לשמאל'],'באנגלית קוראים משמאל לימין, הפוך מהעברית. העין מתחילה בצד השמאלי של המילה וזזה ימינה, אות אחרי אות.'),
  ch('איך נשמעת האות b במילה bus?',['כמו ב בבית','כמו ד בדלת','כמו פ בפה'],'האות b נשמעת כמו ב בבית. שם האות הוא "בי", אבל בתוך מילה שומעים רק את הצליל.'),
  ch('איך קוראים את המילה bus?',['באס','בוס'],'האות u במילה קצרה נשמעת כמו פתח, לכן קוראים "באס". כדי לקרוא מחברים צלילים, לא שמות של אותיות.'),
  ch('מה קורה לאות e בסוף מילה כמו make?',['היא שקטה, והתנועה שלפניה אומרת את שמה','היא נשמעת "אי" חזקה','היא נשמעת כמו "א" קצרה'],'e בסוף המילה שקטה. התנועה שלפניה (a ב־make) אומרת את שמה, ולכן קוראים "מייק".'),
  ch('איך קוראים את הצירוף sh במילה she?',['כמו ש','כמו צ׳','כמו ס'],'שתי האותיות sh יוצרות יחד צליל אחד: ש. לכן she נקראת "שי".'),
  li('The word is home.',['The word is home.','The word is make.','The word is help.'],'home נשמעת "הום". האות o אומרת את שמה כי יש e שקטה בסוף, וה־h בהתחלה נשמעת כמו ה.'),
  ty('מה (קוראים: וואט)',['what'],'wh נשמע כמו וו והאות h שקטה, לכן what נקראת "וואט". האיות: w, h, a, t.'),
  ty('עשר (קוראים: טן)',['ten'],'ten נקראת "טן". האות e באמצע מילה קצרה נשמעת כמו סגול.'),
  cp('The word is bus.','המילה היא אוטובוס.','העתיקו בדיוק. שימו לב: אות גדולה בתחילת המשפט ונקודה בסופו, ו־bus נכתבת באותיות קטנות.'),
  sp('The word is she.') ],
 quiz:[
  ch('איך קוראים את המילה ten?',['טן','טין'],'האות e במילה קצרה נשמעת כמו סגול, ולכן קוראים "טן". "טין" הוא צליל אחר.'),
  ch('באיזו מילה e שקטה בסוף?',['make','ten','desk'],'ב־make ה־e בסוף שקטה, והתנועה a אומרת את שמה. ב־ten וב־desk ה־e באמצע המילה ונשמעת קצר.'),
  ch('מה ההבדל בין שם האות לצליל שלה?',['לכל אות יש שם, ובתוך מילה שומעים את הצליל','אין הבדל, האות נשמעת כמו שמה','רק לתנועות יש שם'],'לכל אות יש שם (b היא "בי") וצליל (ב). כדי לקרוא מחברים צלילים, לא שמות.'),
  ch('איך קוראים sh?',['ש','צ׳','ת׳'],'sh הוא צליל אחד: ש. ch הוא צ׳ ו־th הוא ת׳ רפה עם הלשון בין השיניים.'),
  ch('אילו אותיות הן חמש התנועות באנגלית?',['a e i o u','b d f g h','s h c t w'],'חמש התנועות הן a e i o u. שאר האותיות הן עיצורים.') ],
 recap:{
  bullets:['קוראים באנגלית משמאל לימין, ומחברים צלילים ולא שמות של אותיות','חמש התנועות הן a e i o u, ובמילה קצרה יש להן צליל קצר, כמו ב־bus וב־ten','e שקטה בסוף המילה (make, home), והצירופים sh, ch, th, wh יוצרים צליל אחד'],
  rule:'קוראים צלילים ולא שמות: b במילה bus נשמעת "ב", ו־e בסוף המילה שקטה.',
  say:[['The word is bus.','המילה היא אוטובוס.'],['The word is home.','המילה היא בית.'],['The word is she.','המילה היא "היא".']] } });

/* ================= יחידה 1 ================= */
unit(1,{ stage:1, title:'שלום, אני אורי', promise:'תדע להגיד שלום, להציג את עצמך ולשאול מאיפה אתה',
 videoMins:7, practiceMins:12,
 before:{
  learn:['להגיד שלום ולשאול "מה שלומך?": Hello! How are you?','להציג את עצמך ולשאול מאיפה אתה: I am Uri. Where are you from?','הכלל הראשון: באנגלית תמיד צריך פועל (I am, you are, he is, she is)'],
  meet:[['hello','שלום'],['fine','בסדר'],['friend','חבר'],['from','מ־'],['happy','שמח']] },
 words:[
  w('hello','שלום','Hello! How are you?','שלום! מה שלומך?'),
  w('fine','בסדר, טוב','I am fine, thank you.','אני בסדר, תודה.'),
  w('thank you','תודה','I am fine, thank you.','אני בסדר, תודה.'),
  w('nice to meet you','נעים להכיר','Nice to meet you.','נעים להכיר.'),
  w('where','איפה','Where are you from?','מאיפה אתה?'),
  w('from','מ־','I am from Israel.','אני מישראל.'),
  w('friend','חבר','He is my friend.','הוא חבר שלי.'),
  w('teacher','מורה','She is a teacher.','היא מורה.'),
  w('happy','שמח','I am happy.','אני שמח.'),
  w('student','סטודנט','I am a student.','אני סטודנט.') ],
 ex:[
  ch('איך שואלים "מה שלומך?" באנגלית?',['How are you?','Where are you from?','Nice to meet you.'],'How are you? פירושו "מה שלומך?". Where are you from? שואלת מאיפה אתה, ו־Nice to meet you היא "נעים להכיר".'),
  fl('I ___ Uri.',['am','is','are'],'אני אורי','עם I תמיד משתמשים ב־am. בעברית אין פועל כאן, אבל באנגלית הוא חובה.'),
  fl('She ___ a teacher.',['is','am','are'],'היא מורה','עם she תמיד בא is. לא "She teacher" וגם לא "She are".'),
  fl('You ___ David.',['are','is','am'],'אתה דוד','עם you תמיד בא are, גם כשמדברים אל אדם אחד.'),
  li('I am from Israel.',['I am from Israel.','I am fine, thank you.','He is my friend.'],'I am from Israel פירושו "אני מישראל". from מחליפה את האות מ־ בעברית.'),
  or('הוא חבר שלי',['He','is','my','friend'],'He is my friend.','he + is + my + friend. הוא חבר שלי: הפועל is חייב להופיע אחרי he.'),
  or('מאיפה אתה?',['Where','are','you','from'],'Where are you from?','בשאלה are בא אחרי Where, ורק אחריו you.'),
  ty('אני שמח',['I am happy.',"I'm happy."],'I am happy. אפשר גם בקיצור I\'m happy. חובה לכתוב את am, אחרת המשפט חסר פועל.'),
  cp('Nice to meet you.','נעים להכיר.','העתיקו בדיוק: אות גדולה בתחילת המשפט ונקודה בסוף. Nice to meet you היא ברכה שאומרים כשפוגשים אדם בפעם הראשונה.'),
  sp('Hello! How are you?') ],
 quiz:[
  ch('איזה משפט נכון?',['I am happy.','I happy.','I are happy.'],'חייבים פועל, ועם I הפועל הוא am. "I happy" חסר פועל, ו־are שייך ל־you.'),
  ch('איזה משפט נכון?',['She is happy.','She happy.','She are happy.'],'עם she בא is. בעברית אין פועל בהווה, אבל באנגלית הוא חובה.'),
  fl('How ___ you?',['are','is','am'],'מה שלומך?','אחרי you בא are, גם בשאלה. How are you?'),
  ch('מה פירוש Where are you from?',['מאיפה אתה?','מה שלומך?','נעים להכיר.'],'where פירושו "איפה", ו־from פירושו "מ־". יחד: מאיפה אתה?'),
  ch('איזה פועל מתאים ל־he?',['is','am','are'],'he, she ו־it לוקחים is. I לוקח am, ו־you לוקח are.') ],
 recap:{
  bullets:['אמרת שלום ושאלת מה שלומך: Hello! How are you?','הצגת את עצמך ושאלת מאיפה אתה: I am Uri. Where are you from?','למדת שאחרי I בא am, אחרי he ו־she בא is, ואחרי you בא are'],
  rule:'באנגלית תמיד צריך פועל: I am, you are, he is, she is.',
  say:[['I am Uri.','אני אורי.'],['Where are you from?','מאיפה אתה?'],['I am from Israel.','אני מישראל.']] } });

/* ================= יחידה 2 ================= */
unit(2,{ stage:1, title:'המשפחה והעבודה שלי', promise:'תדע לספר מי בני המשפחה שלך ומה המקצוע שלהם',
 videoMins:10, practiceMins:12,
 before:{
  learn:['להגיד של מי זה: my, his, her, your (My name is Uri. His name is Dan.)','לספר על המשפחה: This is my brother. My father is a doctor.','לומר מה המקצוע: a לפני עיצור ו־an לפני צליל של תנועה (a teacher, an engineer)'],
  meet:[['brother','אח'],['father','אבא'],['name','שם'],['engineer','מהנדס'],['driver','נהג']] },
 words:[
  w('my','שלי','My name is Uri.','השם שלי אורי.'),
  w('your','שלך','Your name is David.','השם שלך דוד.'),
  w('his','שלו','His name is Dan.','השם שלו דן.'),
  w('her','שלה','Her name is Sara.','השם שלה שרה.'),
  w('name','שם','His name is Dan.','השם שלו דן.'),
  w('brother','אח','This is my brother.','זה אח שלי.'),
  w('father','אבא','My father is a doctor.','אבא שלי רופא.'),
  w('doctor','רופא','He is a doctor.','הוא רופא.'),
  w('driver','נהג','He is a driver.','הוא נהג.'),
  w('engineer','מהנדס','I am an engineer.','אני מהנדס.') ],
 ex:[
  ch('איך אומרים "השם שלי אורי"?',['My name is Uri.','I name is Uri.','Name my is Uri.'],'כדי להגיד של מי זה צריך my, לא I. ו־my בא לפני השם: My name is Uri.'),
  fl('___ name is Dan.',['His','He','Her'],'השם שלו דן','his פירושו "שלו". he פירושו "הוא" ו־her פירושו "שלה".'),
  fl('This is ___ brother.',['my','I','am'],'זה אח שלי','my פירושו "שלי" ובא לפני שם העצם. I הוא "אני" ואינו מתאים כאן.'),
  fl('I am ___ engineer.',['an','a'],'אני מהנדס','engineer מתחיל בצליל של תנועה (אי), ולכן משתמשים ב־an.'),
  sp('My name is Uri.'),
  li('My father is a doctor.',['My father is a doctor.','His father is a driver.','My brother is an engineer.'],'My father is a doctor פירושו "אבא שלי רופא". my פירושו שלי, ו־his פירושו שלו.'),
  or('השם שלו דן',['His','name','is','Dan'],'His name is Dan.','his בא לפני name, ואחריהם is ואז השם. באנגלית "שלו" בא לפני, בניגוד לעברית.'),
  or('אני מהנדס',['I','am','an','engineer'],'I am an engineer.','I + am + an + מקצוע. לפני engineer צריך an, כי הוא מתחיל בתנועה.'),
  ty('אני מורה',['I am a teacher.',"I'm a teacher."],'לפני מקצוע חייבים a או an. teacher מתחיל בעיצור, לכן a teacher.'),
  cp('This is my brother.','זה אח שלי.','העתיקו בדיוק. שימו לב: my בא לפני brother, ובסוף יש נקודה.') ],
 quiz:[
  ch('איזה משפט נכון?',['I am an engineer.','I am a engineer.','I am engineer.'],'חייבים a או an לפני מקצוע. engineer מתחיל בצליל של תנועה, לכן an.'),
  ch('איזה משפט נכון?',['My name is Uri.','I name is Uri.'],'I הוא "אני" עצמו. כדי להגיד "השם שלי" צריך my.'),
  fl('___ name is Sara.',['Her','His','My'],'השם שלה שרה','her פירושו "שלה" ובשימוש עם she. his הוא "שלו" ו־my הוא "שלי".'),
  ch('איזה משפט נכון?',['He is a teacher.','He is teacher.'],'חסרה המילה a לפני המקצוע. באנגלית אי אפשר להגיד מקצוע בלי a או an.'),
  ch('מה פירוש his?',['שלו','שלה','שלך'],'his = שלו, her = שלה, your = שלך, my = שלי.') ],
 recap:{
  bullets:['אמרת של מי זה: My name is Uri. His name is Dan.','סיפרת על המשפחה: This is my brother. My father is a doctor.','אמרת מקצוע: a לפני עיצור (a teacher) ו־an לפני צליל של תנועה (an engineer)'],
  rule:'לפני שם עצם בא my / his / her / your, ולפני מקצוע בא a או an.',
  say:[['My name is Uri.','השם שלי אורי.'],['This is my brother.','זה אח שלי.'],['I am an engineer.','אני מהנדס.']] } });

/* ================= יחידה 3 ================= */
unit(3,{ stage:1, title:'מה זה? ומה יש כאן?', promise:'תדע לשאול "מה זה?" ולומר מה יש ואיפה',
 videoMins:9, practiceMins:12,
 before:{
  learn:['לשאול "מה זה?" ולענות: What is this? It is a book.','להבדיל בין this (קרוב) ל־that (רחוק): This is a pen. That is a car.','להגיד "יש": There is a phone on the desk. There are some books.'],
  meet:[['this','זה (קרוב)'],['that','זה (רחוק)'],['book','ספר'],['phone','טלפון'],['desk','שולחן']] },
 words:[
  w('this','זה (קרוב אליי)','This is a pen.','זה עט.'),
  w('that','זה (רחוק ממני)','What is that?','מה זה שם?'),
  w('book','ספר','This is a book.','זה ספר.'),
  w('pen','עט','There are two pens.','יש שני עטים.'),
  w('computer','מחשב','It is a computer.','זה מחשב.'),
  w('phone','טלפון','There is a phone on the desk.','יש טלפון על השולחן.'),
  w('desk','שולחן','This is my desk.','זה השולחן שלי.'),
  w('apple','תפוח','It is an apple.','זה תפוח.'),
  w('some','כמה (במשפט חיובי)','There are some books.','יש כמה ספרים.'),
  w('any','כלשהו (בשאלה ובשלילה)','Are there any books?','האם יש ספרים?') ],
 ex:[
  ch('איך שואלים "מה זה?" באנגלית?',['What is this?','What this is?','This is what?'],'בשאלה הפועל is בא מיד אחרי what, ורק אחר כך this: What is this?'),
  ch('אתם מצביעים על ספר שנמצא רחוק מכם. מה אומרים?',['That is a book.','This is a book.'],'that הוא "זה" לדבר רחוק, ו־this הוא "זה" לדבר קרוב אליכם.'),
  fl('There ___ two books.',['are','is'],'יש שני ספרים','שני ספרים הם כמה דברים, ולכן אומרים there are ולא there is.'),
  fl('There ___ a phone on the desk.',['is','are'],'יש טלפון על השולחן','טלפון אחד, ולכן there is.'),
  li('What is that?',['What is that?','What is this?','This is a book.'],'What is that? פירושו "מה זה שם?". that משמש לדבר רחוק.'),
  or('זה ספר',['This','is','a','book'],'This is a book.','this + is + a + book. לפני שם עצם בודד באה a.'),
  or('יש כמה ספרים',['There','are','some','books'],'There are some books.','לכמה דברים אומרים there are, ו־some פירושו "כמה" במשפט חיובי.'),
  ty('יש טלפון על השולחן',['There is a phone on the desk.'],'לדבר אחד אומרים there is. על השולחן = on the desk.'),
  cp('What is this?','מה זה?','העתיקו בדיוק. שימו לב: is באה אחרי What, ובסוף יש סימן שאלה.'),
  sp('That is a computer.') ],
 quiz:[
  ch('איזה משפט נכון?',['There are two books.','There is two books.'],'שני ספרים הם יותר מדבר אחד, ולכן צריך are ולא is.'),
  ch('איזה משפט נכון?',['What is this?','What this is?'],'בשאלה is בא מיד אחרי What, ורק אחר כך this.'),
  fl('___ there any books?',['Are','Is'],'האם יש ספרים?','ספרים הם כמה דברים, ולכן Are there any books? בשאלה משתמשים ב־any.'),
  ch('מצביעים על מחשב רחוק. מה אומרים?',['That is a computer.','This is a computer.'],'that לדבר רחוק, this לדבר קרוב.'),
  ch('מתי משתמשים ב־some ומתי ב־any?',['some במשפט חיובי, any בשאלה ובשלילה','some בשאלה, any במשפט חיובי','אין הבדל'],'There are some books (חיובי). Are there any books? (שאלה). some פירושו "כמה", ו־any פירושו "כלשהו".') ],
 recap:{
  bullets:['שאלת "מה זה?" וענית: What is this? It is a book.','הבדלת בין this (קרוב) ל־that (רחוק): This is a pen. That is a car.','אמרת "יש": there is לדבר אחד, there are לכמה דברים'],
  rule:'לדבר אחד: there is. לכמה דברים: there are.',
  say:[['What is this?','מה זה?'],['There is a phone on the desk.','יש טלפון על השולחן.'],['There are some books.','יש כמה ספרים.']] } });

/* ================= יחידה 4 ================= */
unit(4,{ stage:1, title:'היום שלי', promise:'תדע לספר באיזו שעה אתה קם, עובד ואוכל, ומה עושים אחרים',
 videoMins:10, practiceMins:12,
 before:{
  learn:['לספר על הרגלים: I wake up at seven. I work at eight. (עם I, you, we, they הפועל נשאר פשוט)','לומר שעה עם at: at seven, at eight, at night, during the day','עם he, she או שם של אדם מוסיפים s: He works at a bank. Dan eats breakfast.'],
  meet:[['work','לעבוד'],['eat','לאכול'],['sleep','לישון'],['breakfast','ארוחת בוקר'],['night','לילה']] },
 words:[
  w('wake up','לקום','I wake up at seven.','אני קם בשבע.'),
  w('work','לעבוד','I work at eight.','אני עובד בשמונה.'),
  w('eat','לאכול','I eat breakfast at eight.','אני אוכל ארוחת בוקר בשמונה.'),
  w('breakfast','ארוחת בוקר','Dan eats breakfast at eight.','דן אוכל ארוחת בוקר בשמונה.'),
  w('sleep','לישון','My friend sleeps during the day.','חבר שלי ישן ביום.'),
  w('start','להתחיל','He starts at nine.','הוא מתחיל בתשע.'),
  w('bank','בנק','He works at a bank.','הוא עובד בבנק.'),
  w('school','בית ספר','She works at a school.','היא עובדת בבית ספר.'),
  w('night','לילה','I sleep at night.','אני ישן בלילה.'),
  w('day','יום','He sleeps during the day.','הוא ישן ביום.') ],
 ex:[
  fl('I ___ at eight.',['work','works'],'אני עובד בשמונה','עם I הפועל נשאר פשוט. האות s שייכת רק ל־he, she או שם של אדם.'),
  fl('He ___ at a bank.',['works','work'],'הוא עובד בבנק','עם he מוסיפים s לפועל: he works.'),
  fl('I wake up ___ seven.',['at','on'],'אני קם בשבע','לפני שעה כותבים at: at seven, at eight.'),
  ch('איזה משפט נכון?',['Dan eats breakfast at eight.','Dan eat breakfast at eight.','Dan eats breakfast on eight.'],'Dan הוא אדם אחד, כמו he, ולכן מוסיפים s: eats. ולפני שעה אומרים at.'),
  li('He starts at nine.',['He starts at nine.','He works at nine.','He sleeps at nine.'],'He starts at nine פירושו "הוא מתחיל בתשע". starts עם s כי מדובר ב־he.'),
  or('אני קם בשבע',['I','wake','up','at','seven'],'I wake up at seven.','I + wake up + at + seven. הפועל wake up נשאר בלי s.'),
  or('הוא עובד בבנק',['He','works','at','a','bank'],'He works at a bank.','עם he הפועל works מקבל s. at a bank = בבנק.'),
  ty('אנחנו עובדים בשמונה',['We work at eight.'],'עם we הפועל נשאר פשוט, בלי s. at eight = בשמונה.'),
  cp('I sleep at night.','אני ישן בלילה.','העתיקו בדיוק. שימו לב: sleep בלי s כי זה I, ו־at night לילה.'),
  sp('My friend sleeps during the day.') ],
 quiz:[
  ch('איזה משפט נכון?',['He works at nine.','He work at nine.'],'עם he חייבים s בסוף הפועל.'),
  ch('איזה משפט נכון?',['We work at eight.','We works at eight.'],'we אינו he או she, ולכן הפועל נשאר פשוט, בלי s.'),
  fl('She ___ at a school.',['works','work'],'היא עובדת בבית ספר','she כמו he: מוסיפים s.'),
  ch('עם אילו מילים מוסיפים s לפועל?',['he, she או שם של אדם אחד','I, you, we, they','עם כל המילים'],'s שייכת רק לאדם אחד שאינו I או you: he, she, או שם כמו Dan.'),
  fl('I sleep ___ night.',['at','during'],'אני ישן בלילה','ללילה אומרים at night. ביום אומרים during the day.') ],
 recap:{
  bullets:['סיפרת באיזו שעה אתה קם ועובד: I wake up at seven. I work at eight.','אמרת שעה עם at, ולילה ויום: at night, during the day','למדת שעם he, she ושם של אדם מוסיפים s: He works. Dan eats.'],
  rule:'עם I, you, we, they הפועל פשוט. עם he, she ושם של אדם מוסיפים s.',
  say:[['I wake up at seven.','אני קם בשבע.'],['He works at a bank.','הוא עובד בבנק.'],['We work at eight.','אנחנו עובדים בשמונה.']] } });

/* ================= יחידה 5 ================= */
unit(5,{ stage:1, title:'לא, והאם?', promise:'תדע להגיד "אני לא…" ולשאול ולענות שאלות של כן ולא',
 videoMins:10, practiceMins:12,
 before:{
  learn:['להגיד "לא": I don\'t like coffee. He doesn\'t like tea. (אחרי don\'t ו־doesn\'t הפועל רגיל)','לשאול שאלות של כן ולא: Do you like coffee? Does he work here?','לענות בקצרה: Yes, I do. No, he doesn\'t. ולבקש עזרה: Can you help me?'],
  meet:[['like','לאהוב'],['want','לרצות'],['know','לדעת'],['live','לגור'],['help','לעזור']] },
 words:[
  w("don't",'לא (עם אני, אתה, אנחנו, הם)',"I don't like coffee.",'אני לא אוהב קפה.'),
  w("doesn't",'לא (עם הוא, היא ושם של אדם)',"He doesn't like tea.",'הוא לא אוהב תה.'),
  w('like','לאהוב','Do you like coffee?','האם אתה אוהב קפה?'),
  w('want','לרצות','Do you want some tea?','אתה רוצה קצת תה?'),
  w('know','לדעת',"I don't know.",'אני לא יודע.'),
  w('live','לגור',"She doesn't live here.",'היא לא גרה כאן.'),
  w('here','כאן','Does he work here?','האם הוא עובד כאן?'),
  w('help','לעזור','Can you help me?','אתה יכול לעזור לי?'),
  w('can','יכול','Yes, I can.','כן, אני יכול.'),
  w('coffee','קפה',"I don't like coffee.",'אני לא אוהב קפה.') ],
 ex:[
  ch('איך אומרים "אני לא אוהב קפה"?',["I don't like coffee.",'I no like coffee.','I not like coffee.'],"הלא של הפועל באנגלית הוא don't, לפני פועל רגיל. אי אפשר לשים no לפני פועל."),
  fl('He ___ like tea.',["doesn't","don't"],'הוא לא אוהב תה',"עם he אומרים doesn't. don't שייך ל־I, you, we ו־they."),
  fl('We ___ work on Saturday.',["don't","doesn't"],'אנחנו לא עובדים בשבת',"עם we אומרים don't."),
  fl('___ he work here?',['Does','Do'],'האם הוא עובד כאן?','עם he, she, it ושם של אדם אחד שמים Does בתחילת השאלה.'),
  fl('Do you ___ coffee?',['like','likes'],'אתה אוהב קפה?','אחרי Do הפועל נשאר פשוט, בלי s.'),
  li("He doesn't like tea.",["He doesn't like tea.","He doesn't like coffee.","I don't like tea."],"He doesn't like tea פירושו \"הוא לא אוהב תה\". שימו לב לשם המשקה."),
  or('אתה יכול לעזור לי?',['Can','you','help','me'],'Can you help me?','Can פותחת את השאלה. can היא מילת עזר, לכן לא צריך Do ולא מוסיפים s.'),
  ty('לא, הוא לא אוהב',["No, he doesn't."],"בתשובה קצרה מחזירים את Do או Does: No, he doesn't. אומרים he ולא את השם."),
  cp("I don't like coffee.",'אני לא אוהב קפה.',"העתיקו בדיוק. שימו לב: don't כתובה עם גרש (') ואחריה הפועל like בלי s."),
  sp('Do you like coffee?') ],
 quiz:[
  ch('איזה משפט נכון?',['Does he work here?','Does he works here?','Do he work here?'],'עם he צריך Does, ואחרי Does הפועל נשאר בלי s, כי ה־s כבר נמצאת ב־Does.'),
  ch('איזה משפט נכון?',["She doesn't live here.","She doesn't lives here.","She don't live here."],"עם she אומרים doesn't, והפועל אחריו חוזר להיות פשוט: live, בלי s."),
  fl('___ you like tea?',['Do','Does'],'אתה אוהב תה?','עם you שמים Do בתחילת השאלה.'),
  ch('Does Dan work here? מה עונים בקצרה (לא)?',["No, he doesn't.","No, Dan doesn't.","No, he don't."],'בתשובה קצרה אומרים כינוי גוף (he) ולא את השם, ועם he אומרים doesn\'t.'),
  ch('מה פירוש Can you help me?',['אתה יכול לעזור לי?','האם אתה אוהב קפה?','אתה רוצה קצת תה?'],'can = יכול, help = לעזור, me = לי.') ],
 recap:{
  bullets:["אמרת \"לא\": I don't like coffee. He doesn't like tea.",'שאלת שאלות של כן ולא: Do you like coffee? Does he work here?','ענית בקצרה (Yes, I do. No, he doesn\'t.) וביקשת עזרה: Can you help me?'],
  rule:"לשלילה don't או doesn't, לשאלה Do או Does, ואחריהם הפועל נשאר פשוט.",
  say:[["I don't like coffee.",'אני לא אוהב קפה.'],['Does he work here?','האם הוא עובד כאן?'],['Can you help me?','אתה יכול לעזור לי?']] } });

/* ================= יחידה 6 ================= */
unit(6,{ stage:2, title:'מה אתה עושה עכשיו?', promise:'תדע לספר מה קורה ברגע הזה ולשאול "מה אתה עושה?"',
 videoMins:10, practiceMins:12,
 before:{
  learn:['לספר מה קורה עכשיו: am / is / are + פועל עם ing (I am working now. He is driving.)','לשאול ולהגיד "לא": What are you doing? Are you busy? I am not busy.','כתיב: פועל שנגמר ב־e מאבד אותה לפני ing (make, making. drive, driving)'],
  meet:[['now','עכשיו'],['busy','עסוק'],['make','להכין'],['cook','לבשל'],['drive','לנהוג']] },
 words:[
  w('now','עכשיו','I am not busy now.','אני לא עסוק עכשיו.'),
  w('right now','ממש עכשיו, כרגע','I am not busy right now.','אני לא עסוק כרגע.'),
  w('busy','עסוק','Are you busy?','אתה עסוק?'),
  w('work','לעבוד','I am working now.','אני עובד עכשיו.'),
  w('make','להכין','I am making tea.','אני מכין תה.'),
  w('cook','לבשל','I am cooking.','אני מבשל.'),
  w('drive','לנהוג','He is driving.','הוא נוהג.'),
  w('wait','לחכות','We are waiting.','אנחנו מחכים.'),
  w('come','לבוא','They are coming.','הם באים.'),
  w('tea','תה','I am making tea.','אני מכין תה.') ],
 ex:[
  ch('איך שואלים "מה אתה עושה?"',['What are you doing?','What do you doing?','What you are doing?'],'עם ing משתמשים ב־are ולא ב־do. ובשאלה are בא אחרי What: What are you doing?'),
  fl('I ___ working now.',['am','is','are'],'אני עובד עכשיו','ing לבדו לא מספיק. עם I צריך am לפני הפועל: I am working.'),
  fl('We ___ waiting.',['are','am','is'],'אנחנו מחכים','עם we בא are: We are waiting.'),
  ch('איזה משפט נכון?',['I am not busy now.','I not busy now.'],'not בא אחרי am, is או are, ולא לבדו. בלי am המשפט חסר.'),
  li('They are coming.',['They are coming.','They are waiting.','We are coming.'],'They are coming פירושו "הם באים". אחרי they בא are, ו־come הופך ל־coming.'),
  or('אני מכין תה',['I','am','making','tea'],'I am making tea.','I + am + making + tea. הפועל make מאבד את ה־e לפני ing: making.'),
  or('האם הוא נוהג?',['Is','he','driving'],'Is he driving?','בשאלה is קופצת לראש המשפט, לפני he. drive הופך ל־driving.'),
  ty('אני מבשל',['I am cooking.',"I'm cooking."],'עם I: am ואחריו הפועל עם ing. cook + ing = cooking.'),
  cp('What are you doing?','מה אתה עושה?','העתיקו בדיוק. שימו לב: are באה אחרי What, ובסוף יש סימן שאלה.'),
  sp('I am not busy right now.') ],
 quiz:[
  ch('איזה משפט נכון?',['I am working now.','I working now.'],'חסר am לפני working. ב־ing אין זמן, והמילה am מציבה את הפעולה ברגע הזה.'),
  ch('איך כותבים make עם ing?',['making','makeing','makking'],'פועל שנגמר ב־e מאבד אותה לפני ing: make → making, drive → driving.'),
  fl('___ you busy?',['Are','Do'],'אתה עסוק?','בשאלה מעבירים את are לראש המשפט: Are you busy? ו־do שייך לצורה הרגילה.'),
  ch('איזה משפט נכון?',['What are you doing?','What do you doing?'],'עם ing משתמשים ב־are ולא ב־do.'),
  ch('מתי משתמשים ב־am / is / are + ing?',['כשמדברים על מה שקורה ברגע הזה','כשמדברים על מה שקורה כל יום','כשמדברים על אתמול'],'על דבר שקורה כל יום אומרים I work every day. על דבר שקורה עכשיו אומרים I am working now.') ],
 recap:{
  bullets:['סיפרת מה קורה עכשיו: I am working now. He is driving. We are waiting.','שאלת ואמרת "לא": What are you doing? Are you busy? I am not busy.','זכרת שאם הפועל נגמר ב־e היא נופלת לפני ing: make → making'],
  rule:'עכשיו = am / is / are + פועל עם ing.',
  say:[['What are you doing?','מה אתה עושה?'],['I am making tea.','אני מכין תה.'],['I am not busy right now.','אני לא עסוק כרגע.']] } });

/* ================= יחידה 7 ================= */
unit(7,{ stage:2, title:'איפה ומתי', promise:'תדע להגיד איפה דברים נמצאים ומתי הם קורים',
 videoMins:10, practiceMins:12,
 before:{
  learn:['לומר איפה: in (בתוך), on (על משטח), at (נקודה או מקום פעילות): in the office, on the desk, at home','לומר מתי: at לשעה, on ליום, in לחלק של היום: at six, on Friday, in the evening','לזכור צורות קבועות: at home, at work, at school'],
  meet:[['office','משרד'],['dinner','ארוחת ערב'],['evening','ערב'],['morning','בוקר'],['Friday','יום שישי']] },
 words:[
  w('in','ב־ (בתוך)','I am in the office.','אני במשרד.'),
  w('on','על, ב־ (יום)','The book is on the desk.','הספר על השולחן.'),
  w('at','ב־ (נקודה או שעה)','I am at home.','אני בבית.'),
  w('office','משרד','I am in the office.','אני במשרד.'),
  w('market','שוק','We are at the market.','אנחנו בשוק.'),
  w('dinner','ארוחת ערב','The dinner is on Friday.','הארוחה ביום שישי.'),
  w('evening','ערב','We eat dinner in the evening.','אנחנו אוכלים ארוחת ערב בערב.'),
  w('morning','בוקר','See you in the morning.','נתראה בבוקר.'),
  w('Friday','יום שישי','The dinner is on Friday.','הארוחה ביום שישי.'),
  w('Sunday','יום ראשון','I work on Sunday.','אני עובד ביום ראשון.') ],
 ex:[
  fl('I am ___ the office.',['in','on','at'],'אני במשרד','in אומר "בתוך" משהו, כמו משרד.'),
  fl('The book is ___ the desk.',['on','in','at'],'הספר על השולחן','on אומר "על משטח", כמו שולחן.'),
  fl('The dinner is ___ Friday.',['on','in','at'],'הארוחה ביום שישי','לימים משתמשים ב־on: on Friday, on Sunday.'),
  fl('We eat dinner ___ the evening.',['in','at','on'],'אנחנו אוכלים ארוחת ערב בערב','לחלק של היום אומרים in: in the evening, in the morning.'),
  ch('איזה משפט נכון?',['I am at home.','I am in home.'],'at home היא צורה קבועה, כמו at work ו־at school. לא אומרים in home.'),
  li('We are at the market.',['We are at the market.','We are in the office.','We are at home.'],'We are at the market פירושו "אנחנו בשוק". at לשוק, כי זה מקום שעושים בו דברים.'),
  or('הספר על השולחן',['The','book','is','on','the','desk'],'The book is on the desk.','The book + is + on + the desk. on אומר "על משטח".'),
  ty('אני עובד ביום ראשון',['I work on Sunday.'],'ליום משתמשים ב־on: on Sunday. עם I הפועל work נשאר בלי s.'),
  cp('It starts at six.','זה מתחיל בשש.','העתיקו בדיוק. שימו לב: at לפני שעה, ו־starts עם s כי זה it.'),
  sp('We eat dinner in the evening.') ],
 quiz:[
  ch('איזה משפט נכון?',['The dinner is on Friday.','The dinner is in Friday.'],'לימים משתמשים ב־on. in משמש לחלק של היום, כמו in the evening.'),
  ch('איזה משפט נכון?',['We eat dinner in the evening.','We eat dinner at the evening.'],'at הוא רק לשעה מדויקת, כמו at six. לחלק של היום אומרים in.'),
  fl('He is ___ work.',['at','in'],'הוא בעבודה','at work היא צורה קבועה, כמו at home ו־at school.'),
  ch('איזו מילה מתאימה לשעה מדויקת, כמו six?',['at','on','in'],'שעה מדויקת: at six. יום: on Friday. חלק של היום: in the evening.'),
  ch('איזו מילה מתאימה ליום, כמו Sunday?',['on','at','in'],'ליום משתמשים ב־on: on Sunday, on Friday.') ],
 recap:{
  bullets:['אמרת איפה: in the office, on the desk, at home, at the market','אמרת מתי: at six, on Friday, in the evening','הסדר בזמן הוא מהקטן אל הגדול: שעה (at), יום (on), חלק של היום (in)'],
  rule:'מקום: in בתוך, on על משטח, at נקודה. זמן: at לשעה, on ליום, in לחלק של היום.',
  say:[['I am at home.','אני בבית.'],['The book is on the desk.','הספר על השולחן.'],['We eat dinner in the evening.','אנחנו אוכלים ארוחת ערב בערב.']] } });

/* ================= יחידה 8 ================= */
unit(8,{ stage:2, title:'שאלות שימושיות', promise:'תדע לשאול איפה, מתי, מי, כמה ולמה, ולענות במשפט קצר',
 videoMins:9, practiceMins:12,
 before:{
  learn:['לשאול עם is / are מיד אחרי מילת השאלה: Where is the market? Who is coming? How many people are coming?','לשאול עם פועל רגיל: מוסיפים do או does, והפועל נשאר פשוט (What time does the market open?)','להבדיל בין How many (דברים שאפשר לספור) ל־How much (כמות ומחיר), ולענות Because…'],
  meet:[['who','מי'],['when','מתי'],['why','למה'],['how many','כמה (אפשר לספור)'],['how much','כמה (כמות או מחיר)']] },
 words:[
  w('who','מי','Who is coming?','מי בא?'),
  w('when','מתי','When is the dinner?','מתי הארוחה?'),
  w('why','למה','Why are you happy?','למה אתה שמח?'),
  w('because','כי','Because it is Friday.','כי זה יום שישי.'),
  w('how many','כמה (דברים שאפשר לספור)','How many people are coming?','כמה אנשים באים?'),
  w('how much','כמה (כמות או מחיר)','How much is the bread?','כמה עולה הלחם?'),
  w('what time','באיזו שעה','What time does the market open?','באיזו שעה השוק נפתח?'),
  w('open','להיפתח, לפתוח','It opens at eight.','הוא נפתח בשמונה.'),
  w('people','אנשים','Ten people are coming.','עשרה אנשים באים.'),
  w('live','לגור','Where do you live?','איפה אתה גר?') ],
 ex:[
  fl('___ is the dinner?',['When','Who','Why'],'מתי הארוחה?','When פירושו "מתי". Who הוא "מי" ו־Why הוא "למה".'),
  fl('How ___ people are coming?',['many','much'],'כמה אנשים באים?','אנשים אפשר לספור, ולכן How many. How much שואל על כמות או על מחיר.'),
  fl('How ___ is the bread?',['much','many'],'כמה עולה הלחם?','מחיר הוא סוג של כמות, ולכן How much.'),
  fl('What time ___ the market open?',['does','is','do'],'באיזו שעה השוק נפתח?','יש פועל רגיל (open), ולכן מוסיפים does. הפועל נשאר פשוט, בלי s.'),
  li('Why are you happy?',['Why are you happy?','Who is coming?','When is the dinner?'],'Why are you happy? פירושו "למה אתה שמח?". Why = למה.'),
  or('מי בא?',['Who','is','coming'],'Who is coming?','Who + is + coming. בשאלה is בא מיד אחרי מילת השאלה.'),
  ty('כי זה יום שישי',['Because it is Friday.',"Because it's Friday."],'Because = כי. עונים על Why בעזרת Because.'),
  cp('Where do you live?','איפה אתה גר?','העתיקו בדיוק. שימו לב: do באה אחרי Where ולפני you, והפועל live בלי s.'),
  ch('איך שואלים "איפה השוק?"',['Where is the market?','Where the market is?'],'בשאלה is בא מיד אחרי מילת השאלה, ורק אחר כך הנושא: Where is the market?'),
  sp('What time does the market open?') ],
 quiz:[
  ch('איזה משפט נכון?',['Where is the market?','Where the market is?'],'is בא מיד אחרי Where, לפני הנושא.'),
  ch('איזה משפט נכון?',['What time does the market open?','What time the market opens?'],'חסרה המילה does. does לוקחת את ה־s, והפועל open נשאר פשוט.'),
  ch('איזה משפט נכון?',['Where does he work?','Where does he works?'],'ה־s כבר נמצאת ב־does, ולכן הפועל נשאר פשוט: work.'),
  ch('איזו שאלה שואלת על מחיר?',['How much is the bread?','How many people are coming?'],'How much שואל על מחיר או כמות. How many שואל על דברים שאפשר לספור, כמו אנשים.'),
  fl('Why ___ you happy?',['are','do'],'למה אתה שמח?','אין כאן פועל רגיל (happy הוא תואר), ולכן נשארים עם are.') ],
 recap:{
  bullets:['שאלת עם is / are: Where is the market? When is the dinner? Who is coming?','שאלת עם פועל רגיל: What time does the market open? Where do you live?','הבדלת בין How many (אנשים, תפוחים) ל־How much (מחיר, כמות)'],
  rule:'אחרי מילת שאלה: is או are, או do או does עם פועל רגיל.',
  say:[['Where is the market?','איפה השוק?'],['What time does the market open?','באיזו שעה השוק נפתח?'],['How many people are coming?','כמה אנשים באים?']] } });

/* ================= יחידה 9 ================= */
unit(9,{ stage:2, title:'רוצה, צריך, חייב', promise:'תדע להגיד מה אתה רוצה, צריך וחייב, ולבקש בנימוס',
 videoMins:10, practiceMins:12,
 before:{
  learn:['להגיד רוצה, צריך, חייב: I want to go. I need to buy bread. I have to work.','לזכור שאחרי to הפועל נשאר רגיל, גם עם he: He needs to go. He has to drive.','לבקש ולהציע בנימוס: I would like some tea, please. Would you like some water?'],
  meet:[['want','לרצות'],['need','צריך'],['have to','חייב'],['buy','לקנות'],['would like','הייתי רוצה']] },
 words:[
  w('want','לרצות','I want to buy some fruit.','אני רוצה לקנות קצת פירות.'),
  w('need','צריך (לעשות)','We need to buy water too.','אנחנו צריכים לקנות גם מים.'),
  w('have to','חייב','I have to work.','אני חייב לעבוד.'),
  w('would like','הייתי רוצה (בנימוס)','I would like some tea, please.','הייתי רוצה קצת תה, בבקשה.'),
  w('buy','לקנות','I need to buy bread.','אני צריך לקנות לחם.'),
  w('go','ללכת','I want to go.','אני רוצה ללכת.'),
  w('fruit','פירות','I want to buy some fruit.','אני רוצה לקנות קצת פירות.'),
  w('bread','לחם','He would like some bread.','הוא היה רוצה קצת לחם.'),
  w('water','מים','Would you like some water?','האם תרצה קצת מים?'),
  w('please','בבקשה','Yes, please.','כן, בבקשה.') ],
 ex:[
  fl('I want ___ go.',['to','at'],'אני רוצה ללכת','אחרי want בא to ואחריו פועל רגיל: I want to go.'),
  fl('He needs to ___.',['go','goes'],'הוא צריך ללכת','ה־s עוברת רק למילה הראשונה (needs). אחרי to הפועל נשאר רגיל.'),
  fl('He ___ to drive.',['has','have'],'הוא חייב לנהוג','עם he: have הופכת ל־has. I have to work, אבל He has to drive.'),
  ch('איך מבקשים תה בנימוס?',['I would like some tea, please.','I want tea.'],'I would like נשמע מנומס. I want נשמע ישיר, ולכן בחנות או בבית של מישהו אומרים would like.'),
  li('Would you like some water?',['Would you like some water?','What would you like?','I would like some water.'],'Would you like some water? פירושו "האם תרצה קצת מים?". כך מציעים בנימוס.'),
  or('אני צריך לקנות לחם',['I','need','to','buy','bread'],'I need to buy bread.','I + need + to + buy + bread. אחרי need בא to ופועל רגיל.'),
  or('האם תרצה קצת מים?',['Would','you','like','some','water'],'Would you like some water?','Would עוברת לפני you, בלי do.'),
  ty('אני חייב לעבוד',['I have to work.'],'have to פירושו "חייב". אחרי to הפועל נשאר רגיל.'),
  cp('I want to go.','אני רוצה ללכת.','העתיקו בדיוק. שימו לב: to לפני go, ובסוף יש נקודה.'),
  sp('I would like some tea, please.') ],
 quiz:[
  ch('איזה משפט נכון?',['He needs to go.','He needs to goes.'],'ה־s נמצאת רק ב־needs. אחרי to הפועל נשאר רגיל.'),
  ch('איזה משפט נכון?',['Would you like some tea?','Do you would like some tea?'],'would היא העוזר, ולא מוסיפים do. פשוט מזיזים את would לפני you.'),
  ch('איזה משפט נכון?',['He would like some tea.','He would likes some tea.'],'אחרי would הפועל נשאר רגיל, בכל גוף, בלי s.'),
  fl('I ___ to work in the morning.',['have','has'],'אני חייב לעבוד בבוקר','עם I אומרים have to. has to שייך ל־he ול־she.'),
  ch('מה פירוש need?',['צריך','רוצה','חייב'],'want = רוצה, need = צריך, have to = חייב.') ],
 recap:{
  bullets:['אמרת מה אתה רוצה, צריך וחייב: I want to go. I need to buy bread. I have to work.','זכרת שאחרי to הפועל נשאר רגיל: He needs to go. He has to drive.','ביקשת והצעת בנימוס: I would like some tea, please. Would you like some water?'],
  rule:'want, need, have + to + פועל רגיל. בנימוס: would like.',
  say:[['I want to go.','אני רוצה ללכת.'],['I need to buy bread.','אני צריך לקנות לחם.'],['Would you like some water?','האם תרצה קצת מים?']] } });

/* ================= יחידה 10 ================= */
unit(10,{ stage:2, title:'בשוק: כמה זה עולה?', promise:'תדע לשאול כמה זה עולה, להבין מחיר ולקנות בנימוס',
 videoMins:11, practiceMins:12,
 before:{
  learn:['לשאול על מחיר: How much is it? How much are the apples? (is לדבר אחד, are לכמה דברים)','לענות: It costs ten shekels. They cost twelve shekels. (עם they בלי s)','לומר מספרים מ־13 עד 100: thirteen, thirty, forty-five, one hundred'],
  meet:[['cost','לעלות'],['cheap','זול'],['expensive','יקר'],['thirteen','13'],['hundred','100']] },
 words:[
  w('cost','לעלות','It costs ten shekels.','זה עולה עשרה שקלים.'),
  w('shekels','שקלים','They cost twelve shekels.','הם עולים שנים עשר שקלים.'),
  w('kilo','קילו','Two kilos, please.','שני קילו, בבקשה.'),
  w('cheap','זול','It is cheap.','זה זול.'),
  w('expensive','יקר','It is expensive.','זה יקר.'),
  w('thirteen','13','It costs thirteen shekels.','זה עולה שלושה עשר שקלים.'),
  w('thirty','30','It costs thirty shekels.','זה עולה שלושים שקלים.'),
  w('forty-five','45','It costs forty-five shekels.','זה עולה ארבעים וחמישה שקלים.'),
  w('hundred','100','It costs one hundred shekels.','זה עולה מאה שקלים.'),
  w('that is all','זה הכול','That is all, thank you.','זה הכול, תודה.') ],
 ex:[
  ch('איך שואלים "כמה עולה הלחם?"',['How much is the bread?','How much costs the bread?'],'בשאלה על מחיר משתמשים ב־is או are, ולא בפועל costs. את costs אומרים רק בתשובה.'),
  fl('How much ___ the apples?',['are','is'],'כמה עולים התפוחים?','תפוחים הם כמה דברים, לכן are. הבחירה בין is ל־are תלויה בדבר שקונים, לא במחיר.'),
  fl('They ___ twelve shekels.',['cost','costs'],'הם עולים שנים עשר שקלים','עם they הפועל נשאר פשוט, בלי s.'),
  fl('It ___ ten shekels.',['costs','cost'],'זה עולה עשרה שקלים','עם it מוסיפים s: it costs.'),
  ch('איך אומרים 45?',['forty-five','forty and five'],'באנגלית אין and בין העשרות ליחידות: עשרות ואחריהן יחידות, forty-five.'),
  li('It costs thirteen shekels.',['It costs thirteen shekels.','It costs thirty shekels.','It costs forty shekels.'],'ב־thirteen ההדגשה בסוף המילה ויש teen. ב־thirty ההדגשה בהתחלה. הקשיבו להבדל.'),
  or('זה זול',['It','is','cheap'],'It is cheap.','It + is + cheap. cheap פירושו זול, ו־expensive פירושו יקר.'),
  ty('זה עולה עשרה שקלים',['It costs ten shekels.'],'עם it מוסיפים s לפועל: It costs. shekels = שקלים.'),
  cp('That is all, thank you.','זה הכול, תודה.','העתיקו בדיוק. שימו לב לפסיק אחרי all ולנקודה בסוף. כך מסיימים קנייה בנימוס.'),
  sp('How much is it?') ],
 quiz:[
  ch('איזה משפט נכון?',['How much is the bread?','How much costs the bread?'],'בשאלה משתמשים ב־is או are. costs נאמר רק בתשובה.'),
  ch('איזה משפט נכון?',['They cost twelve shekels.','They costs twelve shekels.'],'s נוספת רק אחרי it, he או she. עם they הפועל נשאר פשוט.'),
  ch('באיזה מספר ההדגשה בסוף המילה?',['thirteen','thirty'],'ב־13 עד 19 יש teen וההדגשה בסוף. בעשרות (thirty, forty) ההדגשה בהתחלה.'),
  fl('How much ___ it?',['is','are'],'כמה זה עולה?','it הוא דבר אחד, לכן is.'),
  ch('מתי אומרים is ומתי are אחרי How much?',['is לדבר אחד, are לכמה דברים','is לדברים זולים, are ליקרים','תמיד is'],'הבחירה תלויה בדבר שקונים: How much is the bread? How much are the tomatoes?') ],
 recap:{
  bullets:['שאלת על מחיר: How much is it? How much are the apples?','ענית: It costs ten shekels. They cost twelve shekels.','אמרת מספרים מ־13 עד 100 בלי and: forty-five, one hundred'],
  rule:'שואלים How much + is או are, ועונים cost עם s רק ל־it, he, she.',
  say:[['How much is it?','כמה זה עולה?'],['It costs ten shekels.','זה עולה עשרה שקלים.'],['That is all, thank you.','זה הכול, תודה.']] } });

/* ================= יחידה 11 ================= */
unit(11,{ stage:3, title:'איפה הייתי אתמול?', promise:'תדע לספר איפה היית אתמול ובשבוע שעבר, ולשאול אחרים',
 videoMins:9, practiceMins:12,
 before:{
  learn:['לספר איפה היית: I was at home. We were busy last week. (was ו־were הם העבר של am, is, are)','לשאול ולהגיד "לא": Were you at home? He wasn\'t at home. (בלי do ובלי did)','לענות בקצרה: Yes, I was. No, I wasn\'t.'],
  meet:[['was','הייתי, היה'],['were','היית, היינו, היו'],['yesterday','אתמול'],['last week','בשבוע שעבר'],['tired','עייף']] },
 words:[
  w('was','הייתי, היה, הייתה','I was at home.','הייתי בבית.'),
  w('were','היית, היינו, הייתם, היו','We were busy last week.','היינו עסוקים בשבוע שעבר.'),
  w("wasn't",'לא הייתי, לא היה',"He wasn't at home.",'הוא לא היה בבית.'),
  w("weren't",'לא היית, לא היינו, לא היו',"They weren't late.",'הם לא איחרו.'),
  w('yesterday','אתמול','Where were you yesterday?','איפה היית אתמול?'),
  w('last night','אתמול בלילה','I was tired last night.','הייתי עייף אתמול בלילה.'),
  w('last week','בשבוע שעבר','We were busy last week.','היינו עסוקים בשבוע שעבר.'),
  w('tired','עייף','I was tired.','הייתי עייף.'),
  w('clinic','מרפאה','He was at the clinic.','הוא היה במרפאה.'),
  w('at home','בבית','Were you at home?','האם היית בבית?') ],
 ex:[
  fl('I ___ at home.',['was','were'],'הייתי בבית','עם I תמיד אומרים was. were שמורה ל־you, we ו־they.'),
  fl('We ___ busy last week.',['were','was'],'היינו עסוקים בשבוע שעבר','עם we אומרים were: We were busy.'),
  fl('Dan ___ at work.',['was','were'],'דן היה בעבודה','Dan הוא אדם אחד, כמו he, ולכן was.'),
  ch('איך שואלים "איפה היית אתמול?"',['Where were you yesterday?','Where you were yesterday?','Where did you were yesterday?'],'בשאלה were בא לפני you. were כבר הפועל, ולכן לא צריך did.'),
  ch('איזה משפט נכון?',['I was tired.','I were tired.'],'I הוא יחיד, ולכן was. were שמורה ל־you, we ו־they.'),
  li("He wasn't at home.",["He wasn't at home.","He was at home.","I wasn't at home."],"wasn't היא was + not. He wasn't at home פירושו \"הוא לא היה בבית\"."),
  or('האם היית בבית?',['Were','you','at','home'],'Were you at home?','בשאלה מחליפים מקום: were לפני you. בלי did.'),
  ty('הייתי עייף אתמול בלילה',['I was tired last night.'],'עם I: was. last night = אתמול בלילה.'),
  cp("No, I wasn't.",'לא, לא הייתי.',"העתיקו בדיוק. שימו לב לגרש (') ב־wasn't ולפסיק אחרי No."),
  sp('Where were you yesterday?') ],
 quiz:[
  ch('איזה משפט נכון?',['I was at home.','I were at home.'],'עם I תמיד was.'),
  ch('איזה משפט נכון?',['Were you at home?','Did you were at home?'],'was ו־were הם כבר הפועל, ולכן לא צריך did. רק מחליפים מקום.'),
  ch('איזה משפט נכון?',['Where were you yesterday?','Where you were yesterday?'],'בשאלה were בא לפני you, כמו Where are you from?'),
  fl("They ___ late.",["weren't","wasn't"],'הם לא איחרו','עם they אומרים were, ולכן weren\'t.'),
  ch('מהו העבר של am ושל is?',['was','were','did'],'am ו־is הופכים ל־was, ו־are הופך ל־were.') ],
 recap:{
  bullets:['סיפרת איפה היית: I was at home. We were busy last week.','שאלת ואמרת "לא": Were you at home? He wasn\'t at home.','ענית בקצרה: Yes, I was. No, I wasn\'t.'],
  rule:'עם I, he, she, it ושם של אדם: was. עם you, we, they: were.',
  say:[['Where were you yesterday?','איפה היית אתמול?'],['I was at home.','הייתי בבית.'],["He wasn't at home.",'הוא לא היה בבית.']] } });

/* ================= יחידה 12 ================= */
unit(12,{ stage:3, title:'מה עשיתי בשבוע שעבר', promise:'תדע לספר מה עשית אתמול ובשבוע שעבר',
 videoMins:10, practiceMins:12,
 before:{
  learn:['לספר על העבר: מוסיפים ed לפועל, ואותה צורה לכל אדם (I worked, he worked, we worked)','להבין שפועל שנגמר ב־e מקבל רק d (like, liked), ושגם עם yesterday הפועל חייב ed','לומר מתי: yesterday, last night, last week, ו־ago אחרי הזמן (two days ago)'],
  meet:[['worked','עבדתי'],['visited','ביקרתי'],['called','התקשרתי'],['listened','הקשבתי'],['ago','לפני']] },
 words:[
  w('worked','עבד, עבדתי','I worked at home yesterday.','עבדתי בבית אתמול.'),
  w('visited','ביקר, ביקרתי','I visited my father.','ביקרתי את אבא שלי.'),
  w('called','התקשר, התקשרתי','I called Dan two days ago.','התקשרתי לדן לפני יומיים.'),
  w('listened','הקשיב, שמענו','We listened to a shiur last night.','שמענו שיעור אתמול בלילה.'),
  w('started','התחיל','He started a new project.','הוא התחיל פרויקט חדש.'),
  w('liked','אהב, אהבתי','I liked the shiur.','אהבתי את השיעור.'),
  w('helped','עזר','Dan helped me last week.','דן עזר לי בשבוע שעבר.'),
  w('cleaned','ניקה, ניקיתי','I cleaned the house two days ago.','ניקיתי את הבית לפני יומיים.'),
  w('ago','לפני (אחרי הזמן)','I called Dan two days ago.','התקשרתי לדן לפני יומיים.'),
  w('yesterday','אתמול','I worked at home yesterday.','עבדתי בבית אתמול.') ],
 ex:[
  fl('I ___ at home yesterday.',['worked','work'],'עבדתי בבית אתמול','מילת הזמן yesterday מראה עבר, אבל הפועל עצמו חייב לקבל ed: worked.'),
  fl('He ___ his father.',['visited','visits'],'הוא ביקר את אבא שלו','בעבר מוסיפים ed, ואין s בסוף: he visited.'),
  fl('I called Dan two days ___.',['ago','before'],'התקשרתי לדן לפני יומיים','ago בא אחרי הזמן ופירושו "לפני". לא אומרים before two days.'),
  fl('We listened to a shiur ___ night.',['last','in last'],'שמענו שיעור אתמול בלילה','עם last לא אומרים in. אומרים פשוט last night.'),
  ch('איזה משפט נכון?',['Yesterday I worked at home.','Yesterday I work at home.'],'גם כשיש מילת זמן, הפועל חייב ed כדי לספר על העבר.'),
  li('Dan helped me last week.',['Dan helped me last week.','Dan helped me yesterday.','Dan called me last week.'],'Dan helped me last week פירושו "דן עזר לי בשבוע שעבר". שימו לב לפועל ולזמן.'),
  or('אהבתי את השיעור',['I','liked','the','shiur'],'I liked the shiur.','like כבר נגמר ב־e, ולכן מוסיפים רק d: liked.'),
  ty('התקשרתי לדן לפני יומיים',['I called Dan two days ago.'],'called = התקשרתי. ago בא אחרי הזמן: two days ago.'),
  cp('He started a new project.','הוא התחיל פרויקט חדש.','העתיקו בדיוק. שימו לב: started עם ed ואין s אחרי he.'),
  sp('I visited my father.') ],
 quiz:[
  ch('איזה משפט נכון?',['I called Dan two days ago.','I called Dan before two days.'],'באנגלית אומרים ago, והוא בא אחרי הזמן.'),
  ch('איזה משפט נכון?',['We listened to a shiur last night.','We listened to a shiur in last night.'],'עם last לא אומרים in: last night.'),
  fl('He ___ at home yesterday.',['worked','works'],'הוא עבד בבית אתמול','בעבר הפועל מקבל ed, גם עם he, ובלי s.'),
  ch('מהי צורת העבר של like?',['liked','likeed','likes'],'פועל שנגמר ב־e מקבל רק d: like → liked.'),
  ch('איזו מילה אומרים אחרי two days כדי להגיד "לפני יומיים"?',['ago','before','last'],'two days ago. המילה ago באה אחרי הזמן.') ],
 recap:{
  bullets:['סיפרת על העבר עם ed: I worked at home yesterday. I visited my father.','זכרת שפועל שנגמר ב־e מקבל רק d (liked) ושהצורה זהה לכל אדם','אמרת מתי: yesterday, last night, last week, two days ago'],
  rule:'עבר = פועל + ed, אותה צורה לכל אדם.',
  say:[['I worked at home yesterday.','עבדתי בבית אתמול.'],['I called Dan two days ago.','התקשרתי לדן לפני יומיים.'],['We listened to a shiur last night.','שמענו שיעור אתמול בלילה.']] } });

/* ================= יחידה 13 ================= */
unit(13,{ stage:3, title:'פעלים שמשנים צורה', promise:'תדע לספר מה עשית ביום שלם, עם הפעלים הנפוצים שמשנים צורה בעבר',
 videoMins:10, practiceMins:14,
 before:{
  learn:['להכיר פעלים נפוצים שאין להם ed בעבר: go → went, have → had, take → took','לזכור אותם בזוגות ולהשתמש באותה צורה לכל אדם: I went, he went, we went','לומר went home בלי to, אבל went to the market'],
  meet:[['went','הלכתי'],['bought','קניתי'],['ate','אכלתי'],['took','לקחתי'],['had','היה לי, אכלנו']] },
 words:[
  wb('went','go','הלך, הלכתי','I went to the market.','הלכתי לשוק.'),
  wb('bought','buy','קנה, קניתי','I bought some bread.','קניתי קצת לחם.'),
  wb('ate','eat','אכל, אכלתי','I ate breakfast at home.','אכלתי ארוחת בוקר בבית.'),
  wb('saw','see','ראה, ראיתי','I saw Dan at the market.','ראיתי את דן בשוק.'),
  wb('said','say','אמר','He said hello.','הוא אמר שלום.'),
  wb('wrote','write','כתב, כתבתי','I wrote an email to Dan.','כתבתי מייל לדן.'),
  wb('took','take','לקח, לקחתי','I took a bus to work.','לקחתי אוטובוס לעבודה.'),
  wb('had','have','היה לו, אכלנו','We had lunch together.','אכלנו ארוחת צהריים יחד.'),
  wb('made','make','הכין, הכנתי','I made tea at home.','הכנתי תה בבית.'),
  wb('came','come','בא, באתי','I came to the office at one.','באתי למשרד באחת.') ],
 ex:[
  fl('I ___ to the market.',['went','goed','go'],'הלכתי לשוק','go הוא פועל לא סדיר: העבר שלו went ולא goed. אין לזה כלל, פשוט זוכרים.'),
  fl('I ___ a bus to work.',['took','taked','take'],'לקחתי אוטובוס לעבודה','take הוא פועל לא סדיר: העבר שלו took ולא taked.'),
  fl('We ___ lunch together.',['had','haved','have'],'אכלנו ארוחת צהריים יחד','have הופך ל־had בעבר, ואותה צורה לכל אדם.'),
  ch('איזה משפט נכון?',['I went home.','I went to home.'],'home כבר אומר "הביתה", כמו בעברית. לכן went home בלי to.'),
  ch('איך אומרים "קניתי קצת לחם"?',['I bought some bread.','I buyed some bread.'],'buy הוא פועל לא סדיר: העבר שלו bought.'),
  li('I saw Dan at the market.',['I saw Dan at the market.','I saw Dan at the office.','I said hello to Dan.'],'I saw Dan at the market פירושו "ראיתי את דן בשוק". saw הוא העבר של see.'),
  or('כתבתי מייל לדן',['I','wrote','an','email','to','Dan'],'I wrote an email to Dan.','wrote הוא העבר של write. אותה צורה לכל אדם.'),
  ty('הלכתי הביתה',['I went home.'],'went home בלי to, כי home כבר אומר "הביתה".'),
  cp('I made tea at home.','הכנתי תה בבית.','העתיקו בדיוק. שימו לב: made הוא העבר של make, ואין שם ed.'),
  sp('I took a bus to work.') ],
 quiz:[
  ch('איזה משפט נכון?',['I went to the market.','I goed to the market.'],'go הוא פועל לא סדיר: העבר שלו went, ולא goed.'),
  ch('איזה משפט נכון?',['I took a bus to work.','I taked a bus to work.'],'take הוא פועל לא סדיר: העבר שלו took.'),
  ch('איזה משפט נכון?',['I went home.','I went to home.'],'home כבר אומר הביתה, ולכן went home בלי to.'),
  fl('He ___ hello.',['said','sayed'],'הוא אמר שלום','say הוא פועל לא סדיר: העבר שלו said.'),
  ch('מהי צורת העבר של make?',['made','maked','makes'],'make → made. זה פועל לא סדיר, ואין לו ed.') ],
 recap:{
  bullets:['הכרת פעלים שמשנים צורה בעבר: go → went, have → had, take → took','סיפרת על יום שלם: I went to the market. I bought some bread. We had lunch together.','זכרת ש־went home נאמר בלי to, וש־goed ו־taked הן טעויות'],
  rule:'פעלים נפוצים משנים צורה בעבר, ומשתמשים באותה צורה לכל אדם. went home בלי to.',
  say:[['I went to the market.','הלכתי לשוק.'],['I bought some bread.','קניתי קצת לחם.'],['I took a bus to work.','לקחתי אוטובוס לעבודה.']] } });

/* ================= יחידה 14 ================= */
unit(14,{ stage:3, title:'מה לא עשיתי? האם עשית?', promise:'תדע להגיד מה לא עשית אתמול ולשאול ולענות על העבר',
 videoMins:10, practiceMins:12,
 before:{
  learn:['להגיד "לא" בעבר: I didn\'t go to the office. (אחרי didn\'t הפועל חוזר לצורת הבסיס)','לשאול בעבר: Did you go to the market? What did you do yesterday?','לענות בקצרה: Yes, I did. No, he didn\'t. (עם was ו־were משתמשים ב־wasn\'t ו־weren\'t)'],
  meet:[["didn't",'לא (בעבר)'],['did','האם (בעבר)'],['lunch','ארוחת צהריים'],['time','זמן'],['late','מאוחר']] },
 words:[
  w("didn't",'לא (בעבר)',"I didn't go to the office.",'לא הלכתי למשרד.'),
  w('did','פועל עזר לשאלה בעבר','Did you go to the market?','האם הלכת לשוק?'),
  w('go','ללכת','Did you go to the market?','האם הלכת לשוק?'),
  w('see','לראות',"He didn't see Dan.",'הוא לא ראה את דן.'),
  w('eat','לאכול',"We didn't eat lunch.",'לא אכלנו ארוחת צהריים.'),
  w('come','לבוא','Did he come?','האם הוא בא?'),
  w('lunch','ארוחת צהריים','Did you eat lunch with your father?','האם אכלת ארוחת צהריים עם אבא שלך?'),
  w('time','זמן',"I didn't have time.",'לא היה לי זמן.'),
  w('call','להתקשר','Did you call him last night?','האם התקשרת אליו אתמול בלילה?'),
  w('late','מאוחר','He worked late.','הוא עבד עד מאוחר.') ],
 ex:[
  fl("I ___ go to the office.",["didn't","don't"],'לא הלכתי למשרד',"didn't הוא ה\"לא\" של העבר. don't שייך להווה."),
  fl('Did you ___ to the market?',['go','went'],'האם הלכת לשוק?','did כבר מראה את העבר, ולכן הפועל חוזר לצורת הבסיס: go, ולא went.'),
  fl('Did he ___?',['come','comes','came'],'האם הוא בא?','אחרי Did הפועל פשוט, בלי s ובלי צורת עבר. Did זהה לכל האנשים.'),
  ch('איזה משפט נכון?',["I didn't go to the office.",'I not went to the office.',"I didn't went to the office."],"didn't כבר נושא את העבר, והפועל אחריו נשאר פשוט: go."),
  ch('איך עונים בקצרה "כן" לשאלה Did you eat lunch?',['Yes, I did.','Yes, I do.','Yes, I was.'],'בתשובה קצרה מחזירים את המילה did. do שייכת להווה, ו־was היא של to be.'),
  li("He didn't see Dan.",["He didn't see Dan.","He didn't call Dan.",'He saw Dan.'],"He didn't see Dan פירושו \"הוא לא ראה את דן\". אחרי didn't בא see ולא saw."),
  or('מה עשית אתמול?',['What','did','you','do','yesterday'],'What did you do yesterday?','בשאלה עם מילת שאלה: What + did + you + do. הפועל do בצורת הבסיס.'),
  ty('לא היה לי זמן',["I didn't have time."],"didn't + have: לא היה לי. אחרי didn't הפועל have נשאר בצורת הבסיס."),
  cp('Did you go to the market?','האם הלכת לשוק?','העתיקו בדיוק. שימו לב: Did בתחילת השאלה, go בצורת הבסיס, וסימן שאלה בסוף.'),
  sp("No, I didn't.") ],
 quiz:[
  ch('איזה משפט נכון?',["I didn't go to the office.","I didn't went to the office."],"didn't כבר מראה את העבר, ולכן go ולא went."),
  ch('איזה משפט נכון?',['Did you go to the market?','Did you went to the market?'],'אחרי Did הפועל חוזר לצורת הבסיס.'),
  ch('איזה משפט נכון?',['Did he come?','Did he comes?'],'אין Did עם s. הפועל נשאר פשוט, גם עם he.'),
  ch('איך אומרים "לא" בעבר עם was ו־were?',["wasn't / weren't","didn't","don't"],"עם was ו־were לא משתמשים ב־didn't אלא ב־wasn't ו־weren't, כמו ביחידה 11."),
  ch('איך עונים "לא" לשאלה Did he come?',["No, he didn't.","No, he don't.",'No, he not.'],"בתשובה קצרה מחזירים את didn't.") ],
 recap:{
  bullets:["אמרת \"לא\" בעבר: I didn't go to the office. He didn't see Dan.",'שאלת בעבר: Did you go to the market? What did you do yesterday?','ענית בקצרה: Yes, I did. No, he didn\'t.'],
  rule:"בעבר: didn't או Did, ואחריהם הפועל בצורת הבסיס.",
  say:[["I didn't go to the office.",'לא הלכתי למשרד.'],['Did you go to the market?','האם הלכת לשוק?'],['What did you do yesterday?','מה עשית אתמול?']] } });

/* ================= יחידה 15 ================= */
unit(15,{ stage:3, title:'מה אני הולך לעשות?', promise:'תדע לספר על תוכניות לשבוע הבא ולהבטיח "אעזור לך"',
 videoMins:10, practiceMins:14,
 before:{
  learn:['לספר על תוכנית שכבר החלטת עליה: I am going to call Dan. (am / is / are + going to + פועל)','להבטיח או להחליט ברגע: I will help you. (will + פועל, בלי to ובלי s)','לקצר ולומר "לא": I\'ll call you soon. I won\'t be late.'],
  meet:[['going to','הולך ל…'],['tomorrow','מחר'],['next week','בשבוע הבא'],['will','מילת עתיד'],['soon','בקרוב']] },
 words:[
  w('going to','הולך ל… (תוכנית)','I am going to call Dan.','אני הולך להתקשר לדן.'),
  w('tomorrow','מחר','We are going to work tomorrow.','אנחנו הולכים לעבוד מחר.'),
  w('tonight','הערב',"I'll call you tonight.",'אתקשר אליך הערב.'),
  w('next week','בשבוע הבא','We will meet next week.','ניפגש בשבוע הבא.'),
  w('soon','בקרוב','See you soon.','נתראה בקרוב.'),
  w('will','מילת עתיד (הבטחה או החלטה)','I will help you.','אעזור לך.'),
  w("I'll",'אני אעשה (בקיצור)',"I'll call you soon.",'אתקשר אליך בקרוב.'),
  w("won't",'לא אעשה (בקיצור)',"I won't be late.",'לא אאחר.'),
  w('finish','לסיים',"I'm going to finish my work.",'אני הולך לסיים את העבודה שלי.'),
  w('visit','לבקר','He is going to visit his father next week.','הוא הולך לבקר את אבא שלו בשבוע הבא.') ],
 ex:[
  fl('I ___ going to call Dan.',['am','is','are'],'אני הולך להתקשר לדן','עם I בא am לפני going to.'),
  fl('He ___ going to visit his father.',['is','am','are'],'הוא הולך לבקר את אבא שלו','עם he בא is לפני going to.'),
  fl('I will ___ you.',['help','to help','helps'],'אעזור לך','אחרי will הפועל בא ישר: בלי to ובלי s, לכל האנשים.'),
  ch('איזה משפט נכון?',['I am going to call Dan.','I going to call Dan.'],'חסר am. בעברית אומרים "אני הולך", אבל באנגלית צריך am, is או are לפני going.'),
  ch('איזה משפט נכון?',['I will help you.','I will to help you.'],'אחרי will אין to. הפועל בא ישר, כמו אחרי can.'),
  li("I won't be late.",["I won't be late.",'I will be late.','I was late.'],"won't היא will not. I won't be late פירושו \"לא אאחר\"."),
  or('אנחנו הולכים לעבוד מחר',['We','are','going','to','work','tomorrow'],'We are going to work tomorrow.','We + are + going to + work. עם we בא are.'),
  ty('לא אאחר',["I won't be late."],"won't = will not. אחרי won't בא פועל בצורת הבסיס: be."),
  cp('I will help you.','אעזור לך.','העתיקו בדיוק. שימו לב: will ואחריה help בלי to.'),
  sp('See you soon.') ],
 quiz:[
  ch('איזה משפט נכון?',['He is going to visit his father.','He going to visit his father.'],'עם he בא is לפני going to.'),
  ch('איזה משפט נכון?',['He will help you.','He will helps you.'],'will כבר מטפלת בכל, ולכן אחריה אין s, גם עם he.'),
  fl('We ___ going to work tomorrow.',['are','is'],'אנחנו הולכים לעבוד מחר','עם we, you ו־they בא are.'),
  ch('איזה ביטוי מתאים להבטחה או להחלטה ברגע?',['will','am going to','did'],'will להבטחה או להחלטה ברגע. going to לתוכנית שכבר החלטנו עליה מראש.'),
  ch('מהו הקיצור של will not?',["won't","willn't","don't"],"will not הופך ל־won't. הקיצור של I will הוא I'll.") ],
 recap:{
  bullets:['סיפרת על תוכניות: I am going to call Dan. We are going to work tomorrow.','הבטחת והחלטת ברגע: I will help you. I\'ll call you soon.','אמרת "לא אעשה": I won\'t be late'],
  rule:'תוכנית: am / is / are + going to + פועל. הבטחה: will + פועל, בלי to.',
  say:[['I am going to call Dan.','אני הולך להתקשר לדן.'],['I will help you.','אעזור לך.'],["I won't be late.",'לא אאחר.']] } });

 return U;
})();

/* The three stages (unit 0 is an optional opener, recommended before unit 1 for learners who cannot read English letters). */
const UNIT_STAGES = [
 { n:0, title:'פתיחה: קוראים אנגלית', units:[0], optional:true, promise:'תדע לקרוא בקול מילים קצרות באנגלית, בלי תעתיק', note:'מומלץ למי שלא קורא אותיות באנגלית. מי שקורא יכול להתחיל מיחידה 1.' },
 { n:1, title:'יסודות', units:[1,2,3,4,5], promise:'תדע להציג את עצמך, לספר על המשפחה והיום שלך, ולשאול ולענות שאלות פשוטות של כן ולא' },
 { n:2, title:'הווה ושאלות', units:[6,7,8,9,10], promise:'תדע לספר מה קורה עכשיו, לומר איפה ומתי, לשאול שאלות שימושיות ולקנות בשוק' },
 { n:3, title:'עבר ועתיד', units:[11,12,13,14,15], promise:'תדע לספר מה היה, מה עשית ומה לא עשית, ומה אתה הולך לעשות' } ];

/* Review checkpoints (spaced repetition): a short review after units 3, 5, 8, 10, 13, 15. Items are the quiz questions of the
   newest units plus two questions from each older unit listed in "older", so earlier material comes back. Pass mark 80%. */
const UNIT_REVIEWS = (() => {
 const Q=(n,idx)=>idx.map(i=>UNIT_CONTENT[n].quiz[i]);
 const defs=[ {after:3, fresh:[1,2,3], older:[]}, {after:5, fresh:[4,5], older:[1,2,3]}, {after:8, fresh:[6,7,8], older:[3,4,5]},
  {after:10, fresh:[9,10], older:[5,7,8]}, {after:13, fresh:[11,12,13], older:[6,8,10]}, {after:15, fresh:[14,15], older:[9,11,13]} ];
 return defs.map(d=>{
  const old=d.older.flatMap(n=>Q(n,[1,3])), fresh=d.fresh.flatMap(n=>Q(n,[0,2,4]));
  const units=[...d.older,...d.fresh];
  return { after:d.after, title:'חזרה אחרי יחידה '+d.after, units, pass:80,
   items:[...old,...fresh].slice(0,12), words:units.flatMap(n=>UNIT_CONTENT[n].words.map(x=>x.en)) };
 });
})();

/* Stage-end tests: 15 scored questions (3 per unit, from the quiz of each unit) + 3 speaking prompts (not scored). Pass mark 80%. */
const STAGE_TESTS = (() => {
 const out={};
 UNIT_STAGES.filter(s=>s.n>=1).forEach(s=>{
  const items=s.units.flatMap(n=>[0,2,4].map(i=>UNIT_CONTENT[n].quiz[i]));
  const say=[0,2,4].map(i=>({t:'speak', en:UNIT_CONTENT[s.units[i]].recap.say[0][0]}));
  out[s.n]={ stage:s.n, title:'מבחן סיום שלב '+s.n+': '+s.title, after:s.units[s.units.length-1], pass:80, items:[...items,...say] };
 });
 return out;
})();

if(typeof module!=='undefined') module.exports={UNIT_CONTENT,UNIT_STAGES,UNIT_REVIEWS,STAGE_TESTS};
