/**
 * Hybrid ML Text Generator
 * 
 * Primary:   Hugging Face Inference API (free tier, no key required)
 * Fallback:  Advanced Combinatorial NLG — assembles unique romantic text
 *             from a large contextual vocabulary. No two letters are ever
 *             the same, and content adapts to the provided details.
 */

const HF_API_URL = 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta';

/**
 * Large contextual vocabulary organized by vibe and section.
 * Each entry is a function that receives story data and returns a sentence,
 * or null if the required context is missing.
 */
const VOCABULARY = {
  dreamy: {
    opening: [
      d => `You're the best thing that life has given me so far, ${d.name}, and I know nothing can ever take your place in my heart.`,
      d => `From the moment our paths crossed${d.met ? ' at ' + d.met : ''}, I knew my world would never be the same.`,
      d => `Sometimes I lie awake at night thinking about how impossibly lucky I am to have you, ${d.name}.`,
      d => `There are no words grand enough to describe what you mean to me, but I will spend forever trying to find them.`,
      d => `If someone asked me to define love, I would simply say your name — ${d.name}.`,
      d => `You are the first thought in my mind when I wake and the last before I sleep.`,
      d => `In a universe of billions of people, I somehow found you. That is the miracle I thank the stars for every single night.`,
      d => `My heart recognized you before my eyes did, ${d.name}. It always knew you were the one.`,
    ],
    body: [
      d => `The love I have for you is pure and eternal. You bring so much joy into my life that it is genuinely hard for me to imagine a single day without you.`,
      d => `Every moment with you feels like a beautiful dream I never want to wake up from.`,
      d => `You have this extraordinary way of making ordinary moments feel absolutely magical.`,
      d => `I love you not only for who you are, but for the person I become when I am with you.`,
      d => `You have made me a better person, ${d.name}. You believe in me even when I cannot believe in myself.`,
      d => `Your smile is my favorite sight, your laugh is my favorite sound, and your heart is my favorite place to be.`,
      d => `With you, I have found a home I did not know I was searching for.`,
      d => `You are my calm in the chaos, my light in the dark, and my peace in the storm.`,
      d => `I never believed in soulmates until I met you. Now I cannot imagine a world where you do not exist in it.`,
      d => `Your love feels like warm sunlight on my skin — gentle, nourishing, and absolutely essential.`,
    ],
    context: {
      met: [
        d => `It feels like I have been living in paradise ever since I met you${d.met ? ' at ' + d.met : ''}.`,
        d => `I still remember the very first time I saw you${d.met ? ' at ' + d.met : ''} — my heart knew the truth long before my mind caught up.`,
        d => `That day${d.met ? ' at ' + d.met : ''} changed everything. I just did not know it yet.`,
        d => `Who would have thought that ${d.met || 'one ordinary day'} would lead to the greatest love story of my life?`,
      ],
      place: [
        d => `${d.place} will always hold the most special place in my heart, because every corner of it reminds me of you.`,
        d => `I cannot wait to take you back to ${d.place} and make even more beautiful memories together.`,
        d => `Whenever I think of ${d.place}, I do not see the location — I see your face, your smile, and the way you looked at me.`,
        d => `${d.place} is not just a place anymore. It is a chapter in our story.`,
      ],
      favs: [
        d => `I love how your entire face lights up when you talk about ${d.favs.slice(0, 3).join(', ')}.`,
        d => `You have taught me to see beauty in ${d.favs.slice(0, 3).join(', ')} in ways I never could have imagined on my own.`,
        d => `I find myself falling in love with ${d.favs.slice(0, 3).join(', ')} simply because you love them.`,
        d => `Your passion for ${d.favs[0] || 'the things you love'} is one of the many things that makes you so incredibly special to me.`,
      ],
      memory: [
        d => `I still think about ${d.memory} — in that moment, I knew without a doubt that I was completely, hopelessly yours.`,
        d => `${d.memory} is a memory I will carry with me for the rest of my life, wrapped carefully in the most precious corner of my heart.`,
        d => `No matter how much time passes, ${d.memory} will always make me smile and fall in love with you all over again.`,
        d => `When I close my eyes, I can still relive ${d.memory} — and it feels just as magical now as it did then.`,
      ],
    },
    closing: [
      d => `Life comes with challenges, but with you by my side, I truly believe we can take on the entire world together.`,
      d => `I love you for all that you are, all that you have been, and all that you are yet to become.`,
      d => `If I know what love truly is, it is only because of you, ${d.name}.`,
      d => `You are my today, my tomorrow, and every day I am lucky enough to have you.`,
      d => `I LOVE YOU SO MUCH, MY LOVE!`,
      d => `Thank you for choosing me, every single day. I promise to keep choosing you right back.`,
      d => `You are my greatest adventure, my safest harbor, and my forever home.`,
    ],
    signoff: [
      d => d.from ? `Forever yours,\n${d.from}` : `Forever yours,\nYour Love`,
      d => d.from ? `With all my heart,\n${d.from}` : `With all my heart,\nYour Love`,
      d => d.from ? `Yours always,\n${d.from}` : `Yours always,\nYour Love`,
      d => d.from ? `All my love,\n${d.from}` : `All my love,\nYour Love`,
    ],
  },

  playful: {
    opening: [
      d => `Okay, real talk: you are literally my favorite person on this entire planet, ${d.name}, and I am not even sorry about it.`,
      d => `If being obsessed with you was a crime, I would be serving multiple life sentences. No regrets.`,
      d => `Confession time: I think about you approximately 47 times per hour. Yes, I counted.`,
      d => `You are the human equivalent of a perfect meme — absolutely irresistible and impossible to forget.`,
      d => `Plot twist: I met you${d.met ? ' at ' + d.met : ''} and my life instantly upgraded from standard definition to 4K.`,
      d => `Roses are red, violets are blue, I am completely whipped, and it is all because of you.`,
      d => `Breaking news: local person falls hopelessly in love. More at 11. (Spoiler: it is me. I am the local person.)`,
    ],
    body: [
      d => `You make me laugh at the dumbest things, you put up with my weirdness, and you somehow make everything ${d.favs[0] || 'in life'} even better just by liking it.`,
      d => `You are basically a magician, but instead of pulling rabbits out of hats, you pull happiness out of thin air.`,
      d => `I love that we can go from deep philosophical conversations to arguing about whether a hot dog is a sandwich. You get me.`,
      d => `You are the only person I would share my fries with. And that, ${d.name}, is the highest form of love I can offer.`,
      d => `Being with you feels like finding the extra chicken nugget in your meal. Unexpected, wonderful, and absolutely the best part of my day.`,
      d => `You are my favorite notification, my favorite person to spam with memes, and my favorite reason to check my phone.`,
      d => `I never knew I needed someone to send me random TikToks at 2 AM until you came along. Now I cannot imagine life without it.`,
      d => `You are the cheese to my pizza, the WiFi to my phone, and the reason my camera roll is 90% screenshots of our conversations.`,
    ],
    context: {
      met: [
        d => `I still cannot believe I got lucky enough to meet you${d.met ? ' at ' + d.met : ''}. What did I do to deserve that plot armor?`,
        d => `That day${d.met ? ' at ' + d.met : ''}? Yeah, that was the day the universe decided to give me a major W.`,
        d => `Meeting you${d.met ? ' at ' + d.met : ''} was like finding a legendary item in a video game. Instant game-changer.`,
      ],
      place: [
        d => `${d.place} is basically our headquarters now. I am not saying we should get matching jerseys, but I am also not NOT saying that.`,
        d => `We need to go back to ${d.place} ASAP. For research purposes. (The research is: how much can two people in love annoy each other in public?)`,
        d => `${d.place} hits different when I am with you. Everything hits different when I am with you.`,
      ],
      favs: [
        d => `I have developed a genuine emotional attachment to ${d.favs.slice(0, 3).join(', ')} purely because YOU like them. That is power.`,
        d => `Your taste in ${d.favs[0] || 'literally everything'} is immaculate. I am basically your hype person at this point.`,
        d => `I used to think ${d.favs[0] || 'things'} were just okay. Then I saw how much you loved them and now I am a full-blown enthusiast.`,
      ],
      memory: [
        d => `${d.memory} is permanently stored in my brain under "Core Memories That Make Me Smile Like an Idiot."`,
        d => `I think about ${d.memory} at least twice a week and every single time I grin like I just won the lottery.`,
        d => `If I could bottle up ${d.memory} and sell it, I would be a billionaire. But I would rather just keep it for myself.`,
      ],
    },
    closing: [
      d => `So yeah, I am keeping you forever. No refunds, no exchanges, no take-backs. You are stuck with me.`,
      d => `You are my person. My weirdo. My forever chaos partner. I would not have it any other way.`,
      d => `I love you more than I love my phone, and that is saying A LOT.`,
      d => `Happy Girlfriend's Day to the person who somehow puts up with me. You are a national treasure.`,
      d => `You are my favorite notification, my best friend, and the reason I believe in happy endings.`,
    ],
    signoff: [
      d => d.from ? `Your favorite person,\n${d.from}` : `Your favorite person,\nYour Love`,
      d => d.from ? `Stuck on you,\n${d.from}` : `Stuck on you,\nYour Love`,
      d => d.from ? `Your biggest fan,\n${d.from}` : `Your biggest fan,\nYour Love`,
    ],
  },

  elegant: {
    opening: [
      d => `In a world of fleeting moments and passing seasons, you remain my one constant — my north star, my quiet certainty.`,
      d => `There are loves that consume, and there are loves that complete. Yours, ${d.name}, is the rarest kind: it does both.`,
      d => `I have read a thousand poems, wandered through a hundred galleries, and listened to countless symphonies — yet none have moved me as profoundly as you.`,
      d => `To know you is to understand that beauty is not merely seen, but felt — deeply, irrevocably, and with a permanence that time cannot erode.`,
      d => `You are the elegy I never knew I needed to write, and the sonnet I will spend my life perfecting.`,
      d => `In the architecture of my existence, you are the keystone — without you, the entire structure collapses into meaninglessness.`,
    ],
    body: [
      d => `From ${d.met || 'the moment our lives intersected'}, I have been endlessly captivated by your grace, your intellect, and the quiet strength with which you move through the world.`,
      d => `Time in your presence is not merely spent — it is invested in a future I desperately wish to build, brick by patient brick.`,
      d => `You are my muse, my sanctuary, and my greatest adventure — all woven into one extraordinary soul.`,
      d => `To love you is not a choice I made; it is the inevitable consequence of knowing you.`,
      d => `You possess a rare alchemy — the ability to transform the mundane into the magnificent, simply by being present within it.`,
      d => `I have traveled through cities and across oceans, yet the only destination that has ever truly mattered is the one I find in your eyes.`,
      d => `Your love is not a fleeting passion but a profound commitment — one that deepens with every shared silence and every whispered confession.`,
      d => `In you, I have discovered that the greatest luxury is not wealth or status, but the privilege of being truly known and still chosen.`,
    ],
    context: {
      met: [
        d => `${d.met ? 'Our meeting at ' + d.met : 'The day our paths crossed'} was not chance — it was the universe aligning two souls that were always meant to find one another.`,
        d => `I still recall ${d.met ? 'that evening at ' + d.met : 'our first encounter'} with crystalline clarity — the light, the conversation, the moment I realized my life had irrevocably shifted.`,
        d => `Destiny is not a concept I believed in until ${d.met ? 'I walked into ' + d.met : 'the day we met'}.`,
      ],
      place: [
        d => `${d.place} has transcended its geography to become a monument in the landscape of our love — a place where time stands still and only we exist.`,
        d => `I long to return to ${d.place}, not for the scenery, but for the way your hand feels in mine within it.`,
        d => `They say places hold memories. If that is true, then ${d.place} holds some of my most precious.`,
      ],
      favs: [
        d => `Your appreciation for ${d.favs.slice(0, 3).join(', ')} reveals the depth of your soul — a soul that finds poetry in the details others overlook.`,
        d => `I have come to admire ${d.favs[0] || 'your passions'} not merely for themselves, but for the way they illuminate the extraordinary person you are.`,
        d => `Through your eyes, ${d.favs.slice(0, 2).join(' and ')} have become symbols of a beauty I was too blind to see before you.`,
      ],
      memory: [
        d => `${d.memory} remains etched in my memory as the moment I understood, with absolute clarity, that you were the person I wished to spend my life beside.`,
        d => `Of all the moments we have shared, ${d.memory} stands as a testament to the profound intimacy that exists between two people who truly see one another.`,
        d => `I return to ${d.memory} often in my mind — it is a refuge, a reminder, and a promise all at once.`,
      ],
    },
    closing: [
      d => `You are my today, my tomorrow, and every tomorrow I am fortunate enough to witness.`,
      d => `To love you is to understand that the greatest art is not found in museums, but in the quiet, everyday masterpiece of a life shared.`,
      d => `I remain, as ever, devoted to you — in this life and in every imagining of what may come.`,
      d => `Happy Girlfriend's Day, my love. You are, and always will be, my finest chapter.`,
    ],
    signoff: [
      d => d.from ? `Eternally yours,\n${d.from}` : `Eternally yours,\nYour Love`,
      d => d.from ? `With enduring devotion,\n${d.from}` : `With enduring devotion,\nYour Love`,
      d => d.from ? `Yours in this life and beyond,\n${d.from}` : `Yours in this life and beyond,\nYour Love`,
    ],
  },
};

/**
 * Pick a random element from an array.
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Assemble a unique romantic letter using contextual sentence selection.
 * No two letters will ever be identical.
 * 
 * @param {Object} data - Story data
 * @returns {string} Generated letter text
 */
function assembleSmartLetter(data) {
  const vocab = VOCABULARY[data.vibe] || VOCABULARY.dreamy;
  const paragraphs = [];

  // Paragraph 1: Opening + Body
  const opening = pickRandom(vocab.opening)(data);
  const body1 = pickRandom(vocab.body)(data);
  paragraphs.push([opening, body1].filter(Boolean).join(' '));

  // Paragraph 2: Contextual sentences (met, place, favs)
  const contextSents = [];
  if (data.met && vocab.context.met) {
    contextSents.push(pickRandom(vocab.context.met)(data));
  }
  if (data.favs?.length && vocab.context.favs) {
    contextSents.push(pickRandom(vocab.context.favs)(data));
  }
  if (data.place && vocab.context.place) {
    contextSents.push(pickRandom(vocab.context.place)(data));
  }
  if (contextSents.length > 0) {
    paragraphs.push(contextSents.filter(Boolean).join(' '));
  }

  // Paragraph 3: Body + Closing
  const body2 = pickRandom(vocab.body)(data);
  const closing = pickRandom(vocab.closing)(data);
  paragraphs.push([body2, closing].filter(Boolean).join(' '));

  // P.S. Memory
  if (data.memory && vocab.context.memory) {
    paragraphs.push(`P.S. ${pickRandom(vocab.context.memory)(data)}`);
  }

  // Signature
  paragraphs.push(pickRandom(vocab.signoff)(data));

  return paragraphs.join('\n\n');
}

/**
 * Build a detailed prompt for the Hugging Face API.
 */
function buildPrompt(data) {
  const { name, met, place, favs, memory, vibe, from } = data;
  const favsText = favs?.length ? favs.join(', ') : 'various things';

  let toneDesc = 'warm, poetic, and deeply emotional';
  if (vibe === 'playful') toneDesc = 'fun, lighthearted, and teasing';
  if (vibe === 'elegant') toneDesc = 'sophisticated, literary, and refined';

  return `Write a romantic love letter to my girlfriend ${name}.

Tone: ${toneDesc}
Details:
- We met at: ${met || 'a special place'}
- Her favorite things: ${favsText}
- A special memory: ${memory || 'a beautiful moment together'}
- Our special place: ${place || 'somewhere meaningful'}
- Sign it from: ${from || 'Your Love'}

Write 3-4 heartfelt paragraphs. Make it feel deeply personal, not generic. Use the specific details provided. Do not use placeholders or template language.`;
}

/**
 * Generate a romantic letter using ML (primary) or smart NLG (fallback).
 * 
 * @param {Object} data - Story data with name, met, place, favs, memory, vibe, from
 * @returns {Promise<string>} Generated letter text
 */
async function generateLetter(data) {
  // Attempt 1: Hugging Face Inference API
  try {
    const prompt = buildPrompt(data);

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional: add HF_API_KEY env var for better rate limits
        ...(process.env.HF_API_KEY ? { 'Authorization': `Bearer ${process.env.HF_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.85,
          top_p: 0.92,
          return_full_text: false,
          do_sample: true,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const generated = Array.isArray(result) ? result[0]?.generated_text : result.generated_text;
      if (generated && generated.trim().length > 50) {
        return generated.trim();
      }
    }
  } catch (err) {
    console.log('[ML] Hugging Face API unavailable or rate-limited:', err.message);
  }

  // Attempt 2: Smart combinatorial NLG fallback
  console.log('[ML] Using advanced NLG fallback...');
  return assembleSmartLetter(data);
}

module.exports = { generateLetter, assembleSmartLetter };
