const https = require('https');

function testAiAgentStreamMulti() {
  const data = JSON.stringify({
    text: 'Add a new developer named Jane Smith reporting to the CEO',
    orgId: 'test-org-id',
    conversationContext: ''
  });

  const options = {
    hostname: 'aiagentstreammulti-usprdmd3na-uc.a.run.app',
    port: 443,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('🧪 Testing aiAgentStreamMulti function...');

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        if (event.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(event.slice(6));
            console.log('📨 Event:', JSON.stringify(parsed, null, 2));
          } catch (error) {
            console.log('Parse error:', error.message);
            console.log('Raw event:', event);
          }
        }

        boundary = buffer.indexOf('\n\n');
      }
    });

    res.on('end', () => {
      console.log('✅ Stream ended');
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  req.write(data);
  req.end();
}

// Start testing
console.log('🚀 Starting Multi-Stream Test...\n');
testAiAgentStreamMulti(); 