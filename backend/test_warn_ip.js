const io = require('socket.io-client');
const SERVER_URL = 'http://localhost:5000';

async function runTest() {
  console.log('--- Starting Warn IP Feature Test ---');
  
  const userSocket = io(SERVER_URL);
  const adminSocket = io(SERVER_URL);

  let userWarned = false;
  let adminReceivedResult = false;

  // 1. User Client Connection
  userSocket.on('connect', () => {
    console.log('User connected to server.');
    // Join queue to register IP in matchMaker.userIPs
    userSocket.emit('join_queue', { type: 'text', interests: [] });
  });

  userSocket.on('warn_alert', (data) => {
    console.log('SUCCESS: User received warning alert:', data.message);
    userWarned = true;
    checkCompletion();
  });

  // 2. Admin Client Connection
  adminSocket.on('connect', () => {
    console.log('Admin connected to server.');
    // Authenticate admin
    adminSocket.emit('admin_auth', { password: '1234' });
  });

  adminSocket.on('admin_auth_success', () => {
    console.log('Admin authenticated successfully. Sending warn IP requests...');
    
    // Send warnings to common localhost IPs
    const testIps = ['127.0.0.1', '::ffff:127.0.0.1', '::1'];
    testIps.forEach(ip => {
      adminSocket.emit('admin_warn_ip', {
        targetIP: ip,
        message: 'This is a test warning message from IP search',
        password: '1234'
      });
    });
  });

  adminSocket.on('admin_warn_ip_result', (data) => {
    console.log(`Admin received warning result for IP ${data.ip}: success=${data.success}, warnedCount=${data.warnedCount}`);
    if (data.success && data.warnedCount > 0) {
      adminReceivedResult = true;
      checkCompletion();
    }
  });

  userSocket.on('error', (err) => console.log('User Socket Error:', err.message));
  adminSocket.on('error', (err) => console.log('Admin Socket Error:', err.message));

  function checkCompletion() {
    if (userWarned && adminReceivedResult) {
      console.log('--- TEST PASSED SUCCESSFULLY ---');
      userSocket.disconnect();
      adminSocket.disconnect();
      process.exit(0);
    }
  }

  // Timeout if test doesn't complete
  setTimeout(() => {
    console.log('FAILED: Test timed out. User warned:', userWarned, 'Admin received result:', adminReceivedResult);
    userSocket.disconnect();
    adminSocket.disconnect();
    process.exit(1);
  }, 10000);
}

runTest();
