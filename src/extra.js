/* ---------- parts of speech + example sentence bank ---------- */
const POS_SETS = {
  'מילת יחס': 'about above across after along among around at before behind below beside between by during for from in inside into near of off on onto out outside over through to under until up down with without including',
  'תואר הפועל': 'again almost also always away back already yet often usually now then soon later here there today tomorrow yesterday together maybe perhaps really quite very too just only even still never sometimes once nearby nearly instead however well exactly simply suddenly slowly quietly carefully gently deeply unusually enough everywhere somewhere',
  'כינוי גוף': 'i you he she it we they me him her us them my your his its our their mine yours hers ours theirs myself yourself himself herself itself themselves this that these those who which whose what someone somebody anyone anything something nothing nobody everybody everyone everything',
  'מילת קישור': 'and but or because if so than as while when since',
  'מספר': 'one two three four five six seven eight nine ten eleven twelve fourteen twenty thirty forty fifty hundred thousand million billion first second third fourth half',
  'קריאה': 'hello goodbye bye oh hmm yes okay ok please thanks sorry welcome',
  'פועל עזר': 'is are am was were be been has have had do does did can cannot could would should will must may might',
  'מילית': 'a an the some any all both each every no other another such many much more most less few not',
  'מילת שאלה': 'how why where',
  'שם תואר': 'afraid alone amazing angry bad beautiful big black blue boring brave bright brilliant broken brown busy careful cheap clean clear closed cold cool crazy curious dangerous dark dead deep delicious different difficult dirty disappointed dry early easy empty expensive false famous fast favorite flat free frozen full funny golden good gray great green happy hard healthy heavy high hot human hungry important impossible interesting large last late little living long loud low loyal lucky main messy mobile modest nervous new next nice old olympic open orange own perfect pink plastic polite poor possible pretty primary public purple quick quiet rainy ready real red respected rich right round sad safe same serious short sick silent silly silver simple slow small smart soft sore sour special strange strong sugary sure surprising sweet tall terrible thick thin thirsty tidy tiny tired true ugly united unusual warm weak wet white whole wide wonderful wooden worried wounded wrong yellow young grown known worth far born following mean light',
  'פועל': 'say see sing clean cook dance laugh love make need help burn leave like close land give named waves answers buys carries cleans closes comes cooks falls feels finds flies gets gives goes jumps lands laughs lives looks loves makes moves opens plays reads runs says sees shouts sings sits smiles starts stops thinks tries waits wants washes watches takes',
  'פועל (צורת עבר)': 'done gone got left'
};
const POS_OF = {};
for(const label in POS_SETS) POS_SETS[label].split(' ').forEach(w=>{ (POS_OF[w]=POS_OF[w]||[]).push(label); });
const NOT_INFINITIVE = new Set(['לילה','לימון','לונדון','לחוץ','למידה','לפעמים','למעלה','למטה','לפני','לתוך','לעתים','לרוחב','לאורך','לבן','לבד','לומד','לוקח']);
const BANK_SRC = `My brother and my sister are at home.|אח שלי ואחותי בבית.
Her husband is a teacher.|בעלה הוא מורה.
His wife is a nurse in the hospital.|אשתו היא אחות בבית החולים.
The baby is sleeping now.|התינוק ישן עכשיו.
My uncle and my aunt live on a farm.|דוד שלי ודודה שלי גרים בחווה.
Their son is ten and their daughter is six.|הבן שלהם בן עשר והבת שלהם בת שש.
My cousin is a student.|בן הדוד שלי סטודנט.
Mom, where is my bag?|אמא, איפה התיק שלי?
The king and the queen live in a big house.|המלך והמלכה גרים בבית גדול.
My grandfather and my grandmother love music.|סבא וסבתא שלי אוהבים מוזיקה.
Every child needs a friend.|כל ילד צריך חבר.
The kid is playing with a toy.|הילד משחק בצעצוע.
Men and women work here.|גברים ונשים עובדים כאן.
The key is in my pocket.|המפתח בכיס שלי.
The box is on the floor.|הקופסה על הרצפה.
There is a cat on the roof.|יש חתול על הגג.
The bathroom is next to the bedroom.|חדר האמבטיה ליד חדר השינה.
I write with a pen or a pencil.|אני כותב בעט או בעיפרון.
I got a letter from my friend.|קיבלתי מכתב מחבר שלי.
The computer screen is very bright.|מסך המחשב בהיר מאוד.
This is a photo of my family.|זו תמונה של המשפחה שלי.
He has a new ball.|יש לו כדור חדש.
I wash my clothes every week.|אני מכבס את הבגדים שלי כל שבוע.
He wears a white shirt and black pants.|הוא לובש חולצה לבנה ומכנסיים שחורים.
She has a pretty yellow dress.|יש לה שמלה צהובה ויפה.
Where is my other shoe?|איפה הנעל השנייה שלי?
Take a coat, it is cold outside.|קח מעיל, קר בחוץ.
I eat an egg and cheese for breakfast.|אני אוכל ביצה וגבינה לארוחת בוקר.
Do you want meat or chicken?|אתה רוצה בשר או עוף?
We eat rice with every meal.|אנחנו אוכלים אורז עם כל ארוחה.
An apple is a fruit.|תפוח הוא פרי.
A banana is yellow.|בננה היא צהובה.
This vegetable is very healthy.|הירק הזה בריא מאוד.
Please pass the salt.|תעביר את המלח, בבקשה.
I drink coffee in the morning.|אני שותה קפה בבוקר.
She made a cake for my birthday.|היא הכינה עוגה ליום ההולדת שלי.
The restaurant is cheap and good.|המסעדה זולה וטובה.
The store is closed today.|החנות סגורה היום.
We buy fruit at the market.|אנחנו קונים פירות בשוק.
The price is too expensive.|המחיר יקר מדי.
I have a new job in an office.|יש לי עבודה חדשה במשרד.
Our class has an English lesson today.|לכיתה שלנו יש שיעור אנגלית היום.
English is a beautiful language.|אנגלית היא שפה יפה.
I speak Hebrew at home.|אני מדבר עברית בבית.
There are seven days in a week.|יש שבעה ימים בשבוע.
Yesterday was Monday.|אתמול היה יום שני.
Today is Tuesday and tomorrow is Wednesday.|היום יום שלישי ומחר יום רביעי.
See you on Thursday.|נתראה ביום חמישי.
We rest on Saturday.|אנחנו נחים בשבת.
Sunday is the first day of the week.|יום ראשון הוא היום הראשון בשבוע.
January is the first month of the year.|ינואר הוא החודש הראשון בשנה.
February is a short month.|פברואר הוא חודש קצר.
My birthday is in March.|יום ההולדת שלי במרץ.
It often rains in April.|לעתים קרובות יורד גשם באפריל.
June and July are hot months.|יוני ויולי הם חודשים חמים.
School starts again in October.|בית הספר מתחיל שוב באוקטובר.
November is cold and December is colder.|נובמבר קר ודצמבר קר יותר.
Flowers grow in spring.|פרחים צומחים באביב.
The trees are yellow in autumn.|העצים צהובים בסתיו.
Winter is cold and dark.|החורף קר וחשוך.
The moon and the stars shine at night.|הירח והכוכבים מאירים בלילה.
A star is very far from the earth.|כוכב נמצא רחוק מאוד מכדור הארץ.
There is a gray cloud in the sky.|יש ענן אפור בשמיים.
The air is clean on the mountain.|האוויר נקי על ההר.
The town is on a hill.|העיירה נמצאת על גבעה.
The road goes over the bridge.|הכביש עובר על הגשר.
That building is very tall.|הבניין ההוא גבוה מאוד.
The grass is green and wet.|הדשא ירוק ורטוב.
We swim in the lake.|אנחנו שוחים באגם.
The ocean is deep and wide.|האוקיינוס עמוק ורחב.
The children play on the beach.|הילדים משחקים בחוף.
Nobody lives on the island.|אף אחד לא גר על האי.
A horse is a strong animal.|סוס הוא בעל חיים חזק.
The cow gives us milk.|הפרה נותנת לנו חלב.
A sheep and a pig live on the farm.|כבשה וחזיר גרים בחווה.
The bear is sleeping.|הדוב ישן.
An elephant has a long nose.|לפיל יש אף ארוך.
The monkey eats a banana.|הקוף אוכל בננה.
The rabbit has long ears.|לארנב יש אוזניים ארוכות.
I am afraid of that snake.|אני מפחד מהנחש ההוא.
I have one mouth and two eyes.|יש לי פה אחד ושתי עיניים.
Her hair is long and black.|השיער שלה ארוך ושחור.
My teeth are white.|השיניים שלי לבנות.
My foot hurts.|כף הרגל שלי כואבת.
He cut his finger.|הוא חתך את האצבע.
The boat is on the river.|הסירה על הנהר.
A big ship crossed the ocean.|ספינה גדולה חצתה את האוקיינוס.
I ride my bike to school.|אני רוכב על האופניים לבית הספר.
Look at the map.|תסתכל על המפה.
Sit on this side of the table.|שב בצד הזה של השולחן.
The book is on the top shelf.|הספר על המדף העליון.
The key is at the bottom of the bag.|המפתח בתחתית התיק.
He stood in the middle of the room.|הוא עמד באמצע החדר.
What color is your car?|באיזה צבע המכונית שלך?
A ball has a round shape.|לכדור יש צורה עגולה.
What size is this shirt?|באיזו מידה החולצה הזאת?
We have a small problem.|יש לנו בעיה קטנה.
What is the reason?|מה הסיבה?
We all want peace.|כולנו רוצים שלום.
The king has a lot of power.|למלך יש הרבה כוח.
What is that noise?|מה הרעש הזה?
Fear is a strong feeling.|פחד הוא רגש חזק.
Tell me the truth.|תגיד לי את האמת.
This is a good example.|זו דוגמה טובה.
Our group has five people.|בקבוצה שלנו יש חמישה אנשים.
I love science and art.|אני אוהב מדע ואמנות.
There is no space in the car.|אין מקום במכונית.
Think about the future, not the past.|תחשוב על העתיד, לא על העבר.
Wait a moment, please.|חכה רגע, בבקשה.
His death was very sad.|המוות שלו היה עצוב מאוד.
The table is low.|השולחן נמוך.
The water is warm.|המים חמימים.
The evening is cool.|הערב קריר.
The bus is slow, but the train is quick.|האוטובוס איטי, אבל הרכבת מהירה.
This lesson is easy.|השיעור הזה קל.
Why are you angry?|למה אתה כועס?
I am tired and thirsty.|אני עייף וצמא.
He is rich, but his brother is poor.|הוא עשיר, אבל אחיו עני.
This old hat is ugly.|הכובע הישן הזה מכוער.
She is a nice person.|היא אדם נחמד.
The doctor has a serious face.|לרופא יש פנים רציניות.
The cup is empty.|הכוס ריקה.
This bag is heavy.|התיק הזה כבד.
The music is too loud.|המוזיקה רועשת מדי.
Your answer is right.|התשובה שלך נכונה.
Sorry, that is the wrong answer.|סליחה, זו התשובה הלא נכונה.
Is it true or false?|זה נכון או לא נכון?
This street is safe at night.|הרחוב הזה בטוח בלילה.
I am busy today.|אני עסוק היום.
Are you ready?|אתה מוכן?
Are you sure?|אתה בטוח?
I get up early.|אני קם מוקדם.
Don't be late!|אל תאחר!
This is the main road.|זה הכביש הראשי.
Blue is my favorite color.|כחול הוא הצבע האהוב עליי.
What a wonderful day!|איזה יום נפלא!
Nobody is perfect.|אף אחד לא מושלם.
She has a pink bag and a purple hat.|יש לה תיק ורוד וכובע סגול.
I already ate.|כבר אכלתי.
He is not here yet.|הוא עדיין לא כאן.
We usually eat at seven.|אנחנו בדרך כלל אוכלים בשבע.
She sings while she cooks.|היא שרה בזמן שהיא מבשלת.
He is as tall as his father.|הוא גבוה כמו אבא שלו.
The cat is below the table.|החתול מתחת לשולחן.
I sit between my mom and my dad.|אני יושב בין אמא לאבא.
She was among friends.|היא הייתה בין חברים.
We walk along the river.|אנחנו הולכים לאורך הנהר.
Come and sit beside me.|בוא שב לידי.
The cat jumped onto the bed.|החתול קפץ על המיטה.
I drink tea without sugar.|אני שותה תה בלי סוכר.
Perhaps it will rain.|אולי ירד גשם.
I am really happy.|אני באמת שמח.
The test was quite easy.|המבחן היה די קל.
Do you have any money?|יש לך כסף?
Both of my parents work.|שני ההורים שלי עובדים.
Each child got a gift.|כל ילד קיבל מתנה.
Yes, please.|כן, בבקשה.
Goodbye, see you tomorrow!|להתראות, נתראה מחר!
Bye, Mom!|ביי, אמא!
Okay, let's go.|בסדר, בוא נלך.
It is OK.|זה בסדר.
I have eight books and nine pens.|יש לי שמונה ספרים ותשעה עטים.
There are twelve months in a year.|יש שנים עשר חודשים בשנה.
She is twenty and he is thirty.|היא בת עשרים והוא בן שלושים.
My father is fifty.|אבא שלי בן חמישים.
This is my third cup of coffee.|זו כוס הקפה השלישית שלי.
I ate half of the cake.|אכלתי חצי מהעוגה.
I'm hungry.|אני רעב.
It's a beautiful day.|זה יום יפה.
I don't know.|אני לא יודע.
I can't swim.|אני לא יודע לשחות.
She didn't come.|היא לא באה.
He isn't at home.|הוא לא בבית.
It wasn't easy.|זה לא היה קל.
I won't forget.|אני לא אשכח.
I'll call you later.|אני אתקשר אליך אחר כך.
You're a good friend.|אתה חבר טוב.
He's my brother and she's my sister.|הוא אח שלי והיא אחותי.
They're in the garden.|הם בגינה.
We're ready.|אנחנו מוכנים.
There's a dog in the park.|יש כלב בפארק.
What's your name?|מה השם שלך?
He doesn't eat meat.|הוא לא אוכל בשר.
I couldn't sleep.|לא הצלחתי לישון.
She wouldn't tell me.|היא לא הסכימה לספר לי.
I've got a new bike.|יש לי אופניים חדשים.
Give it to me.|תן לי את זה.
This book is mine, and that one is yours.|הספר הזה שלי, וההוא שלך.
The red car is hers, and the blue one is ours.|המכונית האדומה שלה, והכחולה שלנו.
The house is theirs.|הבית שלהם.
I made it myself.|הכנתי את זה בעצמי.
Do it yourself.|תעשה את זה בעצמך.
She looked at herself.|היא הסתכלה על עצמה.
The door opened by itself.|הדלת נפתחה מעצמה.
They did it themselves.|הם עשו את זה בעצמם.
Those shoes are new.|הנעליים ההן חדשות.
Which book do you want?|איזה ספר אתה רוצה?
Whose bag is this?|של מי התיק הזה?
Is anyone at home?|יש מישהו בבית?
Do you need anything?|אתה צריך משהו?
Someone is at the door.|מישהו נמצא ליד הדלת.
I looked everywhere.|חיפשתי בכל מקום.
My keys are somewhere in the house.|המפתחות שלי איפשהו בבית.
What do you do?|מה אתה עושה?
I have never seen snow.|אף פעם לא ראיתי שלג.
He is known in the whole city.|הוא ידוע בכל העיר.
I use my phone every day.|אני משתמש בטלפון כל יום.
Tell me a story.|ספר לי סיפור.
She told me her name.|היא אמרה לי את השם שלה.
I feel good today.|אני מרגיש טוב היום.
He felt sick yesterday.|הוא הרגיש חולה אתמול.
Let me help you.|תן לי לעזור לך.
What do you mean?|למה אתה מתכוון?
I meant to call you.|התכוונתי להתקשר אליך.
We set the table for dinner.|ערכנו את השולחן לארוחת ערב.
Please sit down.|שב בבקשה.
Don't lose your ticket.|אל תאבד את הכרטיס שלך.
I lost my key.|איבדתי את המפתח שלי.
Add some sugar to the tea.|תוסיף קצת סוכר לתה.
I buy bread every morning.|אני קונה לחם כל בוקר.
She bought a new dress.|היא קנתה שמלה חדשה.
I spent all my money.|הוצאתי את כל הכסף שלי.
Please open the window.|תפתח את החלון, בבקשה.
The letter is written in English.|המכתב כתוב באנגלית.
The lesson has begun.|השיעור התחיל.
You seem tired.|אתה נראה עייף.
We talk every day.|אנחנו מדברים כל יום.
He has shown me the photo.|הוא הראה לי את התמונה.
Hold my hand.|תחזיק לי את היד.
She held the baby.|היא החזיקה את התינוק.
He brought me a gift.|הוא הביא לי מתנה.
Stop the car!|עצור את המכונית!
Children create beautiful things.|ילדים יוצרים דברים יפים.
We spoke on the phone.|דיברנו בטלפון.
English is spoken here.|מדברים כאן אנגלית.
My parents allow me to stay up late.|ההורים שלי מרשים לי להישאר ער עד מאוחר.
This road leads to the sea.|הכביש הזה מוביל לים.
She led us to the room.|היא הובילה אותנו לחדר.
Can I offer you a drink?|אפשר להציע לך משקה?
The moon appears at night.|הירח מופיע בלילה.
They serve good coffee here.|מגישים כאן קפה טוב.
The tree has fallen.|העץ נפל.
I can't reach the top shelf.|אני לא מגיע למדף העליון.
Only two apples remain.|נשארו רק שני תפוחים.
I suggest a short break.|אני מציע הפסקה קצרה.
Raise your hand.|תרים את היד.
He sold his old car.|הוא מכר את המכונית הישנה שלו.
I read the report.|קראתי את הדוח.
Push the door.|תדחוף את הדלת.
I have eaten enough.|אכלתי מספיק.
He drank a glass of water.|הוא שתה כוס מים.
I sleep eight hours.|אני ישן שמונה שעות.
The baby slept all night.|התינוק ישן כל הלילה.
I wake up at six.|אני מתעורר בשש.
She woke up late.|היא התעוררה מאוחר.
I drive to work.|אני נוהג לעבודה.
He drove us home.|הוא הסיע אותנו הביתה.
She rode a horse.|היא רכבה על סוס.
We swam in the sea.|שחינו בים.
I teach English.|אני מלמד אנגלית.
She taught me to read.|היא לימדה אותי לקרוא.
Catch the ball!|תפוס את הכדור!
The cat caught a mouse.|החתול תפס עכבר.
Brothers sometimes fight.|אחים לפעמים רבים.
They fought for peace.|הם נלחמו למען השלום.
Our team won the game.|הקבוצה שלנו ניצחה במשחק.
I wear a hat in summer.|אני חובש כובע בקיץ.
She wore a red dress.|היא לבשה שמלה אדומה.
He broke the glass.|הוא שבר את הכוס.
She was chosen for the team.|היא נבחרה לקבוצה.
I have forgotten his name.|שכחתי את השם שלו.
She has given me a book.|היא נתנה לי ספר.
He has taken my pen.|הוא לקח את העט שלי.
Don't steal!|אל תגנוב!
She sang a beautiful song.|היא שרה שיר יפה.
She has a ring on her finger.|יש לה טבעת על האצבע.
I like to draw animals.|אני אוהב לצייר בעלי חיים.
He drew a picture of a horse.|הוא צייר תמונה של סוס.
The bird flew away.|הציפור עפה משם.
The birds have flown south.|הציפורים עפו דרומה.
Answer the question, please.|ענה על השאלה, בבקשה.
Jump over the water.|קפוץ מעל המים.
Smile for the photo!|חייך לתמונה!
Don't cry.|אל תבכה.
Listen to the teacher.|תקשיב למורה.
I enjoy reading books.|אני נהנה לקרוא ספרים.
I hate cold weather.|אני שונא מזג אוויר קר.
I wish you good luck.|אני מאחל לך בהצלחה.
Thank you for your help.|תודה על העזרה שלך.
Thanks for the coffee.|תודה על הקפה.
Welcome to our home.|ברוכים הבאים לבית שלנו.
Count from one to ten.|תספור מאחת עד עשר.
Don't hit your brother.|אל תרביץ לאח שלך.
Come and join us.|בוא תצטרף אלינו.
I miss my family.|אני מתגעגע למשפחה שלי.
We paint the wall white.|אנחנו צובעים את הקיר בלבן.
Pick a number.|בחר מספר.
We plant a tree in the garden.|אנחנו שותלים עץ בגינה.
Pour me some water, please.|תמזוג לי קצת מים, בבקשה.
I promise to come.|אני מבטיח לבוא.
We share a room.|אנחנו חולקים חדר.
I shop at the market.|אני קונה בשוק.
I can smell the flowers.|אני מריח את הפרחים.
That sounds good.|זה נשמע טוב.
Can you fix my bike?|אתה יכול לתקן את האופניים שלי?
Check your answer.|בדוק את התשובה שלך.
I was born in winter.|נולדתי בחורף.
The police are here.|המשטרה כאן.
The student asks the teacher.|התלמיד שואל את המורה.
She answers every question.|היא עונה על כל שאלה.
Sit on the chair in the kitchen.|שב על הכיסא במטבח.
I had a strange dream last night.|היה לי חלום מוזר אתמול בלילה.
We eat together every Friday.|אנחנו אוכלים יחד בכל יום שישי.
The children are polite.|הילדים מנומסים.
Let's begin the lesson.|בוא נתחיל את השיעור.
Be careful, the soup is hot!|תיזהר, המרק חם!
Choose a book you like.|בחר ספר שאתה אוהב.
I can't find my keys.|אני לא מוצא את המפתחות שלי.
Can you hear me?|אתה שומע אותי?
You are a lucky man.|אתה איש בר מזל.
Nice to meet you.|נעים להכיר אותך.
The house is quiet at night.|הבית שקט בלילה.
Send me a message.|שלח לי הודעה.
Throw the ball to me.|זרוק אליי את הכדור.
It is unusual to see snow here.|זה יוצא דופן לראות כאן שלג.
Don't worry, be happy.|אל תדאג, תהיה שמח.
Close one eye and look.|עצום עין אחת ותסתכל.
This is Grandma's kitchen.|זה המטבח של סבתא.
I need more time.|אני צריך עוד זמן.
The dog is under the chair.|הכלב מתחת לכיסא.
I think you are right.|אני חושב שאתה צודק.
She always tells the truth.|היא תמיד אומרת את האמת.
We need to buy food.|אנחנו צריכים לקנות אוכל.
My friend lives near the school.|חבר שלי גר ליד בית הספר.
Do you understand the question?|אתה מבין את השאלה?
I remember your name.|אני זוכר את השם שלך.
It is important to sleep well.|חשוב לישון טוב.`;
