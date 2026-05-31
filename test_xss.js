const { cleanMessage } = require('./filter');

const testPayloads = [
  { input: '<script>alert(1)</script>', expected: 'alert(1)' },
  { input: '<img src=x onerror=alert(1)>', expected: '' },
  { input: '<a href="javascript:alert(1)">Click me</a>', expected: 'Click me' },
  { input: 'Hello <b>world</b>', expected: 'Hello world' },
  { input: 'Badword test: ass', expected: 'Badword test: ###' } // Assuming 'ass' is in badwords.json
];

console.log('--- XSS Sanitization Test ---');
testPayloads.forEach(({ input, expected }, index) => {
  const result = cleanMessage(input);
  const passed = result === expected || (input.includes('Badword') && result.includes('###')); 
  console.log(`Test ${index + 1}: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Input:    ${input}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Result:   ${result}`);
});
