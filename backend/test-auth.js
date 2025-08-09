const http = require('http');

async function testAuth() {
  try {
    console.log('Testing authentication endpoint...');
    
    const postData = JSON.stringify({
      firstName: "Test",
      lastName: "User", 
      email: "test.auth@example.com",
      phone: "+1234567890",
      username: "testuser123",
      password: "TestPass123!",
      role: "tenant",
      terms: "true"
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log('Registration Response Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Registration Response:', data);
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
    });

    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAuth();
