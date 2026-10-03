// Words the import script leaves out of the race word lists: vulgar, violent, adult or scary words that do not suit ages 10–12,
// first names, place names and words needing a capital, interjections, abbreviations and the other language's words that subtitles mix in.
// Matching is exact, on the lowercase NFC word. Add a word here, then run `npx tsx scripts/import-word-lists.ts`.
export const wordBlocklist = {
  fr: [
    // Vulgar words and insults
    'merde', 'putain', 'cul', 'bordel', 'pute', 'putes', 'salope', 'salopes', 'connard', 'connards', 'connasse', 'conneries', 'connerie', 'enfoiré', 'enfoirés',
    'con', 'cons', 'conne', 'foutre', 'foutu', 'foutue', 'fout', 'fous', 'foutez', 'gueule', 'chier', 'chiant', 'chiante', 'fesses', 'salaud', 'salauds', 'imbécile',
    'idiot', 'idiote', 'idiots', 'crétin', 'crétins', 'stupide', 'débile', 'abruti', 'dégage', 'baiser', 'baise', 'baiserai', 'bite', 'couilles', 'nique', 'niquer',
    'bâtard', 'enculé', 'pédé', 'pétasse', 'garce', 'queue', 'cocu', 'mec', 'mecs', 'flic', 'flics', 'fric', 'bouffer', 'moche', 
    'gueuler', 'emmerde', 'emmerder', 'seins', 'nu', 'nue', 'nus', 'sexe', 'sexy', 'sexuel', 'gay', 'amant', 'maîtresse',
    // Violence, death, crime, weapons
    'tuer', 'tué', 'tuée', 'tués', 'tue', 'tues', 'tuez', 'tuerai', 'tueur', 'tueurs', 'mort', 'morte', 'morts', 'mortes', 'mourir', 'meurt', 'meurs', 'mourra',
    'sang', 'arme', 'armes', 'flingue', 'pistolet', 'fusil', 'couteau', 'balle', 'balles', 'bombe', 'bombes', 'tirer', 'tiré', 'tirez', 'tire', 'tir', 'assassin',
    'assassiner', 'assassiné', 'meurtre', 'meurtres', 'meurtrier', 'victime', 'victimes', 'crime', 'crimes', 'criminel', 'cadavre', 'guerre', 'tuerie',
    'suicide', 'prison', 'otage', 'violer', 'viol', 'drogue', 'drogues', 'alcool', 'bière', 'vin', 'ivre', 'saoul', 'whisky', 'vodka', 'cigarette', 'fumer',
    'cancer', 'enceinte', 'enfer', 'diable', 'démon', 'mourant', 'tombeau', 'cercueil', 'enterrement', 'blessé', 'blessée', 'blesser', 'torture', 
    'frapper', 'frappé', 'frappe', 'menacé', 'procureur', 'avocat', 'procès', 'tribunal', 'témoin',
    'enquête', 'inspecteur', 'shérif', 'flingues', 'sanglant', 
    // Religion
    'dieu', 'jésus', 'seigneur', 'christ', 'bible', 'prie', 'prier', 'église',
    // Interjections, abbreviations, misspellings
    'oh', 'ah', 'eh', 'hé', 'plait', 'hein', 'euh', 'heu', 'hum', 'ha', 'ouais', 'ok', 'okay', 'ca', 'etre', 'ecoute', 'ecoutez', 'dr', 'mme', 'mlle', 'mr', 'km', 'adn', 'fbi',
    'cia', 'ii', 'iii', 'ia', 'ie', 'ies', 'll', 'pos', 'uh', 'bla', 'ben', 'allô', 'hey', 'wow', 'oups', 'chut', 'bah', 'hm', 'hmm', 'ouah', 'ouh', 'aïe', 'tss',
    // Words of another language mixed into French subtitles
    'the', 'you', 'and', 'to', 'it', 'of', 'in', 'is', 'no', 'yes', 'new', 'will', 'man', 'yeah', 'oh', 'my', 'me', 'up', 'star', 'job', 'show', 'stop', 'cool',
    'baby', 'boss', 'sir', 'miss', 'mister', 'test', 'van', 'san',
    // First names and place names, which need a capital
    'john', 'jack', 'michael', 'david', 'tom', 'joe', 'mike', 'frank', 'george', 'peter', 'paul', 'max', 'henry', 'james', 'alex', 'danny', 'jimmy', 'bill',
    'jane', 'sarah', 'nick', 'tony', 'mary', 'harry', 'jim', 'ray', 'richard', 'steve', 'chris', 'eddie', 'charles', 'kevin', 'larry', 'rachel', 'walter', 'brian',
    'eric', 'jerry', 'scott', 'andy', 'pete', 'kim', 'kate', 'jason', 'anna', 'simon', 'lisa', 'thomas', 'carter', 'emily', 'luke', 'ted', 'robert', 'daniel',
    'martin', 'lee', 'mark', 'adam', 'marie', 'johnny', 'amy', 'ryan', 'jake', 'billy', 'bobby', 'dan', 'tommy', 'grace', 'al', 'sam', 'charlie', 'jean', 'pierre',
    'louis', 'michel', 'jacques', 'paris', 'londres', 'rome', 'angleterre', 'amérique', 'france', 'washington', 'york', 'canada', 'québec', 'mexique', 'chine',
    'allemagne', 'espagne', 'italie', 'russie', 'japon', 'europe', 'afrique', 'noël', 'pâques', 
    
  ],
  en: [
    // Vulgar words and insults
    'shit', 'fuck', 'fucking', 'fuckin', 'fucked', 'fucker', 'motherfucker', 'damn', 'damned', 'goddamn', 'dammit', 'hell', 'ass', 'asses', 'asshole', 'bitch',
    'bitches', 'bastard', 'bastards', 'bloody', 'bullshit', 'crap', 'dick', 'dicks', 'cock', 'pussy', 'piss', 'pissed', 'whore', 'slut', 'sucks', 'suck', 'screw',
    'screwed', 'jerk', 'idiot', 'idiots', 'stupid', 'dumb', 'moron', 'loser', 'freak', 'butt', 'boobs', 'sex', 'sexy', 'sexual', 'gay', 'naked', 'nude',
    'kiss', 'kissed', 'kissing', 'lover', 'girlfriend', 'boyfriend', 'darling', 'sweetheart', 'babe', 'baby', 
    'ugly', 'hate', 'hated', 'hates', 'wtf', 'lmao', 'dude', 'chick', 'chicks',
    // Violence, death, crime, weapons
    'kill', 'killed', 'killing', 'kills', 'killer', 'killers', 'dead', 'die', 'died', 'dies', 'dying', 'death', 'deaths', 'murder', 'murdered', 'murderer', 'gun',
    'guns', 'shoot', 'shot', 'shots', 'shooting', 'blood', 'bloody', 'weapon', 'weapons', 'bomb', 'bombs', 'knife', 'knives', 'prison', 'jail', 'crime', 'crimes',
    'criminal', 'attacked', 'victim', 'victims', 'suspect', 'bodies', 'corpse', 'grave', 'war', 'wars', 'army', 'soldier', 'soldiers', 
    'drunk', 'drinking', 'beer', 'wine', 'whiskey', 'vodka', 'booze', 'drug', 'drugs', 'smoke', 'smoking',
    'cigarette', 'pregnant', 'cancer', 'suicide', 'devil', 'evil', 'demon', 'hell', 'cop', 'cops', 'arrest', 'arrested', 'lawyer', 
    'trial', 'witness', 'guilty', 'detective', 'sheriff', 'hostage', 'rape', 'steal', 'stole', 'stolen', 'scream', 'screaming',
    
    // Religion
    'god', 'jesus', 'christ', 'lord', 'holy', 'church', 'pray', 'bible',
    // Interjections, contraction fragments, abbreviations and subtitle sound tags
    'oh', 'yeah', 'okay', 'ok', 'hey', 'uh', 'huh', 'um', 'ah', 'hmm', 'ha', 'whoa', 'wow', 'ooh', 'mm', 'mmm', 'aah', 'ow', 'eh', 'ya', 'yo', 'er', 'shh', 'yep',
    'em', 'ma', 'la', 'de', 'lt', 'mr', 'mrs', 'ms', 'dr', 'tv', 'oi', 'gonna', 'wanna', 'gotta', 'ain', 'don', 'didn', 'doesn', 'isn', 'wasn', 'couldn',
    'wouldn', 'haven', 'aren', 'shouldn', 'hasn', 'weren', 'hadn', 'll', 've', 're', 'sighs', 'laughs', 'chuckles', 'grunts', 'gasps', 'grunting', 'groans',
    'narrator', 'll', 'nah', 'yup', 'hon', 'pa', 'ugh', 'oops', 'gee', 'el', 'le', 'et', 'je', 'ze', 'ii', 'iii',
    // First names and place names, which need a capital
    'john', 'jack', 'michael', 'george', 'david', 'frank', 'joe', 'bill', 'charlie', 'mike', 'tom', 'mark', 'peter', 'paul', 'mary', 'ben', 'james', 'henry', 'harry',
    'bob', 'danny', 'nick', 'alex', 'jim', 'jimmy', 'tony', 'adam', 'steve', 'sarah', 'ray', 'richard', 'lee', 'billy', 'jane', 'grace', 'johnny', 'tommy', 'max',
    'sam', 'kate', 'kevin', 'chris', 'jake', 'ryan', 'eddie', 'frankie', 'larry', 'jerry', 'walter', 'brian', 'eric', 'scott', 'andy', 'pete', 'kim', 'jason',
    'anna', 'simon', 'lisa', 'thomas', 'carter', 'emily', 'luke', 'ted', 'robert', 'daniel', 'martin', 'amy', 'bobby', 'dan', 'al', 'york', 'london', 'paris',
    'america', 'american', 'americans', 'english', 'french', 'german', 'germans', 'chinese', 'japanese', 'russian', 'russians', 'mexico', 'california', 'texas',
    'vegas', 'chicago', 'washington', 'england', 'france', 'christmas', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
    
  ],
} as const;
