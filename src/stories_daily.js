/* Level 1 everyday stories (tag: יומיום) */
const DAILY_STORIES = [
 { id:'coffee', cover:'☕', title:'Morning Coffee', he:'קפה של בוקר', blurb:'דן מתחיל את היום ליד החלון.', paras:[
  { en:'Every morning, Dan wakes up at seven o\'clock. He goes to the kitchen and makes a hot cup of coffee. He likes to drink it near the window.', he:'בכל בוקר דן מתעורר בשבע. הוא הולך למטבח ומכין כוס קפה חם. הוא אוהב לשתות אותו ליד החלון.' },
  { en:'The sun is bright, and the street is quiet. Dan eats one slice of toast with cheese. Then, he is ready to start his day.', he:'השמש זורחת, והרחוב שקט. דן אוכל פרוסת טוסט אחת עם גבינה. אחר כך הוא מוכן להתחיל את היום.' } ]},
 { id:'market', cover:'🛒', title:'At the Supermarket', he:'בסופרמרקט', blurb:'שרה קונה בדיוק מה שצריך לארוחת ערב.', paras:[
  { en:'Sara goes to the supermarket with a small list. She needs milk, bread, eggs, and fresh apples. She walks slowly and puts the food in her basket.', he:'שרה הולכת לסופרמרקט עם רשימה קטנה. היא צריכה חלב, לחם, ביצים ותפוחים טריים. היא הולכת לאט ושמה את האוכל בסל.' },
  { en:'At the checkout, she pays with her card and smiles at the cashier. Now she can go home and cook a nice dinner.', he:'בקופה היא משלמת בכרטיס ומחייכת לקופאית. עכשיו היא יכולה ללכת הביתה ולבשל ארוחת ערב טובה.' } ]},
 { id:'citybus', cover:'🚍', title:'Taking the Bus', he:'נסיעה באוטובוס', blurb:'טום בדרך לעבודה, עם מוזיקה רגועה.', paras:[
  { en:'Tom waits at the bus stop near his house. He checks the time on his phone. Two minutes later, the green bus arrives.', he:'טום מחכה בתחנת האוטובוס ליד הבית שלו. הוא בודק את השעה בטלפון. שתי דקות אחר כך מגיע האוטובוס הירוק.' },
  { en:'Tom gets on and taps his bus card. He finds an empty seat by the window. He listens to calm music until he reaches his office in the city.', he:'טום עולה ומעביר את כרטיס האוטובוס. הוא מוצא מושב פנוי ליד החלון. הוא מקשיב למוזיקה רגועה עד שהוא מגיע למשרד שלו בעיר.' } ]},
 { id:'rainy', cover:'🌧️', title:'A Rainy Day', he:'יום גשום', blurb:'מאיה, מטרייה כחולה, ותה חם בסוף.', paras:[
  { en:'Today the sky is dark and gray. Rain falls softly on the roof. Maya puts on her warm coat and takes her blue umbrella.', he:'היום השמיים חשוכים ואפורים. הגשם יורד בעדינות על הגג. מאיה לובשת את המעיל החם שלה ולוקחת את המטרייה הכחולה.' },
  { en:'She walks carefully so she does not step in the water. When she gets home, she drinks hot tea and reads a good book on the sofa.', he:'היא הולכת בזהירות כדי לא לדרוך במים. כשהיא מגיעה הביתה, היא שותה תה חם וקוראת ספר טוב על הספה.' } ]},
 { id:'train', cover:'🚆', title:'Buying a Train Ticket', he:'קניית כרטיס רכבת', blurb:'אלכס נוסע לבקר חבר בעיר אחרת.', paras:[
  { en:'Alex wants to visit his friend in another city. He goes to the train station early in the morning. He uses the ticket machine to buy a round-trip ticket.', he:'אלכס רוצה לבקר את החבר שלו בעיר אחרת. הוא הולך לתחנת הרכבת מוקדם בבוקר. הוא משתמש במכונת הכרטיסים כדי לקנות כרטיס הלוך ושוב.' },
  { en:'The train leaves from platform two at nine o\'clock. Alex finds his seat, relaxes, and looks at the green fields outside.', he:'הרכבת יוצאת מרציף שתיים בשעה תשע. אלכס מוצא את המקום שלו, נרגע ומסתכל על השדות הירוקים בחוץ.' } ]},
 { id:'pasta', cover:'🍝', title:'Cooking Dinner', he:'בישול ארוחת ערב', blurb:'בן מבשל פסטה לכל המשפחה.', paras:[
  { en:'Tonight, Ben wants to cook pasta for his family. He boils water in a big pot. While the pasta cooks, he cuts fresh tomatoes and onions for the sauce.', he:'הערב בן רוצה לבשל פסטה למשפחה שלו. הוא מרתיח מים בסיר גדול. בזמן שהפסטה מתבשלת, הוא חותך עגבניות ובצל טריים לרוטב.' },
  { en:'The kitchen smells wonderful. Everyone sits around the table, eats together, and talks about their day.', he:'במטבח יש ריח נפלא. כולם יושבים סביב השולחן, אוכלים יחד ומדברים על היום שלהם.' } ]},
 { id:'clinic', cover:'🩺', title:"At the Doctor's Office", he:'אצל הרופא', blurb:'לנועה כואב הגרון. הרופא יודע מה לעשות.', paras:[
  { en:'Noa has a sore throat and feels tired. She goes to see her doctor in the afternoon. The doctor checks her throat and listens to her breathing.', he:'לנועה כואב הגרון והיא מרגישה עייפה. היא הולכת לרופא שלה אחר הצהריים. הרופא בודק לה את הגרון ומקשיב לנשימה שלה.' },
  { en:'He says she just needs to rest and drink plenty of water. Noa goes home, rests in bed, and feels better the next day.', he:'הוא אומר שהיא רק צריכה לנוח ולשתות הרבה מים. נועה הולכת הביתה, נחה במיטה ומרגישה טוב יותר למחרת.' } ]},
 { id:'dogwalk', cover:'🐕', title:'Walking the Dog', he:'טיול עם הכלב', blurb:'ליאו, הכלב מקס וכדור צהוב.', paras:[
  { en:'Every evening, Leo takes his brown dog, Max, to the park. Max loves to run on the green grass and chase his yellow ball.', he:'בכל ערב ליאו לוקח את הכלב החום שלו, מקס, לפארק. מקס אוהב לרוץ על הדשא הירוק ולרדוף אחרי הכדור הצהוב שלו.' },
  { en:'Leo throws the ball, and Max brings it back happily. After thirty minutes, they walk home together. Max drinks water and goes to sleep.', he:'ליאו זורק את הכדור, ומקס מחזיר אותו בשמחה. אחרי שלושים דקות הם הולכים הביתה יחד. מקס שותה מים והולך לישון.' } ]},
 { id:'shirt', cover:'👔', title:'A New Shirt', he:'חולצה חדשה', blurb:'דוד מוצא בדיוק את החולצה הנכונה.', paras:[
  { en:'David needs a new shirt for work. He enters a clothing store in the mall. He looks at many colors and chooses a light blue shirt.', he:'דוד צריך חולצה חדשה לעבודה. הוא נכנס לחנות בגדים בקניון. הוא מסתכל על הרבה צבעים ובוחר חולצה תכלת.' },
  { en:'He tries it on in the fitting room. The size is perfect, and the fabric feels soft. He buys the shirt and leaves the store happy.', he:'הוא מודד אותה בתא המדידה. המידה מושלמת, והבד מרגיש רך. הוא קונה את החולצה ויוצא מהחנות שמח.' } ]},
 { id:'delivery', cover:'🍕', title:'Ordering Food', he:'הזמנת אוכל', blurb:'רחל עייפה מדי לבשל. יש אפליקציה בשביל זה.', paras:[
  { en:'It is Friday night, and Rachel is too tired to cook. She opens a food app on her phone and orders a vegetable pizza and a small salad.', he:'זה ליל שישי, ורחל עייפה מדי כדי לבשל. היא פותחת אפליקציית אוכל בטלפון ומזמינה פיצה עם ירקות וסלט קטן.' },
  { en:'Thirty minutes later, the delivery driver rings the doorbell. Rachel thanks him, opens the warm box, and enjoys her easy dinner.', he:'שלושים דקות אחר כך השליח מצלצל בפעמון. רחל מודה לו, פותחת את הקופסה החמה ונהנית מארוחת ערב קלה.' } ]},
 { id:'cleaning', cover:'🧹', title:'Cleaning the House', he:'ניקיון הבית', blurb:'אדם מנקה, והבית מתמלא אור.', paras:[
  { en:'On Sunday morning, Adam cleans his apartment. First, he opens all the windows to let fresh air inside. He washes the dishes in the sink and sweeps the floor.', he:'ביום ראשון בבוקר אדם מנקה את הדירה שלו. קודם הוא פותח את כל החלונות כדי להכניס אוויר צח. הוא שוטף את הכלים בכיור ומטאטא את הרצפה.' },
  { en:'Then, he puts his clothes neatly in the closet. When he finishes, the house looks clean, bright, and peaceful.', he:'אחר כך הוא מסדר את הבגדים שלו בארון. כשהוא מסיים, הבית נראה נקי, מואר ושליו.' } ]},
 { id:'bakery', cover:'🥐', title:'At the Bakery', he:'במאפייה', blurb:'ריח של לחם טרי ואמה שלא מתאפקת.', paras:[
  { en:'Emma walks past the local bakery on her way home. The smell of fresh bread is amazing. She steps inside and buys two warm croissants and a loaf of brown bread.', he:'אמה עוברת ליד המאפייה השכונתית בדרך הביתה. הריח של הלחם הטרי מדהים. היא נכנסת וקונה שני קרואסונים חמים וכיכר לחם מלא.' },
  { en:'The baker puts them in a paper bag. Emma eats one croissant right away because it is still warm.', he:'האופה שם אותם בשקית נייר. אמה אוכלת קרואסון אחד מיד, כי הוא עוד חם.' } ]},
 { id:'gym', cover:'🏋️', title:'Going to the Gym', he:'בחדר הכושר', blurb:'יוני מתאמן, ומרגיש חזק יותר.', paras:[
  { en:'After work, Yoni goes to the gym near his office. He puts on his sports shoes and fills his water bottle. First, he walks on the machine for ten minutes.', he:'אחרי העבודה יוני הולך לחדר הכושר ליד המשרד שלו. הוא נועל את נעלי הספורט וממלא את בקבוק המים. קודם הוא הולך על המכשיר עשר דקות.' },
  { en:'Then, he lifts light weights and does some easy exercises. He feels tired but strong. At home, he takes a warm shower and sleeps well.', he:'אחר כך הוא מרים משקולות קלות ועושה כמה תרגילים קלים. הוא מרגיש עייף אבל חזק. בבית הוא מתקלח במים חמים וישן טוב.' } ]},
 { id:'phonecall', cover:'📞', title:'A Phone Call', he:'שיחת טלפון', blurb:'לירון מתקשרת לחברה ומתכננת סוף שבוע.', paras:[
  { en:'Liron calls her friend Gal on Thursday evening. "Hi, Gal! How are you?" she asks. Gal is happy to hear her voice. They talk about work and family.', he:'לירון מתקשרת לחברה שלה גל ביום חמישי בערב. "היי, גל! מה שלומך?" היא שואלת. גל שמחה לשמוע את הקול שלה. הן מדברות על העבודה ועל המשפחה.' },
  { en:'Then Liron asks, "Do you want to meet on Saturday?" Gal says yes. They plan to drink coffee together at noon. Liron writes it in her calendar.', he:'אחר כך לירון שואלת: "את רוצה להיפגש בשבת?" גל אומרת כן. הן מתכננות לשתות קפה יחד בצהריים. לירון כותבת את זה ביומן שלה.' } ]},
 { id:'beach', cover:'🏖️', title:'A Day at the Beach', he:'יום בחוף הים', blurb:'שמש, מים כחולים וגלידה.', paras:[
  { en:'On a hot summer day, Omer goes to the beach with his sister. They bring a big towel, sunscreen, and cold drinks. The water is blue and clear.', he:'ביום קיץ חם עומר הולך לחוף הים עם אחותו. הם מביאים מגבת גדולה, קרם הגנה ומשקאות קרים. המים כחולים וצלולים.' },
  { en:'Omer swims in the sea, and his sister builds a castle in the sand. Later, they buy ice cream and watch the sun go down.', he:'עומר שוחה בים, ואחותו בונה ארמון בחול. אחר כך הם קונים גלידה ומסתכלים על השמש שוקעת.' } ]}
];
DAILY_STORIES.forEach(s=>{ s.level=1; s.tags=['יומיום']; });

STORIES.splice(3,0,...DAILY_STORIES);
