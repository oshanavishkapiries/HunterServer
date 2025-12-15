/**
 * Rate Limiter for LLM API Calls
 * Handles request throttling, retry logic, and rate limit management
 */

class RateLimiter {
    constructor(options = {}) {
        // Rate limit settings
        this.requestsPerMinute = options.requestsPerMinute || 60;
        this.requestsPerDay = options.requestsPerDay || 1500;
        this.minDelayMs = options.minDelayMs || 100;

        // Retry settings
        this.maxRetries = options.maxRetries || 3;
        this.retryDelayMs = options.retryDelayMs || 1000;
        this.retryMultiplier = options.retryMultiplier || 2;

        // Tracking
        this.requestTimes = [];
        this.dailyRequestCount = 0;
        this.dailyResetTime = this.getNextDayReset();

        // Stats
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rateLimitHits: 0,
            totalRetries: 0
        };
    }

    /**
     * Get next midnight for daily reset
     */
    getNextDayReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }

    /**
     * Check and reset daily counter if needed
     */
    checkDailyReset() {
        const now = Date.now();
        if (now >= this.dailyResetTime) {
            this.dailyRequestCount = 0;
            this.dailyResetTime = this.getNextDayReset();
            console.log('[rate-limiter] Daily request count reset');
        }
    }

    /**
     * Clean old request times (older than 1 minute)
     */
    cleanOldRequests() {
        const oneMinuteAgo = Date.now() - 60000;
        this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    }

    /**
     * Calculate delay needed before next request
     * @returns {number} - Milliseconds to wait
     */
    getDelayMs() {
        this.cleanOldRequests();
        this.checkDailyReset();

        // Check daily limit
        if (this.dailyRequestCount >= this.requestsPerDay) {
            const msUntilReset = this.dailyResetTime - Date.now();
            console.log(`[rate-limiter] Daily limit reached. Reset in ${Math.round(msUntilReset / 1000 / 60)} minutes`);
            return msUntilReset;
        }

        // Check per-minute limit
        if (this.requestTimes.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimes[0];
            const msUntilSlotAvailable = oldestRequest + 60000 - Date.now();
            return Math.max(msUntilSlotAvailable, this.minDelayMs);
        }

        return this.minDelayMs;
    }

    /**
     * Wait for rate limit
     */
    async waitForSlot() {
        const delayMs = this.getDelayMs();
        if (delayMs > this.minDelayMs) {
            console.log(`[rate-limiter] Waiting ${Math.round(delayMs / 1000)}s for rate limit...`);
            await this.sleep(delayMs);
        }
    }

    /**
     * Record a request
     */
    recordRequest() {
        this.requestTimes.push(Date.now());
        this.dailyRequestCount++;
        this.stats.totalRequests++;
    }

    /**
     * Execute a function with rate limiting and retry logic
     * @param {Function} fn - Async function to execute
     * @param {string} label - Label for logging
     * @returns {Promise<any>} - Result from function
     */
    async execute(fn, label = 'request') {
        let lastError = null;
        let retryDelay = this.retryDelayMs;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Wait for rate limit slot
                await this.waitForSlot();

                // Record the request
                this.recordRequest();

                // Execute the function
                const startTime = Date.now();
                const result = await fn();
                const duration = Date.now() - startTime;

                this.stats.successfulRequests++;

                if (duration > 5000) {
                    console.log(`[rate-limiter] ${label} completed in ${Math.round(duration / 1000)}s`);
                }

                return result;

            } catch (error) {
                lastError = error;

                // Check if it's a rate limit error
                if (this.isRateLimitError(error)) {
                    this.stats.rateLimitHits++;
                    console.log(`[rate-limiter] Rate limit hit on attempt ${attempt}/${this.maxRetries}`);

                    // Extract retry-after if available
                    const retryAfter = this.extractRetryAfter(error);
                    if (retryAfter) {
                        retryDelay = retryAfter * 1000;
                    }
                } else {
                    console.log(`[rate-limiter] Error on attempt ${attempt}/${this.maxRetries}: ${error.message}`);
                }

                // Don't retry on last attempt
                if (attempt < this.maxRetries) {
                    this.stats.totalRetries++;
                    console.log(`[rate-limiter] Retrying in ${Math.round(retryDelay / 1000)}s...`);
                    await this.sleep(retryDelay);
                    retryDelay *= this.retryMultiplier;
                }
            }
        }

        this.stats.failedRequests++;
        throw lastError;
    }

    /**
     * Check if error is a rate limit error
     */
    isRateLimitError(error) {
        const message = error.message?.toLowerCase() || '';
        const status = error.status || error.statusCode || error.code;

        return (
            status === 429 ||
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('quota exceeded') ||
            message.includes('resource exhausted')
        );
    }

    /**
     * Extract retry-after seconds from error
     */
    extractRetryAfter(error) {
        // Try to get from error headers or message
        if (error.headers?.['retry-after']) {
            return parseInt(error.headers['retry-after']);
        }

        // Try to parse from error message
        const match = error.message?.match(/retry after (\d+)/i);
        if (match) {
            return parseInt(match[1]);
        }

        return null;
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current stats
     */
    getStats() {
        this.cleanOldRequests();
        return {
            ...this.stats,
            requestsInLastMinute: this.requestTimes.length,
            dailyRequestsRemaining: this.requestsPerDay - this.dailyRequestCount,
            msUntilDailyReset: Math.max(0, this.dailyResetTime - Date.now())
        };
    }

    /**
     * Log current stats
     */
    logStats() {
        const stats = this.getStats();
        console.log('[rate-limiter] Stats:', {
            total: stats.totalRequests,
            success: stats.successfulRequests,
            failed: stats.failedRequests,
            rateLimitHits: stats.rateLimitHits,
            lastMinute: stats.requestsInLastMinute,
            dailyRemaining: stats.dailyRequestsRemaining
        });
    }
}

module.exports = { RateLimiter };
