# 💝 For Her Gift

An AI-powered romantic gift generator for National Girlfriend's Day.

## What it does

1. You fill in details about your girlfriend (name, how you met, favorite things, a memory, photo, vibe)
2. The backend uses **machine learning** (Hugging Face API) to generate a unique, personalized love letter
3. If the ML API is unavailable, it falls back to an **advanced combinatorial NLG system** with a large contextual vocabulary — no two letters are ever the same
4. It generates a **self-contained, shareable HTML page** with the TikTok-style experience:
   - 🚪 Gate: "Do you want to open it?"
   - 😢 Rejection loop: Sad character if she says "No ty"
   - 💌 Envelope: 3D opening animation with heart confetti
   - 💕 Letter: Her photo, personalized AI-generated text, memory tags

## Tech Stack

- **Backend:** Node.js + Express
- **ML:** Hugging Face Inference API (Zephyr-7B) with smart algorithmic fallback
- **Frontend:** Vanilla JavaScript, Canvas 2D (particles + confetti physics), CSS3 (3D transforms, glassmorphism)
- **Generated pages:** Self-contained HTML (no external dependencies)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open http://localhost:3000 in your browser
```

## Optional: Better ML with API Key

The app works without any API key (uses the smart fallback), but for higher-quality ML generation:

1. Get a free API key from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Set it as an environment variable:
   ```bash
   HF_API_KEY=your_key_here npm start
   ```

## How to share

After creating a gift, copy the generated URL and send it to her. The link works forever — each story is saved as a standalone HTML file.

To host publicly:
- **Free:** Drag the entire project folder to [Netlify Drop](https://app.netlify.com/drop)
- **Or:** Use Vercel, Railway, Render, or any Node.js host

## File Structure

```
for-her-gift/
├── server.js              # Express server
├── package.json           # Dependencies
├── lib/
│   ├── mlGenerator.js     # ML + smart NLG text generation
│   └── buildStory.js      # HTML story page builder
└── public/
    ├── index.html         # Creator form
    ├── style.css          # Creator styles
    ├── app.js             # Creator frontend logic
    └── stories/           # Generated story pages (auto-created)
```

Made with love 💗
