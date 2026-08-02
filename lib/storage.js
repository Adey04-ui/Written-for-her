/**
 * Storage Abstraction Layer
 * 
 * Uses Upstash Redis REST API when UPSTASH_REDIS_REST_URL is available.
 * Falls back to filesystem for local development.
 */

const fs = require('fs');
const path = require('path');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
const USE_REDIS = REDIS_URL && REDIS_TOKEN;

// Local filesystem fallback
const LOCAL_DIR = process.env.VERCEL
  ? path.join('/tmp', 'stories')
  : path.join(__dirname, '..', 'public', 'stories');

if (!fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

const REDIS_TTL = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Call Upstash Redis REST API
 */
async function redisRequest(command, ...args) {
  const url = `${REDIS_URL}/${command}/${args.map(a => encodeURIComponent(a)).join('/')}`;

  const options = {
    method: args.length > 1 ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
    },
  };

  // For SET with large values, send as POST body
  if (command === 'set' && args.length === 2) {
    options.body = args[1];
    options.headers['Content-Type'] = 'text/plain';
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis ${command} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Save a story page.
 */
async function saveStory(id, html) {
  if (USE_REDIS) {
    // Use Upstash REST API
    await redisRequest('set', `story:${id}`, html);
    // Also set TTL
    await redisRequest('expire', `story:${id}`, String(REDIS_TTL));
    console.log(`[Storage] Saved to Redis: ${id}`);
    return;
  }
  // Fallback: filesystem
  const filePath = path.join(LOCAL_DIR, `${id}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`[Storage] Saved to filesystem: ${id}.html`);
}

/**
 * Retrieve a story page.
 */
async function getStory(id) {
  if (USE_REDIS) {
    const data = await redisRequest('get', `story:${id}`);
    return data.result || null;
  }
  const filePath = path.join(LOCAL_DIR, `${id}.html`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return null;
}

/**
 * Check if a story exists.
 */
async function hasStory(id) {
  if (USE_REDIS) {
    const data = await redisRequest('exists', `story:${id}`);
    return data.result === 1;
  }
  return fs.existsSync(path.join(LOCAL_DIR, `${id}.html`));
}

module.exports = { saveStory, getStory, hasStory };
