/**
 * For Her Gift — Server
 * 
 * Works locally (npm start) AND on Vercel serverless.
 * Storage: Redis (Upstash) in production, filesystem locally.
 */

const express = require('express');
const path = require('path');
const { generateLetter } = require('./lib/mlGenerator');
const { buildStoryPage } = require('./lib/buildStory');
const { saveStory, getStory } = require('./lib/storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function slugify(name) {
  return (name || 'story')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30) || 'story';
}

async function makeId(name) {
  const base = slugify(name);
  let id;
  let attempts = 0;
  do {
    id = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    attempts++;
  } while (attempts < 10);
  return id;
}

app.post('/api/create', async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').toString().trim();

    if (!name) {
      return res.status(400).json({ error: 'Her name is required.' });
    }

    const favsInput = body.favs;
    const favs = Array.isArray(favsInput)
      ? favsInput.map(f => String(f).trim()).filter(Boolean)
      : String(favsInput || '')
          .split(',')
          .map(f => f.trim())
          .filter(Boolean);

    const story = {
      name: name.slice(0, 60),
      met: (body.met || '').toString().trim().slice(0, 300),
      place: (body.place || '').toString().trim().slice(0, 150),
      favs: favs.slice(0, 8),
      vibe: ['dreamy', 'playful', 'elegant'].includes(body.vibe) ? body.vibe : 'dreamy',
      memory: (body.memory || '').toString().trim().slice(0, 500),
      from: (body.from || '').toString().trim().slice(0, 60),
      photo: (body.photo || '').toString().slice(0, 5_000_000),
    };

    console.log(`[CREATE] Generating letter for: ${story.name} (vibe: ${story.vibe})`);

    const letterText = await generateLetter(story);
    story.letterText = letterText;

    console.log(`[CREATE] Letter generated (${letterText.length} chars)`);

    const id = await makeId(story.name);
    const html = buildStoryPage(story);
    await saveStory(id, html);

    console.log(`[CREATE] Saved story: ${id}`);

    res.json({
      success: true,
      id,
      url: `/stories/${id}`,
      preview: letterText.slice(0, 120) + '...',
    });
  } catch (err) {
    console.error('[CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to create gift. Please try again.' });
  }
});

// Serve stories from storage (Redis or filesystem)
app.get('/stories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // Strip .html if user visits the old URL format
    const cleanId = id.replace(/\.html$/, '');
    const html = await getStory(cleanId);

    if (!html) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><title>Not Found</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px;color:#e11d52;">
          <h1>💔 Story not found</h1>
          <p>This gift link may have expired or does not exist.</p>
          <a href="/" style="color:#f43f6a;">Create a new gift</a>
        </body></html>
      `);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[SERVE ERROR]', err);
    res.status(500).send('Something went wrong.');
  }
});

// Also support old .html URLs
app.get('/stories/:id.html', async (req, res) => {
  const id = req.params.id;
  const html = await getStory(id);
  if (!html) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  💝 For Her Gift is running!');
    console.log('  ═══════════════════════════');
    console.log(`  🌐 Open: http://localhost:${PORT}`);
    console.log('');
  });
}

module.exports = app;
