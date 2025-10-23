#!/usr/bin/env node

/**
 * Health Check Script
 *
 * This script performs comprehensive health checks on the Medical Platform API.
 * It can be used for production monitoring, load balancer health checks, or deployment verification.
 *
 * Usage:
 *   node scripts/health-check.js [options]
 *
 * Options:
 *   --url <url>       API base URL (default: http://localhost:5000)
 *   --timeout <ms>    Request timeout in milliseconds (default: 5000)
 *   --verbose         Show detailed output
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const http = require('http');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index > -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const API_URL = getArg('--url', process.env.API_URL || 'http://localhost:5000');
const TIMEOUT = parseInt(getArg('--timeout', '5000'), 10);
const VERBOSE = args.includes('--verbose');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Log helpers
const log = (message) => console.log(message);
const logSuccess = (message) => log(`${colors.green}✓${colors.reset} ${message}`);
const logError = (message) => log(`${colors.red}✗${colors.reset} ${message}`);
const logWarning = (message) => log(`${colors.yellow}⚠${colors.reset} ${message}`);
const logInfo = (message) => VERBOSE && log(`${colors.blue}ℹ${colors.reset} ${message}`);

// Make HTTP request
const makeRequest = (url, timeout) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.get(url, { timeout }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Health check functions
const checks = {
  async healthEndpoint() {
    logInfo(`Checking health endpoint: ${API_URL}/health`);
    try {
      const { statusCode, data } = await makeRequest(`${API_URL}/health`, TIMEOUT);

      if (statusCode !== 200) {
        logError(`Health endpoint returned status ${statusCode}`);
        return false;
      }

      if (!data || data.status !== 'ok') {
        logError('Health endpoint returned invalid response');
        return false;
      }

      logSuccess(`Health endpoint: OK (${data.service})`);
      if (VERBOSE) {
        log(`  Timestamp: ${data.timestamp}`);
      }
      return true;
    } catch (error) {
      logError(`Health endpoint failed: ${error.message}`);
      return false;
    }
  },

  async responseTime() {
    logInfo('Checking response time');
    try {
      const startTime = Date.now();
      await makeRequest(`${API_URL}/health`, TIMEOUT);
      const responseTime = Date.now() - startTime;

      if (responseTime > 3000) {
        logWarning(`Response time is high: ${responseTime}ms`);
      } else if (responseTime > 1000) {
        logSuccess(`Response time: ${responseTime}ms (acceptable)`);
      } else {
        logSuccess(`Response time: ${responseTime}ms (excellent)`);
      }

      return true;
    } catch (error) {
      logError(`Response time check failed: ${error.message}`);
      return false;
    }
  },

  async notFoundHandling() {
    logInfo('Checking 404 handling');
    try {
      const { statusCode } = await makeRequest(`${API_URL}/nonexistent-endpoint`, TIMEOUT);

      if (statusCode === 404) {
        logSuccess('404 handling: OK');
        return true;
      } else {
        logWarning(`Expected 404, got ${statusCode}`);
        return true; // Not critical
      }
    } catch (error) {
      logError(`404 check failed: ${error.message}`);
      return false;
    }
  }
};

// Main execution
async function main() {
  log('\n' + colors.blue + '━'.repeat(60) + colors.reset);
  log(colors.blue + '  Medical Platform API - Health Check' + colors.reset);
  log(colors.blue + '━'.repeat(60) + colors.reset + '\n');

  log(`Target: ${API_URL}`);
  log(`Timeout: ${TIMEOUT}ms\n`);

  const results = [];

  for (const [name, check] of Object.entries(checks)) {
    const result = await check();
    results.push({ name, passed: result });
  }

  log('\n' + colors.blue + '━'.repeat(60) + colors.reset);
  log(colors.blue + '  Summary' + colors.reset);
  log(colors.blue + '━'.repeat(60) + colors.reset + '\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  if (passed === total) {
    logSuccess(`All checks passed (${passed}/${total})`);
    log('');
    process.exit(0);
  } else {
    logError(`Some checks failed (${passed}/${total})`);
    log('');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
