/**
 * Advanced security utility for MalluMatch
 */

const maliciousPatterns = [
  /<script\b[^>]*>([\s\S]*?)<\/script>/gim,
  /onerror\s*=\s*["']?[^"'>]+["']?/gim,
  /onload\s*=\s*["']?[^"'>]+["']?/gim,
  /onmouseover\s*=\s*["']?[^"'>]+["']?/gim,
  /javascript\s*:\s*[^"'>]+/gim,
  /expression\s*\(\s*[^)]+\)/gim, // IE old XSS
  /url\s*\(\s*javascript\s*:[^)]+\)/gim,
  /<svg\b[^>]*>/gim,
  /<iframe\b[^>]*>/gim
];

/**
 * Checks if a string contains known malicious XSS patterns.
 * @param {string} text - The text to check
 * @returns {boolean} - True if malicious pattern found
 */
function isMalicious(text) {
  if (!text) return false;
  return maliciousPatterns.some(pattern => pattern.test(text));
}

module.exports = {
  isMalicious
};
