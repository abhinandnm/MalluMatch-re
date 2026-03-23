const fs = require('fs');
const path = require('path');

const badwordsPath = path.join(__dirname, 'badwords.json');
let badwords = { en: [], ml: [] };

try {
  if (fs.existsSync(badwordsPath)) {
    badwords = JSON.parse(fs.readFileSync(badwordsPath, 'utf8'));
  }
} catch (err) {
  console.error('Error loading badwords.json:', err);
}

const allBadwords = [...badwords.en, ...badwords.ml];

/**
 * Escapes special characters in a string for use in a regular expression.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a regular expression that matches any of the bad words.
 * Uses word boundaries \b to avoid matching sub-strings (e.g., "assessment" shouldn't match "ass").
 * Note: Malayalam doesn't always have clear word boundaries like English, 
 * so we handle it by joining with | and using a case-insensitive match.
 */
const pattern = allBadwords
  .map(word => escapeRegExp(word))
  .join('|');

// Combine English (with word boundaries) and Malayalam (if needed, although \b works for many scripts)
const filterRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

/**
 * Filters abusive words and strips HTML tags from a message.
 * @param {string} text - The original message
 * @returns {string} - The cleaned and sanitized message
 */
function cleanMessage(text) {
  if (!text) return text;
  
  // 1. Strip HTML tags to prevent XSS
  const sanitized = text.replace(/<[^>]*>/g, '');
  
  // 2. Filter bad words
  return sanitized.replace(filterRegex, (match) => {
    return '#'.repeat(match.length);
  });
}

module.exports = {
  cleanMessage,
  badwords
};
