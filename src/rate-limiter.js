/**
 * Rate Limiter para OpenRoute API
 * Limites: 20 req/min, 50 req/dia
 */

class OpenRouteRateLimiter {
  constructor(maxPerMinute = 20, maxPerDay = 50) {
    this.maxPerMinute = maxPerMinute;
    this.maxPerDay = maxPerDay;
    this.tokens = maxPerMinute;
    this.lastRefill = Date.now();
    this.dailyCount = 0;
    this.lastDailyReset = this.getStartOfDay();
  }

  getStartOfDay() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * (this.maxPerMinute / 60);
    this.tokens = Math.min(this.maxPerMinute, this.tokens + newTokens);
    this.lastRefill = now;
  }

  checkDailyLimit() {
    const now = Date.now();
    const todayStart = this.getStartOfDay();
    if (now > this.lastDailyReset + 86400000) {
      this.dailyCount = 0;
      this.lastDailyReset = todayStart;
    }
    if (this.dailyCount >= this.maxPerDay) {
      throw new Error(`Daily limit reached (${this.maxPerDay}/${this.maxPerDay}). Use fallback.`);
    }
  }

  async waitForToken() {
    this.refill();
    this.checkDailyLimit();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.dailyCount += 1;
      return;
    }
    const waitTime = ((1 - this.tokens) * 60 / this.maxPerMinute) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return this.waitForToken();
  }

  getStats() {
    return {
      remainingToday: this.maxPerDay - this.dailyCount,
      remainingMinute: Math.floor(this.tokens),
      nextReset: new Date(this.lastDailyReset + 86400000).toISOString(),
      dailyCount: this.dailyCount,
    };
  }
}

module.exports = { OpenRouteRateLimiter };