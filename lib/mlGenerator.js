/**
 * Hybrid ML Text Generator with Event Types & Multi-LLM Support
 * 
 * Backends (tried in order, with timeouts):
 * 1. OpenAI GPT-4o-mini (if OPENAI_API_KEY is set)
 * 2. Anthropic Claude (if ANTHROPIC_API_KEY is set)
 * 3. Google Gemini (if GEMINI_API_KEY is set)
 * 4. Hugging Face Inference API (free, no key, 5s timeout)
 * 5. Advanced Combinatorial NLG (local, instant)
 */

const HF_API_URL = 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta';

// ============================================================
// TIMEOUT FETCH HELPER — ADD THIS
// ============================================================
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ============================================================
// EVENT CONFIGURATION
// ============================================================
const EVENTS = {
  girlfriend_day: {
    label: "Girlfriend's Day",
    emoji: "💗",
    greeting: "Happy Girlfriend's Day",
    followUp: null,
    defaultSignoff: "Forever yours",
  },
  anniversary: {
    label: "Anniversary",
    emoji: "💍",
    greeting: "Happy Anniversary",
    followUp: {
      unit: { years: "Years", months: "Months", days: "Days" },
      count: "number",
    },
    defaultSignoff: "To many more",
  },
  birthday: {
    label: "Birthday",
    emoji: "🎂",
    greeting: "Happy Birthday",
    followUp: {
      age: "number",
    },
    defaultSignoff: "With all my love",
  },
  valentines: {
    label: "Valentine's Day",
    emoji: "🌹",
    greeting: "Happy Valentine's Day",
    followUp: null,
    defaultSignoff: "Yours always",
  },
  just_because: {
    label: "Just Because",
    emoji: "💌",
    greeting: "Just Because",
    followUp: null,
    defaultSignoff: "Thinking of you",
  },
  miss_you: {
    label: "I Miss You",
    emoji: "🥺",
    greeting: "I Miss You",
    followUp: null,
    defaultSignoff: "Until I see you again",
  },
  apology: {
    label: "I'm Sorry",
    emoji: "🙏",
    greeting: "I'm Sorry",
    followUp: null,
    defaultSignoff: "Hoping for forgiveness",
  },
  proposal: {
    label: "Will You Marry Me?",
    emoji: "💎",
    greeting: "Will You Marry Me?",
    followUp: null,
    defaultSignoff: "Forever and always",
  },
};

// ============================================================
// NLG VOCABULARY — Event-aware, vibe-aware, context-aware
// ============================================================
const VOCABULARY = {
  girlfriend_day: {
    dreamy: {
      opening: [
        d => `You're the best thing that life has given me so far, ${d.name}, and I know nothing can ever take your place in my heart.`,
        d => `Sometimes I lie awake at night and wonder how I got so lucky to have you, ${d.name}.`,
        d => `If someone asked me to define love, I would simply say your name — ${d.name}.`,
        d => `There are seven billion people in this world, and somehow the universe decided that I get to love you, ${d.name}.`,
        d => `My heart recognized you before my eyes did, ${d.name}. It always knew you were the one.`,
      ],
      body: [
        d => `The love I have for you is pure and eternal. You bring so much joy into my life that it is genuinely hard for me to imagine a single day without you.`,
        d => `Every moment with you feels like a beautiful dream I never want to wake up from.`,
        d => `I love you not only for who you are, but for the person I become when I am with you.`,
        d => `You have made me a better person, ${d.name}. You believe in me even when I cannot believe in myself.`,
        d => `Your smile is my favorite sight, your laugh is my favorite sound, and your heart is my favorite place to be.`,
        d => `With you, I have found a home I did not know I was searching for.`,
      ],
      closing: [
        d => `If I know what love truly is, it is only because of you, ${d.name}.`,
        d => `You are my today, my tomorrow, and every day I am lucky enough to have you.`,
        d => `I LOVE YOU SO MUCH, MY LOVE!`,
        d => `Thank you for choosing me, every single day. I promise to keep choosing you right back.`,
      ],
    },
    playful: {
      opening: [
        d => `Okay, real talk: you are literally my favorite person on this entire planet, ${d.name}, and I am not even sorry about it.`,
        d => `If being obsessed with you was a crime, I would be serving multiple life sentences. No regrets.`,
        d => `Confession time: I think about you approximately 47 times per hour. Yes, I counted.`,
        d => `You are the human equivalent of a perfect meme — absolutely irresistible and impossible to forget.`,
      ],
      body: [
        d => `You make me laugh at the dumbest things, you put up with my weirdness, and you somehow make everything better just by existing.`,
        d => `You are basically a magician, but instead of pulling rabbits out of hats, you pull happiness out of thin air.`,
        d => `I love that we can go from deep philosophical conversations to arguing about whether a hot dog is a sandwich.`,
        d => `You are the only person I would share my fries with. That, ${d.name}, is the highest form of love I can offer.`,
      ],
      closing: [
        d => `So yeah, I am keeping you forever. No refunds, no exchanges, no take-backs.`,
        d => `You are my person, my weirdo, my forever chaos partner.`,
        d => `I love you more than I love my phone, and that is saying A LOT.`,
        d => `Happy Girlfriend's Day to the person who somehow puts up with me.`,
      ],
    },
    elegant: {
      opening: [
        d => `In a world of fleeting moments and passing seasons, you remain my one constant — my north star, my quiet certainty.`,
        d => `There are loves that consume, and there are loves that complete. Yours, ${d.name}, is the rarest kind: it does both.`,
        d => `I have read a thousand poems, wandered through a hundred galleries, and listened to countless symphonies — yet none have moved me as profoundly as you.`,
        d => `To know you is to understand that beauty is not merely seen, but felt — deeply, irrevocably, and with a permanence that time cannot erode.`,
      ],
      body: [
        d => `Time in your presence is not merely spent — it is invested in a future I desperately wish to build, brick by patient brick.`,
        d => `You are my muse, my sanctuary, and my greatest adventure — all woven into one extraordinary soul.`,
        d => `To love you is not a choice I made; it is the inevitable consequence of knowing you.`,
        d => `You possess a rare alchemy — the ability to transform the mundane into the magnificent, simply by being present within it.`,
      ],
      closing: [
        d => `You are my today, my tomorrow, and every tomorrow I am fortunate enough to witness.`,
        d => `To love you is to understand that the greatest art is not found in museums, but in the quiet, everyday masterpiece of a life shared.`,
        d => `I remain, as ever, devoted to you — in this life and in every imagining of what may come.`,
      ],
    },
  },

  anniversary: {
    dreamy: {
      opening: [
        d => `${d.name}, today marks ${d.eventCount} ${d.eventUnit} of the greatest decision I ever made — choosing you.`,
        d => `${d.eventCount} ${d.eventUnit} ago, I promised you my heart. I had no idea you would take such good care of it, ${d.name}.`,
        d => `They say time flies when you are having fun, but with you, ${d.name}, time soars. ${d.eventCount} ${d.eventUnit} have never felt so short and so full all at once.`,
        d => `Every love story is beautiful, but ours is my absolute favorite — especially today, as we celebrate ${d.eventCount} ${d.eventUnit} together.`,
      ],
      body: [
        d => `Looking back on these ${d.eventCount} ${d.eventUnit}, I am overwhelmed by how much we have grown — not just as individuals, but as something greater than the sum of our parts.`,
        d => `Through every high and every low, you have been my constant. My anchor in storms and my wings in sunshine.`,
        d => `I am not the same person I was ${d.eventCount} ${d.eventUnit} ago, ${d.name}. You have softened my edges, sharpened my dreams, and taught me what it means to truly love.`,
        d => `The memories we have built are not just moments in time — they are the foundation of the life we are still writing together.`,
        d => `I still choose you. I will always choose you. Every single day, for the rest of my life.`,
      ],
      closing: [
        d => `Here is to the ${d.eventCount} ${d.eventUnit} we have shared, and to all the ones still waiting for us.`,
        d => `Happy Anniversary, my love. You are, and always will be, my greatest adventure.`,
        d => `I love you more today than I did ${d.eventCount} ${d.eventUnit} ago — and I did not think that was possible.`,
      ],
    },
    playful: {
      opening: [
        d => `Plot twist: we have survived ${d.eventCount} ${d.eventUnit} together and neither of us has been blocked yet. That is true love, ${d.name}.`,
        d => `${d.eventCount} ${d.eventUnit} of putting up with me? ${d.name}, you deserve a medal. Or at least a really nice dinner.`,
        d => `Statistically speaking, ${d.name}, you have spent ${d.eventCount} ${d.eventUnit} voluntarily choosing to be around me. That is either love or Stockholm syndrome, and I am choosing to believe it is love.`,
        d => `Can you believe it has been ${d.eventCount} ${d.eventUnit}? Because I cannot. Time really does fly when you are annoying the same person every day.`,
      ],
      body: [
        d => `We have laughed, cried, argued over nothing, made up over everything, and built a life that feels like the best inside joke ever told.`,
        d => `You still make my heart do that stupid fluttery thing after all this time. It is embarrassing and I would not change it for the world.`,
        d => `I love that we have our own language, our own traditions, and our own weird little world that no one else understands.`,
        d => `Thank you for being my emergency contact, my hype person, and my favorite notification for ${d.eventCount} ${d.eventUnit} straight.`,
      ],
      closing: [
        d => `Here is to ${d.eventCount} ${d.eventUnit} down and forever to go. No refunds.`,
        d => `Happy Anniversary, you beautiful weirdo. I would not want to annoy anyone else.`,
        d => `I love you more than pizza, and that is a commitment I do not make lightly.`,
      ],
    },
    elegant: {
      opening: [
        d => `${d.name}, as we commemorate ${d.eventCount} ${d.eventUnit} of shared existence, I find myself reflecting on the profound fortune of having found you.`,
        d => `Time, that most relentless of forces, has yielded to us ${d.eventCount} ${d.eventUnit} of accumulated grace — each day a testament to the enduring power of our bond.`,
        d => `In the grand tapestry of my life, these ${d.eventCount} ${d.eventUnit} with you represent the most intricate and beautiful threads I have ever known.`,
      ],
      body: [
        d => `Our journey has not been without its trials, yet every challenge has only served to deepen the foundation upon which we stand.`,
        d => `You have taught me that love is not merely an emotion, but a discipline — a daily practice of patience, devotion, and unwavering faith in one another.`,
        d => `The life we have constructed together over these ${d.eventCount} ${d.eventUnit} is not merely a collection of memories, but a living monument to what two souls can achieve when they choose each other without reservation.`,
        d => `I am endlessly grateful for your presence, your wisdom, and the quiet strength with which you navigate this world beside me.`,
      ],
      closing: [
        d => `To the ${d.eventCount} ${d.eventUnit} we have shared, and to the infinite horizon that stretches before us — I remain yours, completely and without condition.`,
        d => `Happy Anniversary, my beloved. You are the finest chapter of my life, and I intend to keep writing our story for as long as breath remains in my body.`,
      ],
    },
  },

  birthday: {
    dreamy: {
      opening: [
        d => `Happy Birthday, ${d.name}. On this day, the universe gave the world its most precious gift — and somehow, I get to be the one who loves you.`,
        d => `${d.name}, today we celebrate the day you entered this world and made it infinitely more beautiful just by existing in it.`,
        d => `Of all the days in the year, this one is my favorite — because it is the anniversary of the moment the world became a better place. Happy Birthday, ${d.name}.`,
      ],
      body: [
        d => d.eventCount ? `As you turn ${d.eventCount}, I hope you know that you are not just growing older — you are growing more radiant, more extraordinary, and more deeply loved with every passing year.` : `I hope you know that you are not just growing older — you are growing more radiant, more extraordinary, and more deeply loved with every passing year.`,
        d => `You deserve every beautiful thing this world has to offer, and I intend to spend my life trying to give them to you.`,
        d => `Your kindness, your strength, and your beautiful heart inspire me every single day. I am so grateful to know you, let alone love you.`,
        d => `May this year bring you as much joy as you bring to everyone lucky enough to know you.`,
      ],
      closing: [
        d => `Happy Birthday, my love. You are my favorite person, my favorite story, and my favorite everything.`,
        d => `Here is to you, ${d.name} — today and every day. I love you more than words could ever capture.`,
        d => `Make a wish, blow out the candles, and know that my wish already came true — because I have you.`,
      ],
    },
    playful: {
      opening: [
        d => `HAPPY BIRTHDAY, ${d.name.toUpperCase()}! 🎉 Yes, I am yelling. You deserve to be celebrated at maximum volume.`,
        d => `Breaking news: ${d.name} is officially another year older and somehow even more perfect. Scientists are baffled.`,
        d => `It is your birthday, ${d.name}, which means today is all about you. And yes, I will let you pick the restaurant. This is serious love.`,
      ],
      body: [
        d => d.eventCount ? `Level ${d.eventCount} unlocked! New skills: even more wisdom, even more beauty, and somehow even more patience for my nonsense.` : `New year, new level unlocked! New skills: even more wisdom, even more beauty, and somehow even more patience for my nonsense.`,
        d => `You are basically aging in reverse and it is not fair to the rest of us. But I am not complaining — I get to keep the trophy.`,
        d => `I got you the best gift I could think of: me. But I also got you a real gift, do not worry.`,
        d => `Today, you get unlimited back rubs, unlimited compliments, and unlimited veto power over what we watch. Use this power wisely.`,
      ],
      closing: [
        d => `Happy Birthday to the person who makes my life feel like a never-ending celebration.`,
        d => `I love you more than cake, and that is the truest thing I have ever said.`,
        d => `Now let us go do something fun before I get too emotional and ruin the vibe.`,
      ],
    },
    elegant: {
      opening: [
        d => `${d.name}, on this day of your birth, I find myself contemplating the extraordinary fortune of sharing this life with you.`,
        d => `As the world marks another year of your existence, I am reminded that the greatest gift I have ever received is the privilege of loving you.`,
        d => `Happy Birthday, ${d.name}. Today we honor not merely the passage of time, but the immeasurable enrichment you have brought to every soul you touch.`,
      ],
      body: [
        d => d.eventCount ? `At ${d.eventCount}, you possess a grace and wisdom that transcends your years — a depth of character that leaves me in perpetual awe.` : `You possess a grace and wisdom that transcends your years — a depth of character that leaves me in perpetual awe.`,
        d => `Your presence elevates every room, every conversation, and every moment of quiet intimacy we share.`,
        d => `I am endlessly inspired by your resilience, your compassion, and the effortless elegance with which you navigate this world.`,
        d => `May this year unfold before you like the finest symphony — each note more beautiful than the last.`,
      ],
      closing: [
        d => `Happy Birthday, my beloved. You are the standard by which I measure all that is good and true in this world.`,
        d => `I wish you a year of profound joy, unshakeable peace, and love that surrounds you as completely as mine does.`,
      ],
    },
  },

  valentines: {
    dreamy: {
      opening: [
        d => `Happy Valentine's Day, ${d.name}. On this day dedicated to love, I want you to know that you are the reason I understand what the word truly means.`,
        d => `They say Valentine's Day is for couples, but ${d.name}, every day with you feels like Valentine's Day — today is just the one where I get to be extra about it.`,
        d => `Roses are red, violets are blue, nothing in this world compares to loving you. Happy Valentine's Day, ${d.name}.`,
      ],
      body: [
        d => `You are my first thought in the morning and my last prayer at night. You are the poetry I never knew I could write.`,
        d => `I do not need a special day to tell you I love you, but I will take any excuse to remind you that you are the center of my universe.`,
        d => `Your love is the warmth that gets me through the coldest days and the light that guides me through the darkest nights.`,
        d => `I am hopelessly, completely, irrevocably yours — today and every day that follows.`,
      ],
      closing: [
        d => `Happy Valentine's Day, my heart. You are my forever valentine.`,
        d => `I love you more than all the chocolates, roses, and romantic gestures in the world — and that is saying something.`,
      ],
    },
    playful: {
      opening: [
        d => `Happy Valentine's Day, ${d.name}! Yes, I remembered. I even set a reminder. That is growth.`,
        d => `Roses are red, violets are blue, I am bad at poetry, but I really love you. Happy V-Day, ${d.name}!`,
        d => `It is Valentine's Day, which means I am legally required to be extra romantic. Consider this your warning, ${d.name}.`,
      ],
      body: [
        d => `You are my favorite person to annoy, my favorite person to laugh with, and my favorite person to share a blanket and do absolutely nothing with.`,
        d => `I would share my last slice of pizza with you. On Valentine's Day. That is true love and you cannot convince me otherwise.`,
        d => `Thank you for being the person who makes my phone battery die faster than it should. Every notification from you is worth it.`,
        d => `I love you more than I love sleeping in on weekends, and that is the most serious commitment I can make.`,
      ],
      closing: [
        d => `Happy Valentine's Day, you beautiful disaster. I would not have it any other way.`,
        d => `You are my person, my valentine, and my forever emergency contact. Love you!`,
      ],
    },
    elegant: {
      opening: [
        d => `On this day consecrated to love, I find myself compelled to articulate what my heart has known since the moment I met you, ${d.name}.`,
        d => `Happy Valentine's Day, ${d.name}. In a world that often feels indifferent, your love is the profound exception that gives my life its meaning.`,
        d => `The poets have spent centuries attempting to capture the essence of love, yet none have succeeded in describing what I feel when I look at you.`,
      ],
      body: [
        d => `Your love is not merely an emotion I experience, but a force that shapes the very architecture of my existence.`,
        d => `In you, I have discovered that the most profound beauty is not found in grand gestures, but in the quiet constancy of choosing one another, day after day.`,
        d => `You are the muse who inspires my finest thoughts, the sanctuary where my soul finds rest, and the adventure that makes every ordinary moment extraordinary.`,
        d => `To be loved by you is to understand that grace is not merely a concept, but a lived reality.`,
      ],
      closing: [
        d => `Happy Valentine's Day, my eternal love. You are, and always shall be, the finest chapter of my life.`,
        d => `I remain devoted to you — in this life and in every imagining of what may come.`,
      ],
    },
  },

  just_because: {
    dreamy: {
      opening: [
        d => `${d.name}, I woke up today and realized I had not told you recently just how much you mean to me. So here it is.`,
        d => `There is no special occasion today, ${d.name}. I just wanted you to know that you are on my mind, in my heart, and in every beautiful thought I have.`,
        d => `Sometimes the best reason to say "I love you" is no reason at all. So here it is: I love you, ${d.name}.`,
      ],
      body: [
        d => `I do not need a holiday or a milestone to remind me how lucky I am. I think about it every single day.`,
        d => `You make the ordinary extraordinary and the mundane magical. I am endlessly grateful for your presence in my life.`,
        d => `If I could bottle up the way you make me feel and carry it with me always, I would. But since I cannot, I will just keep loving you instead.`,
      ],
      closing: [
        d => `No reason. No occasion. Just love. Always love.`,
        d => `Thank you for being you, ${d.name}. That is more than enough.`,
      ],
    },
    playful: {
      opening: [
        d => `Hey ${d.name}, this is a random love attack. You have been loved. There is no escape.`,
        d => `No special occasion. No birthday. No anniversary. Just me, being annoyingly in love with you, ${d.name}.`,
        d => `Breaking news: ${d.name} is loved for absolutely no reason other than being perfect. More at 11.`,
      ],
      body: [
        d => `I was going about my day, being a normal functioning human, and then I thought about you and completely lost my train of thought.`,
        d => `You are like a song that gets stuck in my head, except I never want it to leave.`,
        d => `I love you more than I love my bed, and that is the highest compliment I can give anyone.`,
      ],
      closing: [
        d => `That is all. Go back to being amazing. I will be here, loving you for no reason at all.`,
        d => `Random love bomb deployed. Mission accomplished.`,
      ],
    },
    elegant: {
      opening: [
        d => `${d.name}, there is no occasion that compels this letter — only the persistent, undeniable truth that you occupy my thoughts with a frequency that demands expression.`,
        d => `I write to you today not because the calendar demands it, but because my heart permits no alternative.`,
        d => `In the quiet spaces between obligations and distractions, my mind invariably returns to you, ${d.name}.`,
      ],
      body: [
        d => `Your influence upon my life is not measured in grand gestures, but in the subtle transformation of my perspective — the way I see beauty more clearly, feel gratitude more deeply, and love more completely.`,
        d => `I require no special occasion to acknowledge what my heart knows with absolute certainty: that loving you is the most significant experience of my existence.`,
        d => `May this unsolicited declaration serve as a small testament to the profound and permanent place you hold within me.`,
      ],
      closing: [
        d => `Without occasion, without reservation, and without end — I am yours.`,
        d => `Simply, completely, and eternally devoted to you.`,
      ],
    },
  },

  miss_you: {
    dreamy: {
      opening: [
        d => `${d.name}, the distance between us feels unbearable today. I miss you in ways I did not know were possible.`,
        d => `I keep reaching for you in my sleep, ${d.name}, and waking up to find you are not there. I miss you more than words can say.`,
        d => `Every place I go reminds me of you. Every song I hear makes me wish you were here. I miss you, ${d.name}.`,
      ],
      body: [
        d => `The space you leave behind is not empty — it is full of everything I wish I could share with you right now.`,
        d => `I miss your laugh, your touch, the way you say my name. I miss the version of myself that exists only when I am with you.`,
        d => `Counting down the moments until I can hold you again is the only thing getting me through.`,
      ],
      closing: [
        d => `Come back to me soon, ${d.name}. My heart is not whole without you.`,
        d => `Until I see you again, I will carry you in every thought and every heartbeat.`,
      ],
    },
    playful: {
      opening: [
        d => `${d.name}, I miss you. Yes, I am being dramatic about it. No, I will not apologize.`,
        d => `Emergency alert: ${d.name} is missing from my vicinity. This is unacceptable. Please return immediately.`,
        d => `I miss you so much that I have started talking to your side of the bed. It is not responding. This is your fault, ${d.name}.`,
      ],
      body: [
        d => `My life has officially downgraded from "full color" to "black and white" without you. It is tragic.`,
        d => `I have eaten all the snacks we were supposed to share. I regret nothing, but I miss you enough to buy more.`,
        d => `The only thing worse than missing you is knowing you are probably having fun without me. Rude.`,
      ],
      closing: [
        d => `Hurry back before I forget what you look like. (I am kidding. I have your photo as my wallpaper. I am fine. I am not fine. I miss you.)`,
        d => `Come home soon, you beautiful distraction. My heart is bored without you.`,
      ],
    },
    elegant: {
      opening: [
        d => `${d.name}, the absence of your presence has created a void that no amount of distraction can fill.`,
        d => `In your absence, ${d.name}, I have come to understand that distance does not diminish love — it merely intensifies the ache of separation.`,
        d => `The spaces between us are not measured in miles, but in the number of moments I spend wishing you were here.`,
      ],
      body: [
        d => `I find myself reaching for you in the quiet hours, my hand finding only empty sheets where your warmth should be.`,
        d => `Every sunset I witness without you feels incomplete, as though the sky itself mourns your absence.`,
        d => `Patience has never been my virtue, yet for you, I would wait through an eternity of empty days.`,
      ],
      closing: [
        d => `Return to me soon, my love. I am merely existing until you make my life worth living again.`,
        d => `Until we are reunited, I remain faithfully, desperately, and completely yours.`,
      ],
    },
  },

  apology: {
    dreamy: {
      opening: [
        d => `${d.name}, I am sorry. Those words feel insufficient for what I have done, but they are where I must start.`,
        d => `I have spent hours trying to find the right words, ${d.name}, and I keep coming back to the simplest truth: I was wrong, and I am deeply sorry.`,
        d => `If I could turn back time, ${d.name}, I would. Since I cannot, all I can offer is my sincere apology and my commitment to do better.`,
      ],
      body: [
        d => `You did not deserve what I did. You deserve patience, understanding, and love — and I failed to give you those things.`,
        d => `I have spent time reflecting on my actions, and I am ashamed of the person I was in that moment. You bring out the best in me, and I let the worst version of myself take over.`,
        d => `I am not asking for immediate forgiveness. I am asking for the chance to show you, through my actions, that I have learned and that I am willing to grow.`,
        d => `You mean everything to me, ${d.name}, and the thought of losing you over my mistake is unbearable.`,
      ],
      closing: [
        d => `I am sorry, ${d.name}. From the bottom of my heart, I am sorry. Please give me the chance to make this right.`,
        d => `I love you, and I will spend every day proving that love if you let me.`,
      ],
    },
    playful: {
      opening: [
        d => `${d.name}, I messed up. I know it. You know it. My mom probably knows it by now. I am sorry.`,
        d => `Okay so... I was a dummy. A certified, grade-A, organic, free-range dummy. I am sorry, ${d.name}.`,
        d => `Breaking news: local idiot makes mistake, feels bad about it. More at 11. (Spoiler: it is me. I am the idiot.)`,
      ],
      body: [
        d => `I have thought about what I did from every angle, and I have come to the scientific conclusion that I was, in fact, wrong.`,
        d => `You are too good for me, and I keep proving it in the worst ways. I promise to do better — or at least to try harder.`,
        d => `I am prepared to accept my punishment. You can pick the restaurant, the movie, AND the Netflix show for the next month. I know. I am serious.`,
        d => `Please do not stay mad at me for too long. My ego cannot handle it, and my heart definitely cannot.`,
      ],
      closing: [
        d => `I am sorry, I love you, and I have snacks. Please consider this peace offering.`,
        d => `Forgive me? I will be cute about it. You know I will.`,
      ],
    },
    elegant: {
      opening: [
        d => `${d.name}, I write to you today with a heart heavy with regret and a spirit determined to make amends.`,
        d => `In the quiet aftermath of my actions, I have come to understand the depth of my failing — and the even greater depth of your deservedness for better.`,
        d => `There are no words eloquent enough to undo what I have done, ${d.name}, yet I am compelled to try.`,
      ],
      body: [
        d => `I failed you, and in doing so, I failed myself. The standards you deserve are not merely high — they are the minimum of what love demands.`,
        d => `I have spent these hours in reflection, confronting the uncomfortable truth that my actions were born not of malice, but of a failure to be the person you deserve.`,
        d => `I do not ask for forgiveness lightly, nor do I expect it immediately. I ask only for the opportunity to demonstrate, through consistent action, that I am capable of the growth this moment demands.`,
        d => `You are the finest thing in my life, ${d.name}, and the pain of knowing I have caused you distress is a burden I accept fully.`,
      ],
      closing: [
        d => `I am profoundly sorry, ${d.name}. I will spend every day earning back the trust I have damaged.`,
        d => `With humility, with regret, and with unwavering love — I remain yours.`,
      ],
    },
  },

  proposal: {
    dreamy: {
      opening: [
        d => `${d.name}, from the moment I met you, I knew my life would never be the same. Today, I want to make sure it never is.`,
        d => `I have spent my whole life searching for something I could not name. Then I found you, ${d.name}, and I realized I was searching for home.`,
        d => `${d.name}, you are my best friend, my greatest love, and the person I want to wake up next to for the rest of my life.`,
      ],
      body: [
        d => `I have imagined this moment a thousand times, and every version ends the same way — with you, with me, and with a future I cannot wait to build.`,
        d => `You make me want to be the best version of myself, not because you demand it, but because loving you makes me want to deserve you.`,
        d => `I want to grow old with you. I want to fight with you, make up with you, build a life with you, and love you through every single chapter.`,
        d => `There is no one else I would rather do this with. No one else I would rather share my mornings, my nights, and every moment in between.`,
      ],
      closing: [
        d => `${d.name}, will you marry me? Will you spend the rest of your life letting me love you the way you deserve to be loved?`,
        d => `I love you more than I have ever loved anything. Please say yes.`,
      ],
    },
    playful: {
      opening: [
        d => `${d.name}, I have a very serious question. And no, it is not "what do you want for dinner." This is bigger.`,
        d => `Okay, so... I have been thinking. And I know I am not perfect. But I am pretty good at loving you. So...`,
        d => `Plot twist: I want to annoy you for the rest of my life. Officially. Legally. With paperwork.`,
      ],
      body: [
        d => `I promise to always let you have the last bite of dessert, to pretend I do not notice when you steal the covers, and to love you even when you are hangry.`,
        d => `I promise to be your emergency contact, your hype person, and the person who kills the spiders.`,
        d => `I cannot promise you a perfect life, but I can promise you a life where you never have to wonder if you are loved.`,
        d => `Also, I already picked out matching slippers. This is happening.`,
      ],
      closing: [
        d => `${d.name}, will you marry me? I have snacks and a ring. Choose wisely. (Just kidding. Please say yes.)`,
        d => `I love you. Now put this ring on your finger so I can stop being nervous.`,
      ],
    },
    elegant: {
      opening: [
        d => `${d.name}, I stand before you not merely as the person who loves you, but as the person who has been fundamentally transformed by that love.`,
        d => `In the architecture of my existence, you are not merely a room — you are the foundation upon which everything else is built.`,
        d => `${d.name}, I have loved you in silence, in chaos, in joy, and in sorrow. Today, I wish to love you in permanence.`,
      ],
      body: [
        d => `I cannot promise you a life without hardship, but I can promise you a life in which you never face it alone.`,
        d => `I vow to honor your dreams as if they were my own, to support your growth as if it were my purpose, and to love you not merely for who you are, but for who you are yet to become.`,
        d => `You are the finest chapter of my life, ${d.name}, and I wish to spend every remaining page writing our story together.`,
        d => `In you, I have found not merely a partner, but a kindred spirit — a soul that resonates with my own in frequencies too profound to articulate.`,
      ],
      closing: [
        d => `${d.name}, will you do me the extraordinary honor of becoming my wife? I promise to spend my life proving worthy of that privilege.`,
        d => `I love you beyond measure, beyond time, and beyond any words I could ever write. Please say yes.`,
      ],
    },
  },
};

// Contextual sentences that work across all events
const CONTEXT_SENTENCES = {
  met: {
    dreamy: [
      d => `It feels like I have been living in paradise ever since I met you${d.met ? ' at ' + d.met : ''}.`,
      d => `I still remember the very first time I saw you${d.met ? ' at ' + d.met : ''} — my heart knew the truth long before my mind caught up.`,
    ],
    playful: [
      d => `I still cannot believe I got lucky enough to meet you${d.met ? ' at ' + d.met : ''}. What did I do to deserve that plot armor?`,
      d => `Meeting you${d.met ? ' at ' + d.met : ''} was like finding a legendary item in a video game. Instant game-changer.`,
    ],
    elegant: [
      d => `${d.met ? 'Our meeting at ' + d.met : 'The day our paths first crossed'} was not chance — it was the universe aligning two souls that were always meant to find one another.`,
      d => `Destiny is not a concept I believed in until ${d.met ? 'I walked into ' + d.met : 'the day we met'}.`,
    ],
  },
  place: {
    dreamy: [
      d => `${d.place} will always hold the most special place in my heart, because every corner of it reminds me of you.`,
      d => `Whenever I think of ${d.place}, I do not see the location — I see your face, your smile, and the way you looked at me.`,
    ],
    playful: [
      d => `${d.place} is basically our headquarters now. I am not saying we should get matching jerseys, but I am also not NOT saying that.`,
      d => `${d.place} hits different when I am with you. Everything hits different when I am with you.`,
    ],
    elegant: [
      d => `${d.place} has transcended its geography to become a monument in the landscape of our love.`,
      d => `They say places hold memories. If that is true, then ${d.place} holds some of my most precious.`,
    ],
  },
  favs: {
    dreamy: [
      d => `I love how your entire face lights up when you talk about ${d.favs.slice(0, 3).join(', ')}.`,
      d => `I find myself falling in love with ${d.favs.slice(0, 3).join(', ')} simply because you love them.`,
    ],
    playful: [
      d => `I have developed a genuine emotional attachment to ${d.favs.slice(0, 3).join(', ')} purely because YOU like them. That is power.`,
      d => `Your taste in ${d.favs[0] || 'literally everything'} is immaculate. I am basically your hype person at this point.`,
    ],
    elegant: [
      d => `Your appreciation for ${d.favs.slice(0, 3).join(', ')} reveals the depth of your soul — a soul that finds poetry in the details others overlook.`,
      d => `Through your eyes, ${d.favs.slice(0, 2).join(' and ')} have become symbols of a beauty I was too blind to see before you.`,
    ],
  },
  memory: {
    dreamy: [
      d => `I still think about ${d.memory} — in that moment, I knew without a doubt that I was completely, hopelessly yours.`,
      d => `${d.memory} is a memory I will carry with me for the rest of my life, wrapped carefully in the most precious corner of my heart.`,
    ],
    playful: [
      d => `${d.memory} is permanently stored in my brain under "Core Memories That Make Me Smile Like an Idiot."`,
      d => `I think about ${d.memory} at least twice a week and every single time I grin like I just won the lottery.`,
    ],
    elegant: [
      d => `${d.memory} remains etched in my memory as the moment I understood, with absolute clarity, that you were the person I wished to spend my life beside.`,
      d => `I return to ${d.memory} often in my mind — it is a refuge, a reminder, and a promise all at once.`,
    ],
  },
};

// ============================================================
// LLM API CALLERS (with timeouts)
// ============================================================

async function callOpenAI(prompt, model = 'gpt-4o-mini') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a romantic letter writer. Write heartfelt, personalized love letters. Never use generic placeholders. Use the specific details provided.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 600,
    }),
  }, 4000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function callAnthropic(prompt, model = 'claude-3-haiku-20240307') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  }, 4000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.content[0].text.trim();
}

async function callGemini(prompt, model = 'gemini-3.5-flash') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 250,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  }, 20000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(`Gemini returned no text (finishReason: ${candidate?.finishReason || 'unknown'})`);
  }

  return text.trim();
}

async function callHuggingFace(prompt) {
  const res = await fetchWithTimeout(HF_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt }),
  }, 5000); // 5s max — HF cold-start is slow

  if (!res.ok) throw new Error(`HF error: ${res.status}`);
  const data = await res.json();
  const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  if (!text || text.length < 30) throw new Error('HF response too short');
  return text.trim();
}

// ============================================================
// PROMPT BUILDER
// ============================================================

function buildPrompt(data) {
  const { name, met, place, favs, memory, vibe, from, event, eventUnit, eventCount } = data;
  const eventConfig = EVENTS[event] || EVENTS.girlfriend_day;

  const toneDesc = {
    dreamy: 'warm, poetic, and deeply emotional',
    playful: 'fun, lighthearted, and teasing',
    elegant: 'sophisticated, literary, and refined',
  }[vibe] || 'romantic and heartfelt';

  let eventContext = '';
  if (event === 'anniversary' && eventCount && eventUnit) {
    eventContext = `This is our ${eventCount} ${eventUnit} anniversary.`;
  } else if (event === 'birthday' && eventCount) {
    eventContext = `She is turning ${eventCount} years old.`;
  }

  const detailLines = [];
  if (met) detailLines.push(`- How we met: ${met}`);
  if (favs?.length) detailLines.push(`- Her favorite things: ${favs.join(', ')}`);
  if (memory) detailLines.push(`- A special memory: ${memory}`);
  if (place) detailLines.push(`- Our special place: ${place}`);
  detailLines.push(`- Sign it from: ${from || 'Your Love'}`);

  const detailsBlock = detailLines.length
    ? `Details:\n${detailLines.join('\n')}\n\n`
    : '';

  return `Write a ${toneDesc} ${eventConfig.label.toLowerCase()} letter to ${name}.

${eventContext}
${detailsBlock}Write 2-3 short heartfelt paragraphs. ${detailLines.length > 1 ? 'Make it deeply personal using only the specific details given above — do not invent details that were not provided.' : 'Keep it warm and personal, but general, since no specific shared details were provided — do not invent a backstory, a meeting story, or specific memories that were not given to you.'} Do not use generic placeholders. End warmly and emotionally. Use simple, everyday words — nothing flowery or hard to understand. Keep paragraphs short so it's easy to read, not overwhelming.`;
}

// ============================================================
// SMART NLG FALLBACK
// ============================================================

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function assembleSmartLetter(data) {
  const eventVocab = VOCABULARY[data.event] || VOCABULARY.girlfriend_day;
  const vibeVocab = eventVocab[data.vibe] || eventVocab.dreamy || Object.values(eventVocab)[0];
  const paragraphs = [];

  // Paragraph 1: Opening + Body
  const opening = pickRandom(vibeVocab.opening)(data);
  const body1 = pickRandom(vibeVocab.body)(data);
  paragraphs.push([opening, body1].filter(Boolean).join(' '));

  // Paragraph 2: Contextual sentences
  const contextSents = [];
  if (data.met && CONTEXT_SENTENCES.met[data.vibe]) {
    contextSents.push(pickRandom(CONTEXT_SENTENCES.met[data.vibe])(data));
  }
  if (data.favs?.length && CONTEXT_SENTENCES.favs[data.vibe]) {
    contextSents.push(pickRandom(CONTEXT_SENTENCES.favs[data.vibe])(data));
  }
  if (data.place && CONTEXT_SENTENCES.place[data.vibe]) {
    contextSents.push(pickRandom(CONTEXT_SENTENCES.place[data.vibe])(data));
  }
  if (contextSents.length > 0) {
    paragraphs.push(contextSents.filter(Boolean).join(' '));
  }

  // Paragraph 3: Body + Closing
  const body2 = pickRandom(vibeVocab.body)(data);
  const closing = pickRandom(vibeVocab.closing)(data);
  paragraphs.push([body2, closing].filter(Boolean).join(' '));

  // P.S. Memory
  if (data.memory && CONTEXT_SENTENCES.memory[data.vibe]) {
    paragraphs.push(`P.S. ${pickRandom(CONTEXT_SENTENCES.memory[data.vibe])(data)}`);
  }

  // Signature
  const eventConfig = EVENTS[data.event] || EVENTS.girlfriend_day;
  const signoff = data.from 
    ? `${eventConfig.defaultSignoff},\n${data.from}`
    : `${eventConfig.defaultSignoff},\nYour Love`;
  paragraphs.push(signoff);

  return paragraphs.join('\n\n');
}

// ============================================================
// MAIN GENERATOR
// ============================================================

async function generateLetter(data) {
  const prompt = buildPrompt(data);

  const backends = [
    { name: 'OpenAI', fn: () => callOpenAI(prompt) },
    { name: 'Anthropic', fn: () => callAnthropic(prompt) },
    { name: 'Gemini', fn: () => callGemini(prompt) },
    { name: 'HuggingFace', fn: () => callHuggingFace(prompt) },
  ];

  for (const backend of backends) {
    try {
      console.log(`[ML] Trying ${backend.name}...`);
      const text = await backend.fn();
      if (text && text.length > 50) {
        console.log(`[ML] Success with ${backend.name} (${text.length} chars)`);
        return { text, source: backend.name.toLowerCase() };
      }
    } catch (err) {
      console.log(`[ML] ${backend.name} failed: ${err.message}`);
    }
  }

  console.log('[ML] All LLMs failed. Using smart NLG fallback.');
  return { text: assembleSmartLetter(data), source: 'nlg' };
}

module.exports = { generateLetter, assembleSmartLetter, EVENTS };