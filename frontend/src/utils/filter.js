const badwords = {
  "en": [
    "arse",
    "ass",
    "asshole",
    "bastard",
    "bitch",
    "bollocks",
    "bugger",
    "bullshit",
    "crap",
    "cunt",
    "damn",
    "dick",
    "dildo",
    "fag",
    "fuck",
    "fucking",
    "goddamn",
    "hell",
    "holy shit",
    "jackass",
    "motherfucker",
    "nigga",
    "nigger",
    "piss",
    "pussy",
    "shit",
    "slut",
    "son of a bitch",
    "twat",
    "wanker",
    "whore"
  ],
  "ml": [
    "thayoli", "pandi", "poori", "vannam", "palkuppi", "kunna", "andi", "myre", "mypu", "oombi", "kundala", "kundan", "vettavali", "nayinte mone", "panni", "theetam", "kazhuveriyamone", "polayadi", "thalla", "appi", "madama", "vadi", "kandara", "pulayar", "parayar", "pulu", "punda", "koothi", "oomfi", "paalkuppi", "myran", "pooran"
  ]
};

const allBadwords = [...badwords.en, ...badwords.ml];

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
