const io = require('socket.io-client');
const SERVER_URL = 'http://localhost:5000';

async function testNextSpam() {
  console.log('--- Starting "Next" Button Spam Test ---');
  const socket = io(SERVER_URL);

  socket.on('connect', () => {
    console.log('Connected. Rapidly clicking "Next"...');
    
    // Each 'next_stranger' within 2s adds 2 points. 
    // Threshold is 10. So 5-6 clicks should trigger it.
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            console.log(`Clicking Next ${i + 1}`);
            socket.emit('next_stranger', { type: 'text', interests: [] });
        }, i * 200); // 200ms apart
    }
  });

  socket.on('kicked', (data) => {
    console.log('SUCCESS: Received kicked event:', data.message);
    process.exit(0);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected.');
  });

  setTimeout(() => {
    console.log('FAILED: No kick event received.');
    process.exit(1);
  }, 10000);
}

testNextSpam();
