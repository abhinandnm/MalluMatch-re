// Simulated environment for anti-spam logic testing
const lastMessageTime = new Map();
const lastMessages = new Map();
const spamStrikes = new Map();

function handleChatMessage(socketId, msg) {
  const now = Date.now();
  const lastTime = lastMessageTime.get(socketId) || 0;

  // 1. Rate Limit
  if (now - lastTime < 1000) {
    const strikes = (spamStrikes.get(socketId) || 0) + 1;
    spamStrikes.set(socketId, strikes);
    if (strikes >= 5) return "KICKED_FOR_SPAM";
    return "TOO_FAST";
  }
  lastMessageTime.set(socketId, now);

  // 2. Duplicate
  const lastMsg = lastMessages.get(socketId);
  if (msg === lastMsg) return "DUPLICATE";
  lastMessages.set(socketId, msg);

  // 3. Repetitive
  if (/(.)\1{14,}/.test(msg)) return "REPETITIVE";

  // Success
  spamStrikes.set(socketId, 0);
  return "SUCCESS";
}

const socketId = "test_user_1";
console.log("Rule 1: Rate Limiting");
console.log("Send 1:", handleChatMessage(socketId, "Hello")); // Success
console.log("Send 2 (immediate):", handleChatMessage(socketId, "World")); // Too fast
console.log("Send 3 (immediate):", handleChatMessage(socketId, "World")); // Too fast
console.log("Send 4 (immediate):", handleChatMessage(socketId, "World")); // Too fast
console.log("Send 5 (immediate):", handleChatMessage(socketId, "World")); // Too fast
console.log("Send 6 (immediate):", handleChatMessage(socketId, "World")); // Kicked

console.log("\nRule 2: Duplicate Detection");
lastMessageTime.set(socketId, 0); // Reset timer
spamStrikes.set(socketId, 0); // Reset strikes
console.log("Send 1:", handleChatMessage(socketId, "Hello")); // Success
console.log("Send 2 (duplicate):", handleChatMessage(socketId, "Hello")); // Duplicate

console.log("\nRule 3: Repetitive Character Detection");
console.log("Send 1 (normal):", handleChatMessage(socketId, "Hello")); // Success
console.log("Send 2 (repetitive):", handleChatMessage(socketId, "aaaaaaaaaaaaaaaa")); // Repetitive
