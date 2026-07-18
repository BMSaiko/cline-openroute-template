/**
 * Teste de resiliência – Simula erros 429
 * Cria um servidor mock que devolve 429 nas primeiras N tentativas
 */

const { OpenRouteClient } = require('../src/openroute-client');
const http = require('http');

let attemptCount = 0;
const MAX_429_BEFORE_SUCCESS = 3;

const server = http.createServer((req, res) => {
  console.log(`📡 Request #${attemptCount + 1}`);
  
  if (attemptCount < MAX_429_BEFORE_SUCCESS) {
    attemptCount++;
    res.setHeader('Retry-After', '1');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Too Many Requests',
      message: 'Rate limit exceeded (simulated)'
    }));
    console.log(`   → 429 (attempt ${attemptCount}/${MAX_429_BEFORE_SUCCESS})`);
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Success after retries',
      attempts_before_success: attemptCount
    }));
    console.log('   → 200 OK');
  }
});

const PORT = 3456;
server.listen(PORT, async () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log(`   Simulating ${MAX_429_BEFORE_SUCCESS} x 429 then success\n`);
  
  const client = new OpenRouteClient('fake-key', { 
    baseURL: `http://localhost:${PORT}/v2`,
    maxRetries: 5,
  });
  
  try {
    const result = await client.request('directions/driving-car', 'POST', { 
      coordinates: [[0, 0], [1, 1]] 
    });
    console.log('\n✅ TEST PASSED: Client recovered from 429 errors');
    console.log('Result:', result);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
  } finally {
    server.close();
    console.log('\n🛑 Server closed');
  }
});