const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:5000';

async function simulateSpam() {
  console.log('--- Starting Spam Simulation ---');
  
  const socket = io(SERVER_URL);

  socket.on('connect', () => {
    console.log('Connected to server.');
    
    // Join queue first
    socket.emit('join_queue', { type: 'text', interests: [] });
  });

  socket.on('match_found', (data) => {
    console.log('Match found. Starting message spam...');
    
    // Send 11 messages very fast (Threshold is 10)
    for (let i = 0; i < 11; i++) {
        setTimeout(() => {
            console.log(`Sending message ${i + 1}`);
            socket.emit('chat_message', 'Spam message ' + i);
        }, i * 100); // 100ms interval (very fast)
    }
  });

  socket.on('kicked', (data) => {
    console.log('SUCCESS: Received kicked event:', data.message);
    process.exit(0);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server.');
  });

  socket.on('error', (err) => {
    console.log('Error:', err.message);
  });

  // Timeout if nothing happens
  setTimeout(() => {
    console.log('FAILED: No kick event received within 15 seconds.');
    process.exit(1);
  }, 15000);
}

simulateSpam();
