/* spoken conversation scenarios. ok: words/phrases that make a fitting answer; free: any English answer is fine */
const TALKS = [
 { id:'meet', cover:'👋', title:'Nice to meet you', he:'היכרות', level:1, steps:[
  { bot:"Hi! I'm Lumi. What's your name?", he:'היי! אני לומי. איך קוראים לך?', free:true, save:'name',
    say:[["My name is Dana.",'קוראים לי דנה.'],["I'm Noam.",'אני נועם.']] },
  { bot:'Nice to meet you, {name}! How are you today?', he:'נעים להכיר, {name}! מה שלומך היום?', ok:['fine','good','great','ok','okay','well','not bad','so so','tired','happy','bad','excellent','amazing','alright','all right'],
    say:[["I'm fine, thank you. And you?",'אני בסדר, תודה. ואתה?'],["I'm good, thanks.",'אני טוב, תודה.'],["I'm a little tired.",'אני קצת עייף.']] },
  { bot:"I'm great, thanks! Where are you from?", he:'אני מצוין, תודה! מאיפה אתה?', free:true,
    say:[["I'm from Israel.",'אני מישראל.'],['I live in Tel Aviv.','אני גר בתל אביב.']] },
  { bot:'Cool! How old are you?', he:'מגניב! בן כמה אתה?', ok:['old','years','#'],
    say:[["I'm twenty-five years old.",'אני בן עשרים וחמש.'],["I'm thirty.",'אני בן שלושים.']] },
  { bot:'What do you like to do in your free time?', he:'מה אתה אוהב לעשות בזמן הפנוי?', free:true,
    say:[['I like to read books.','אני אוהב לקרוא ספרים.'],['I like music and sports.','אני אוהב מוזיקה וספורט.']] },
  { bot:'That sounds fun! It was nice talking to you. Bye!', he:'נשמע כיף! היה נחמד לדבר איתך. ביי!', ok:['bye','goodbye','see you','you too','thank','thanks','nice'],
    say:[['Bye! See you soon.','ביי! נתראה בקרוב.'],['Nice talking to you too!','גם לי היה נחמד לדבר איתך!']] }
 ]},
 { id:'cafe', cover:'☕', title:'At the café', he:'בבית קפה', level:1, steps:[
  { bot:'Hi! What would you like to drink?', he:'היי! מה תרצה לשתות?', ok:['coffee','tea','water','juice','cola','coke','milk','latte','cappuccino','espresso','soda','chocolate','lemonade',"i'd like",'can i have','please'],
    say:[['A coffee, please.','קפה, בבקשה.'],['Can I have a tea, please?','אפשר תה, בבקשה?'],["I'd like an orange juice.",'הייתי רוצה מיץ תפוזים.']] },
  { bot:'Sure. Small or large?', he:'בטח. קטן או גדול?', ok:['small','large','big','medium','regular'],
    say:[['Large, please.','גדול, בבקשה.'],['Small, please.','קטן, בבקשה.']] },
  { bot:'Would you like something to eat?', he:'תרצה משהו לאכול?', ok:['yes','no','cake','sandwich','cookie','croissant','salad','nothing','muffin','toast','please','thank'],
    say:[['Yes, a sandwich, please.','כן, כריך בבקשה.'],['No, thank you.','לא, תודה.']] },
  { bot:"OK. That's twenty shekels. Cash or card?", he:'בסדר. זה עשרים שקלים. מזומן או כרטיס?', ok:['cash','card','credit'],
    say:[['Card, please.','בכרטיס, בבקשה.'],['Cash.','מזומן.']] },
  { bot:'Here you go. Have a nice day!', he:'בבקשה. יום נעים!', ok:['thank','thanks','you too','bye'],
    say:[['Thank you! You too.','תודה! גם לך.'],['Thanks, bye!','תודה, ביי!']] }
 ]},
 { id:'shop', cover:'👕', title:'In a clothing store', he:'בחנות בגדים', level:2, steps:[
  { bot:'Hello! Can I help you?', he:'שלום! אפשר לעזור לך?', ok:['looking','want','need','yes','no','shirt','shoes','dress','pants','jacket','just'],
    say:[["Yes, I'm looking for a shirt.",'כן, אני מחפש חולצה.'],["No, thanks. I'm just looking.",'לא, תודה. אני רק מסתכל.']] },
  { bot:'What size do you need?', he:'איזו מידה אתה צריך?', ok:['small','medium','large','size','extra','#','s','m','l','xl'],
    say:[['Medium, please.','מדיום, בבקשה.'],["I'm a large.",'אני לארג׳.']] },
  { bot:'What color do you like?', he:'איזה צבע אתה אוהב?', ok:['black','white','blue','red','green','yellow','gray','grey','pink','purple','brown','orange','color'],
    say:[['Blue, please.','כחול, בבקשה.'],['I like black.','אני אוהב שחור.']] },
  { bot:'Here you are. Do you want to try it on?', he:'בבקשה. תרצה למדוד?', ok:['yes','no','sure','ok','okay','please','thank'],
    say:[['Yes, please. Where is the fitting room?','כן, בבקשה. איפה תא המדידה?'],['No, thank you.','לא, תודה.']] },
  { bot:"It's eighty shekels.", he:'זה שמונים שקלים.', ok:['take','buy','ok','okay','expensive','cheaper','discount','great','fine','pay'],
    say:[["OK, I'll take it.",'בסדר, אני אקח את זה.'],["That's too expensive.",'זה יקר מדי.']] },
  { bot:'Thank you for shopping with us. Goodbye!', he:'תודה שקנית אצלנו. להתראות!', ok:['thank','thanks','bye','goodbye'],
    say:[['Thank you. Goodbye!','תודה. להתראות!']] }
 ]},
 { id:'way', cover:'🗺️', title:'Asking for directions', he:'שאלת דרך', level:2, steps:[
  { bot:'Hi! You look lost. Can I help you?', he:'היי! נראה שהלכת לאיבוד. אפשר לעזור?', ok:['yes','where','looking','station','bank','hotel','museum','how do i','get to','find','please','excuse'],
    say:[['Yes, please. Where is the train station?','כן, בבקשה. איפה תחנת הרכבת?'],['Excuse me, how do I get to the bank?','סליחה, איך מגיעים לבנק?']] },
  { bot:'Go straight and turn left at the bank. Do you understand?', he:'לך ישר ופנה שמאלה ליד הבנק. הבנת?', ok:['yes','understand','got it','no','again','repeat','left','ok','okay','sorry','slowly'],
    say:[['Yes, I understand. Thank you.','כן, הבנתי. תודה.'],['Sorry, can you say that again?','סליחה, אתה יכול להגיד את זה שוב?']] },
  { bot:"It's about five minutes on foot.", he:'זה בערך חמש דקות ברגל.', ok:['thank','thanks','great','ok','okay','far','close','good'],
    say:[['Great, thank you so much!','מעולה, תודה רבה!'],['Is it far?','זה רחוק?']] },
  { bot:"You're welcome. Good luck!", he:'בבקשה. בהצלחה!', ok:['thank','thanks','bye','you too'],
    say:[['Thanks, bye!','תודה, ביי!']] }
 ]},
 { id:'day', cover:'🍕', title:'How was your day?', he:'איך היה היום שלך?', level:2, steps:[
  { bot:'Hey! How was your day?', he:'היי! איך היה היום שלך?', ok:['good','great','bad','ok','okay','fine','long','busy','tired','nice','boring','amazing','terrible','so so','not bad'],
    say:[['It was great, thanks.','היה מצוין, תודה.'],['It was a long day.','זה היה יום ארוך.']] },
  { bot:'Oh really? What did you do today?', he:'באמת? מה עשית היום?', free:true,
    say:[['I worked and then I went to the gym.','עבדתי ואחר כך הלכתי לחדר כושר.'],['I studied English.','למדתי אנגלית.']] },
  { bot:'Nice! Are you hungry?', he:'יפה! אתה רעב?', ok:['yes','no','little','starving','bit','very','not'],
    say:[['Yes, I am very hungry.','כן, אני מאוד רעב.'],['A little.','קצת.']] },
  { bot:"Let's order pizza. Do you like pizza?", he:'בוא נזמין פיצה. אתה אוהב פיצה?', ok:['yes','no','love','like','sure','great','idea'],
    say:[['Yes, I love pizza!','כן, אני אוהב פיצה!'],["Sure, good idea.",'בטח, רעיון טוב.']] },
  { bot:"Great, I'll order now. See you soon!", he:'מעולה, אני מזמין עכשיו. נתראה בקרוב!', ok:['bye','see you','ok','okay','great','thanks','cool'],
    say:[['OK, see you soon!','בסדר, נתראה בקרוב!']] }
 ]},
 { id:'doctor', cover:'🩺', title:'At the doctor', he:'אצל הרופא', level:3, steps:[
  { bot:"Hello. What's the problem?", he:'שלום. מה הבעיה?', ok:['hurt','hurts','pain','sick','fever','cough','headache','ache','feel','cold','throat','stomach','tired'],
    say:[['I have a headache.','יש לי כאב ראש.'],['My stomach hurts.','כואבת לי הבטן.'],['I have a fever and a cough.','יש לי חום ושיעול.']] },
  { bot:'How long have you felt like this?', he:'כמה זמן אתה מרגיש ככה?', ok:['day','days','week','weeks','yesterday','since','morning','hours','today','#'],
    say:[['Since yesterday.','מאתמול.'],['For two days.','כבר יומיים.']] },
  { bot:'Do you have a fever?', he:'יש לך חום?', ok:['yes','no','little','think','not','high'],
    say:[['Yes, a little.','כן, קצת.'],["No, I don't.",'לא, אין לי.']] },
  { bot:'OK. Take this medicine twice a day and drink a lot of water.', he:'בסדר. קח את התרופה הזאת פעמיים ביום ותשתה הרבה מים.', ok:['ok','okay','thank','thanks','sure','will','understand'],
    say:[['OK, thank you, doctor.','בסדר, תודה, דוקטור.'],['How many days?','כמה ימים?']] },
  { bot:'Feel better soon!', he:'החלמה מהירה!', ok:['thank','thanks','bye'],
    say:[['Thank you. Goodbye!','תודה. להתראות!']] }
 ]}
];
