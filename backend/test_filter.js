const { cleanMessage } = require('./filter');

const testCases = [
  { input: "Hello there, how are you?", expected: "Hello there, how are you?" },
  { input: "You are a bitch!", expected: "You are a *****!" },
  { input: "That is bullshit", expected: "That is ********" },
  { input: "pandi is a bad word", expected: "***** is a bad word" },
  { input: "thayoli is offensive", expected: "******* is offensive" },
  { input: "I am going to pussy around", expected: "I am going to ***** around" },
  { input: "Don't be a dick", expected: "Don't be a ****" },
  { input: "Mixed language: You are a thayoli and a bastard", expected: "Mixed language: You are a ******* and a *******" },
  { input: "Case sensitivity: FUCK you", expected: "Case sensitivity: **** you" },
];

console.log("Running Chat Filter Tests...\n");

let passed = 0;
testCases.forEach((tc, index) => {
  const result = cleanMessage(tc.input);
  if (result === tc.expected) {
    console.log(`Test ${index + 1}: PASSED`);
    passed++;
  } else {
    console.log(`Test ${index + 1}: FAILED`);
    console.log(`  Input:    "${tc.input}"`);
    console.log(`  Expected: "${tc.expected}"`);
    console.log(`  Result:   "${result}"`);
  }
});

console.log(`\nTests Passed: ${passed}/${testCases.length}`);

if (passed === testCases.length) {
  process.exit(0);
} else {
  process.exit(1);
}
