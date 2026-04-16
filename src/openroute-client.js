/**
 * Cliente unificado para OpenRoute API
 * Integra: rate limiter, cache, semáforo, compressão, retry, fallback
 */

const { OpenRouteRateLimiter } = require('./rate-limiter');
const { TTLCache } = require('./cache');
const { Semaphore } = require('./semaphore');
const { compressIfNeeded } = require('./compression');
const { fallbackRequest } = require('./fallback');
const fs = require('fs').promises;
const path = require('path');

class OpenRouteClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.openrouteservice.org/v2';
    this.limiter = new OpenRouteRateLimiter(
      options.maxPerMinute || 20,
      options.maxPerDay || 50
    );
    this.cache = new TTLCache();
    this.semaphore = new Semaphore(options.maxConcurrency || 3);
    this.maxRetries = options.maxRetries || 5;
    this.memoryBankPath = options.memoryBankPath || './.cline/memory_bank.md';
    this.enableCompression = options.enableCompression !== false;
    this.compressionMethod = options.compressionMethod || 'mlm';
  }

  async request(endpoint, method = 'POST', body = null, options = {}) {
    const url = `${this.baseURL}/${endpoint}`;
    const cacheKey = `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
    
    // Determina TTL baseado no endpoint
    let ttl = options.ttl || 300; // default 5 min
    if (endpoint.includes('geocode')) ttl = options.ttl || 86400; // 24h
    if (endpoint.includes('matrix')) ttl = options.ttl || 3600; // 1h
    
    // 1. Verifica cache
    const cached = this.cache.get(cacheKey);
    if (cached && !cached._stale) {
      console.log(`✅ Cache hit: ${cacheKey.substring(0, 50)}...`);
      await this.updateMemoryBank({ cached: true });
      return cached;
    }
    
    // 2. Executa com semáforo, rate limit, retry e fallback
    const result = await this.semaphore.run(async () => {
      let lastError = null;
      
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        await this.limiter.waitForToken();
        
        // Prepara body com compressão opcional
        let requestBody = body;
        if (this.enableCompression && options.compress !== false && body?.prompt) {
          requestBody = {
            ...body,
            prompt: await compressIfNeeded(body.prompt, { method: this.compressionMethod }),
          };
        }
        
        try {
          const response = await fetch(url, {
            method,
            headers: {
              'Authorization': this.apiKey,
              'Content-Type': 'application/json',
            },
            body: requestBody ? JSON.stringify(requestBody) : undefined,
          });
          
          // Tratamento de 429
          if (response.status === 429) {
            let waitTime = 1;
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              waitTime = parseInt(retryAfter, 10);
              if (isNaN(waitTime)) {
                const retryDate = new Date(retryAfter);
                waitTime = Math.max(0, (retryDate - Date.now()) / 1000);
              }
            } else {
              waitTime = Math.min(60, Math.pow(2, attempt)) + Math.random() * 0.5;
            }
            
            console.log(`⚠️ 429: waiting ${waitTime.toFixed(1)}s (attempt ${attempt + 1}/${this.maxRetries})`);
            await new Promise(r => setTimeout(r, waitTime * 1000));
            continue;
          }
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          return data;
          
        } catch (err) {
          lastError = err;
          if (attempt === this.maxRetries - 1) break;
          // Espera antes de tentar novamente (erros de rede)
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
      
      // Esgotou tentativas -> fallback
      console.log('⚠️ All retries failed, activating fallback...');
      return await fallbackRequest({ url, body, cache: this.cache, endpoint });
    });
    
    // Guarda em cache (mesmo fallback, mas com TTL reduzido)
    const isFallback = result._fallback || result._stale;
    const cacheTTL = isFallback ? 60 : ttl;
    this.cache.set(cacheKey, result, cacheTTL);
    
    // Atualiza Memory Bank
    await this.updateMemoryBank({
      cached: false,
      fallback: isFallback,
      endpoint,
    });
    
    return result;
  }
  
  async updateMemoryBank(metadata = {}) {
    const stats = this.limiter.getStats();
    const cacheStats = this.cache.getStats();
    
    const entry = `
## 🧠 OpenRoute Client Update - ${new Date().toISOString()}

### Rate Limiting
- Requests today: ${stats.dailyCount}/50
- Remaining today: ${stats.remainingToday}
- Tokens remaining this minute: ${stats.remainingMinute}
- Next reset: ${stats.nextReset}

### Cache
- Total entries: ${cacheStats.totalEntries}
- Valid entries: ${cacheStats.validEntries}
- Stale entries: ${cacheStats.staleEntries}

### Request Metadata
- Cached: ${metadata.cached ? 'yes' : 'no'}
- Fallback used: ${metadata.fallback ? 'yes' : 'no'}
- Endpoint: ${metadata.endpoint || 'unknown'}

---
`;
    
    try {
      await fs.mkdir(path.dirname(this.memoryBankPath), { recursive: true });
      let existing = '';
      try {
        existing = await fs.readFile(this.memoryBankPath, 'utf8');
      } catch (e) {
        // Ficheiro não existe, começa vazio
      }
      await fs.writeFile(this.memoryBankPath, existing + entry);
    } catch (err) {
      console.warn(`⚠️ Could not update memory bank: ${err.message}`);
    }
  }
  
  // Métodos helpers específicos
  async getDirections(coordinates, options = {}) {
    return this.request('directions/driving-car', 'POST', { coordinates }, options);
  }
  
  async geocode(address, options = {}) {
    return this.request('geocode/search', 'GET', null, { ...options, params: { text: address } });
  }
  
  async getIsochrones(coordinates, range = 600, options = {}) {
    return this.request('isochrones', 'POST', {
      locations: [coordinates],
      range: [range],
      range_type: 'time',
    }, options);
  }
}

module.exports = { OpenRouteClient };