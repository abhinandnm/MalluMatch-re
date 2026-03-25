const badwords = {
  "en": [
    "arse", "ass", "asshole", "bastard", "bitch", "bollocks", "bugger", "bullshit", "crap", "cunt", "damn", "dick", "dildo", "fag", "fcuk", "fuck", "fucking", "goddamn", "hell", "holy shit", "jackass", "motherfucker", "nigga", "nigger", "piss", "pusssy", "pussy", "sex", "sexx", "shit", "slut", "son of a bitch", "twat", "wanker", "whore"
  ],
  "ml": [
    "andi", "andy", "appi", "chut", "chutiya", "kandara", "kazhuveriyamone", "kazhuveriydemone", "koothi", "kundala", "kundan", "kunna", "kunne", "kunnee", "madama", "mypu", "myr", "myran", "myre", "myru", "nayinte mone", "oomb", "oombi", "oomfi", "paalkuppi", "palkuppi", "pandi", "panni", "parayar", "polayadi", "pooran", "poori", "pulayar", "pulu", "punda", "thalla", "thayoli", "theetam", "thund", "umb", "umbiko", "vaanam", "vadi", "vannam", "vettavali"
  ],
  "hi": [
    "bakchod", "bc", "behenchod", "bevakoof", "bhadua", "chutiya", "gadha", "harami", "kamina", "kutta", "madarchod", "mc", "randi", "saala"
  ],
  "te": [
    "bokka", "chillara", "gaadida", "lanja", "madda", "munda", "nayala", "pooku", "vedava", "yedava"
  ],
  "ta": [
    "baadu", "gomma", "koothi", "mayir", "ommalotha", "otha", "panni", "pundi", "thayoli", "thevudiya"
  ]
};

const allBadwords = Object.values(badwords).flat();

/**
 * Escapes special characters in a string for use in a regular expression.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a regular expression that matches any of the bad words.
 * Uses word boundaries \b to avoid matching sub-strings.
 */
const pattern = allBadwords
  .map(word => escapeRegExp(word))
  .join('|');

const filterRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

/**
 * Filters abusive words from a message and replaces them with '#'.
 * @param {string} text - The original message
 * @returns {string} - The filtered message
 */
export function cleanMessage(text) {
  if (!text) return text;
  
  return text.replace(filterRegex, (match) => {
    return '#'.repeat(match.length);
  });
}
