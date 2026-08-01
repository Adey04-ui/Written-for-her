/**
 * For Her Gift — Server
 * 
 * Express backend that:
 * 1. Serves the creator form (static files)
 * 2. Receives story data via POST /api/create
 * 3. Generates personalized letter text using ML
 * 4. Builds a self-contained HTML story page
 * 5. Saves it and returns a shareable URL
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateLetter } = require('./lib/mlGenerator');
const { buildStoryPage } = require('./lib/buildStory');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies (up to 10MB for base64 photos)
app.use(express.json({ limit: '10mb' }));

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Ensure stories directory exists
const STORIES_DIR = path.join(__dirname, 'public', 'stories');
if (!fs.existsSync(STORIES_DIR)) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
}

/**
 * Convert a name to a URL-safe slug.
 */
function slugify(name) {
  return (name || 'story')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30) || 'story';
}

/**
 * Generate a unique story ID that doesn't collide with existing files.
 */
function makeId(name) {
  const base = slugify(name);
  let id;
  do {
    id = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  } while (fs.existsSync(path.join(STORIES_DIR, `${id}.html`)));
  return id;
}

/**
 * POST /api/create
 * Receives story data, generates ML letter, builds HTML page, returns URL.
 */
app.post('/api/create', async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').toString().trim();

    if (!name) {
      return res.status(400).json({ error: 'Her name is required.' });
    }

    // Parse favorites
    const favsInput = body.favs;
    const favs = Array.isArray(favsInput)
      ? favsInput.map(f => String(f).trim()).filter(Boolean)
      : String(favsInput || '')
          .split(',')
          .map(f => f.trim())
          .filter(Boolean);

    // Build story object
    const story = {
      name: name.slice(0, 60),
      met: (body.met || '').toString().trim().slice(0, 300),
      place: (body.place || '').toString().trim().slice(0, 150),
      favs: favs.slice(0, 8),
      vibe: ['dreamy', 'playful', 'elegant'].includes(body.vibe) ? body.vibe : 'dreamy',
      memory: (body.memory || '').toString().trim().slice(0, 500),
      from: (body.from || '').toString().trim().slice(0, 60),
      photo: (body.photo || '').toString().slice(0, 5_000_000), // 5MB base64 limit
    };

    console.log(`[CREATE] Generating letter for: ${story.name} (vibe: ${story.vibe})`);

    // Generate letter using ML
    const letterText = await generateLetter(story);
    story.letterText = letterText;

    console.log(`[CREATE] Letter generated (${letterText.length} chars)`);

    // Build standalone HTML page
    const id = makeId(story.name);
    const html = buildStoryPage(story);
    const filePath = path.join(STORIES_DIR, `${id}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    console.log(`[CREATE] Saved story: ${id}.html`);

    res.json({
      success: true,
      id,
      url: `/stories/${id}.html`,
      preview: letterText.slice(0, 120) + '...',
    });
  } catch (err) {
    console.error('[CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to create gift. Please try again.' });
  }
});

/**
 * GET /api/health
 * Health check endpoint.
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('  💝 For Her Gift is running!');
  console.log('  ═══════════════════════════');
  console.log(`  🌐 Open: http://localhost:${PORT}`);
  console.log('');
  console.log('  To create a gift for her:');
  console.log('  1. Open the URL above in your browser');
  console.log('  2. Fill in her details');
  console.log('  3. Click "Create Her Gift"');
  console.log('  4. Share the generated link!');
  console.log('');
});
