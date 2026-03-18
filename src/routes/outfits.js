const router = require('express').Router();
const Outfit = require('../models/Outfit');
const { ALL_OUTFITS } = require('../data/outfitData');

function useDB(req) { return req.app.locals.dbConnected; }

function filterInMemory(filter, sort, limit) {
  let results = [...ALL_OUTFITS];
  for (const [key, val] of Object.entries(filter)) {
    if (key === 'trending') results = results.filter((o) => o.trending === val);
    else results = results.filter((o) => o[key] === val);
  }
  if (sort?.rating) results.sort((a, b) => b.rating - a.rating);
  return limit ? results.slice(0, limit) : results;
}

// GET /api/outfits — list with filters
router.get('/', async (req, res) => {
  try {
    const { gender, event, style, formality, trending, limit } = req.query;
    const filter = {};

    if (gender) filter.gender = gender;
    if (event) filter.event = event;
    if (style && style !== 'all') filter.style = style;
    if (formality && formality !== 'all') filter.formality = formality;
    if (trending === 'true') filter.trending = true;

    let outfits;
    if (useDB(req)) {
      outfits = await Outfit.find(filter).sort({ rating: -1, trending: -1 }).limit(parseInt(limit) || 50).lean();
    } else {
      outfits = filterInMemory(filter, { rating: -1 }, parseInt(limit) || 50);
    }

    res.json({ count: outfits.length, outfits });
  } catch (err) {
    console.error('GET /api/outfits error:', err);
    res.status(500).json({ error: 'Failed to fetch outfits' });
  }
});

// GET /api/outfits/recommend — smart recommendation
router.get('/recommend', async (req, res) => {
  try {
    const { gender, event, city, weatherMood, styles } = req.query;

    if (!gender || !event) {
      return res.status(400).json({ error: 'gender and event are required' });
    }

    const filter = { gender, event };
    let outfits;

    if (useDB(req)) {
      outfits = await Outfit.find(filter).sort({ rating: -1 }).lean();
    } else {
      outfits = filterInMemory(filter, { rating: -1 });
    }

    if (weatherMood) {
      outfits = outfits.sort((a, b) => {
        const aMatch = a.weatherSuitability?.includes(weatherMood) ? 1 : 0;
        const bMatch = b.weatherSuitability?.includes(weatherMood) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    if (styles) {
      const styleArr = styles.split(',').filter(Boolean);
      if (styleArr.length > 0) {
        outfits = outfits.sort((a, b) => {
          const aMatch = styleArr.includes(a.style) ? 1 : 0;
          const bMatch = styleArr.includes(b.style) ? 1 : 0;
          return bMatch - aMatch;
        });
      }
    }

    if (outfits.length === 0) {
      if (useDB(req)) {
        outfits = await Outfit.find({ gender }).sort({ rating: -1 }).limit(6).lean();
      } else {
        outfits = filterInMemory({ gender }, { rating: -1 }, 6);
      }
    }

    res.json({ count: outfits.length, city: city || '', outfits });
  } catch (err) {
    console.error('GET /api/outfits/recommend error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// GET /api/outfits/trending
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    let outfits;

    if (useDB(req)) {
      outfits = await Outfit.find({ trending: true }).sort({ rating: -1 }).limit(limit).lean();
    } else {
      outfits = filterInMemory({ trending: true }, { rating: -1 }, limit);
    }

    res.json({ count: outfits.length, outfits });
  } catch (err) {
    console.error('GET /api/outfits/trending error:', err);
    res.status(500).json({ error: 'Failed to fetch trending outfits' });
  }
});

// GET /api/outfits/:id
router.get('/:id', async (req, res) => {
  try {
    let outfit;
    if (useDB(req)) {
      outfit = await Outfit.findOne({ outfitId: req.params.id }).lean();
    } else {
      outfit = ALL_OUTFITS.find((o) => o.outfitId === req.params.id) || null;
    }
    if (!outfit) return res.status(404).json({ error: 'Outfit not found' });
    res.json(outfit);
  } catch (err) {
    console.error('GET /api/outfits/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch outfit' });
  }
});

module.exports = router;
