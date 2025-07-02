const https = require('https');

// Test the aiChat function
function testAiChat() {
  const data = JSON.stringify({
    message: "Hello! Can you help me with my organizational chart?"
  });

  const options = {
    hostname: 'aichat-usprdmd3na-uc.a.run.app',
    port: 443,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('🧪 Testing aiChat function...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ aiChat Response:');
      try {
        const parsed = JSON.parse(responseData);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.log('Raw response:', responseData);
      }
      console.log('\n' + '='.repeat(50) + '\n');
      
      // Test aiAgent function after aiChat
      testAiAgent();
    });
  });

  req.on('error', (error) => {
    console.error('❌ aiChat Error:', error);
  });

  req.write(data);
  req.end();
}

// Test the aiAgent function
function testAiAgent() {
  const data = JSON.stringify({
    text: "Add Maria Rodriguez as Marketing Manager to organization org123"
  });

  const options = {
    hostname: 'aiagent-usprdmd3na-uc.a.run.app',
    port: 443,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('🧪 Testing aiAgent function...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ aiAgent Response:');
      try {
        const parsed = JSON.parse(responseData);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.log('Raw response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ aiAgent Error:', error);
  });

  req.write(data);
  req.end();
}

// Start testing
console.log('🚀 Starting Firebase Functions Tests...\n');
testAiChat(); 