const router = require('express').Router();
const axios = require('axios');
const Outfit = require('../models/Outfit');
const { ALL_OUTFITS } = require('../data/outfitData');

function useDB(req) { return req.app.locals.dbConnected; }

const EVENT_KEYWORDS = {
  wedding: ['wedding', 'shadi', 'barat', 'walima', 'nikah', 'mehndi', 'mehendi'],
  interview: ['interview', 'job', 'corporate'],
  party: ['party', 'dholki', 'birthday', 'mehendi night'],
  eid: ['eid', 'festival'],
  formal: ['office', 'work', 'formal', 'meeting'],
  casual: ['casual', 'outing', 'shopping', 'lunch', 'hangout'],
  graduation: ['graduation', 'convocation', 'degree'],
  dinner: ['dinner', 'date', 'dining'],
};

const GENDER_KEYWORDS = {
  women: ['women', 'woman', 'female', 'girl', 'ladies', 'bride', 'bridal'],
  men: ['men', 'man', 'male', 'guy', 'groom', 'boys'],
};

const CITIES = [
  'lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan',
  'peshawar', 'quetta', 'sialkot', 'gujrat', 'gujranwala', 'hyderabad',
  'abbottabad', 'sargodha', 'bahawalpur',
];

function parseMessage(text) {
  const lower = text.toLowerCase();
  let event = '', city = '', gender = '';

  for (const [ev, kws] of Object.entries(EVENT_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) { event = ev; break; }
  }
  for (const c of CITIES) {
    if (lower.includes(c)) { city = c; break; }
  }
  for (const [g, kws] of Object.entries(GENDER_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) { gender = g; break; }
  }
  return { event, city, gender };
}

async function getOutfits(req, event, gender, limit = 5) {
  if (useDB(req)) {
    return Outfit.find({ event, gender }).sort({ rating: -1 }).limit(limit).lean();
  }
  return ALL_OUTFITS
    .filter((o) => o.event === event && o.gender === gender)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const parsed = parseMessage(message);

    const newContext = {
      event: parsed.event || context.event || '',
      gender: parsed.gender || context.gender || '',
      city: parsed.city || context.city || '',
    };

    if (newContext.event && newContext.gender && newContext.city) {
      let weather = null;
      try {
        const weatherRes = await axios.get(
          `http://localhost:${process.env.PORT || 5000}/api/weather?city=${encodeURIComponent(newContext.city)}`
        );
        weather = weatherRes.data;
      } catch { /* proceed without weather */ }

      const outfits = await getOutfits(req, newContext.event, newContext.gender);

      const weatherText = weather
        ? `It's currently **${weather.temperature.current}°C** in **${weather.city}** — ${weather.condition.description}.`
        : `Let me check the weather in **${newContext.city}** for you.`;

      const outfitList = outfits.length > 0
        ? outfits.slice(0, 3).map((o) => `• **${o.name}** — ${o.fabric}`).join('\n')
        : 'I have some great options for you!';

      const genderLabel = newContext.gender === 'women' ? 'Women' : 'Men';

      return res.json({
        reply: `${weatherText}\n\nBased on your **${newContext.event}** event, here are my top picks for **${genderLabel}**:\n\n${outfitList}\n\nTap any outfit card to see full details, or ask me for more options!`,
        context: newContext,
        outfits,
        weather,
        quickReplies: ['Show more options', 'Tips for this weather', 'What accessories?', 'Different style'],
      });
    }

    if (!newContext.gender) {
      return res.json({
        reply: "I'd love to help! Are you looking for **women's** or **men's** outfits?",
        context: newContext, outfits: [], weather: null,
        quickReplies: ["Women's outfits", "Men's outfits"],
      });
    }

    if (!newContext.event) {
      return res.json({
        reply: "Great! What's the **occasion**? A wedding, interview, Eid, party, or something else?",
        context: newContext, outfits: [], weather: null,
        quickReplies: ['Wedding / Shadi', 'Interview', 'Eid Festival', 'Party / Dholki', 'Office / Formal', 'Casual Outing', 'Graduation', 'Dinner / Date'],
      });
    }

    if (!newContext.city) {
      return res.json({
        reply: "Almost there! Which **city** are you in? I'll check the live weather to match your outfit.",
        context: newContext, outfits: [], weather: null,
        quickReplies: ['Lahore', 'Karachi', 'Islamabad', 'Multan', 'Peshawar', 'Quetta', 'Faisalabad'],
      });
    }

    return res.json({
      reply: "Tell me your **event**, **gender**, and **city** and I'll recommend the perfect outfit!",
      context: newContext, outfits: [], weather: null,
      quickReplies: ['Wedding in Lahore', 'Interview in Islamabad', 'Eid outfit ideas'],
    });
  } catch (err) {
    console.error('POST /api/chat error:', err);
    res.status(500).json({ error: 'Chat service error' });
  }
});

module.exports = router;
