const router = require('express').Router();
const axios = require('axios');

const TEMP_CATEGORIES = {
  freezing: { max: 5, label: 'Freezing', tip: 'Heavy layers essential' },
  cold: { max: 15, label: 'Cold', tip: 'Layer up warmly' },
  cool: { max: 22, label: 'Cool', tip: 'Light jacket recommended' },
  mild: { max: 28, label: 'Mild', tip: 'Comfortable outdoor weather' },
  warm: { max: 35, label: 'Warm', tip: 'Breathable fabrics preferred' },
  hot: { max: 42, label: 'Hot', tip: 'Lightweight & airy outfits only' },
  scorching: { max: 99, label: 'Scorching', tip: 'Ultra-light fabrics, stay hydrated' },
};

function getTempCategory(temp) {
  if (temp <= 5) return { ...TEMP_CATEGORIES.freezing, value: temp };
  if (temp <= 15) return { ...TEMP_CATEGORIES.cold, value: temp };
  if (temp <= 22) return { ...TEMP_CATEGORIES.cool, value: temp };
  if (temp <= 28) return { ...TEMP_CATEGORIES.mild, value: temp };
  if (temp <= 35) return { ...TEMP_CATEGORIES.warm, value: temp };
  if (temp <= 42) return { ...TEMP_CATEGORIES.hot, value: temp };
  return { ...TEMP_CATEGORIES.scorching, value: temp };
}

function getOutfitMood(temp) {
  if (temp >= 36) return 'hot';
  if (temp >= 28) return 'warm';
  if (temp >= 20) return 'mild';
  if (temp >= 12) return 'cool';
  return 'cold';
}

function getClothingAlerts(condition, temp, windSpeed) {
  const alerts = [];
  if (temp >= 38) alerts.push('Extreme heat — choose ultra-light, breathable fabrics');
  if (temp <= 10) alerts.push('Cold weather — layer up with warm fabrics');
  if (temp <= 5) alerts.push('Freezing — heavy coats and warm layers essential');
  if (['Rain', 'Thunderstorm', 'Drizzle'].some((c) => condition.includes(c))) {
    alerts.push('Rain expected — avoid heavy embroidery & delicate fabrics');
  }
  if (condition.includes('Fog') || condition.includes('Mist')) {
    alerts.push('Fog — wear bright or light colours for visibility');
  }
  if (windSpeed >= 22) alerts.push('Strong winds — secure dupatta & loose garments');
  return alerts.length > 0 ? alerts : ['Comfortable weather — dress as per your event style!'];
}

// GET /api/weather?city=Lahore
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'city parameter is required' });

    const apiKey = process.env.OPENWEATHER_API_KEY;

    // If no real API key, return mock data
    if (!apiKey || apiKey === 'YOUR_OPENWEATHERMAP_API_KEY_HERE') {
      return res.json(getMockWeather(city));
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},PK&units=metric&appid=${apiKey}`;
    const { data } = await axios.get(url);

    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const high = Math.round(data.main.temp_max);
    const low = Math.round(data.main.temp_min);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * 3.6); // m/s to km/h
    const condition = data.weather[0]?.main || 'Clear';
    const conditionDesc = data.weather[0]?.description || '';
    const icon = data.weather[0]?.icon || '01d';

    const tempCategory = getTempCategory(temp);
    const outfitMood = getOutfitMood(temp);
    const clothingAlert = getClothingAlerts(condition, temp, windSpeed);

    res.json({
      city: data.name,
      country: data.sys?.country || 'PK',
      timestamp: new Date().toISOString(),
      temperature: { current: temp, feelsLike, high, low, unit: '°C' },
      condition: { label: condition, description: conditionDesc, icon },
      humidity,
      windSpeed,
      windUnit: 'km/h',
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 10,
      visibilityUnit: 'km',
      tempCategory,
      outfitMood,
      clothingAlert,
      isRainy: ['Rain', 'Thunderstorm', 'Drizzle'].some((c) => condition.includes(c)),
      isHot: temp >= 34,
      isCold: temp <= 14,
      isWindy: windSpeed >= 20,
    });
  } catch (err) {
    console.error('Weather API error:', err.response?.data || err.message);

    // Fallback to mock if API fails
    const { city } = req.query;
    if (city) return res.json(getMockWeather(city));

    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

function getMockWeather(cityName) {
  const month = new Date().getMonth() + 1;
  const isWinter = month <= 2 || month === 12;
  const isSummer = month >= 5 && month <= 6;
  const isMonsoon = month >= 7 && month <= 9;

  const cityTemps = {
    lahore: { winter: 13, summer: 38, monsoon: 33, spring: 24, autumn: 22 },
    karachi: { winter: 21, summer: 34, monsoon: 31, spring: 29, autumn: 27 },
    islamabad: { winter: 8, summer: 34, monsoon: 28, spring: 20, autumn: 18 },
    rawalpindi: { winter: 9, summer: 35, monsoon: 29, spring: 21, autumn: 19 },
    faisalabad: { winter: 11, summer: 39, monsoon: 34, spring: 25, autumn: 23 },
    multan: { winter: 14, summer: 41, monsoon: 35, spring: 27, autumn: 24 },
    peshawar: { winter: 7, summer: 36, monsoon: 30, spring: 21, autumn: 20 },
    quetta: { winter: 2, summer: 26, monsoon: 24, spring: 15, autumn: 13 },
    gujranwala: { winter: 10, summer: 38, monsoon: 33, spring: 24, autumn: 22 },
    gujrat: { winter: 10, summer: 37, monsoon: 32, spring: 23, autumn: 21 },
    sialkot: { winter: 9, summer: 37, monsoon: 32, spring: 22, autumn: 20 },
    hyderabad: { winter: 19, summer: 38, monsoon: 33, spring: 30, autumn: 26 },
    abbottabad: { winter: 4, summer: 26, monsoon: 22, spring: 16, autumn: 14 },
  };

  const key = cityName.toLowerCase().trim();
  const data = cityTemps[key] || { winter: 15, summer: 32, monsoon: 28, spring: 23, autumn: 20 };
  const season = isWinter ? 'winter' : isSummer ? 'summer' : isMonsoon ? 'monsoon' : month <= 4 ? 'spring' : 'autumn';
  const baseTemp = data[season];
  const jitter = Math.round((Math.random() - 0.5) * 4);
  const temp = baseTemp + jitter;

  let condition, condDesc;
  if (isMonsoon) { condition = 'Rain'; condDesc = 'monsoon showers'; }
  else if (isWinter && temp <= 10) { condition = 'Fog'; condDesc = 'dense fog'; }
  else if (isWinter) { condition = 'Clouds'; condDesc = 'overcast clouds'; }
  else if (isSummer && temp >= 36) { condition = 'Clear'; condDesc = 'scorching heat'; }
  else if (temp >= 28) { condition = 'Clear'; condDesc = 'sunny and warm'; }
  else { condition = 'Clouds'; condDesc = 'partly cloudy'; }

  const humidity = Math.round(40 + Math.random() * 40);
  const windSpeed = Math.round(8 + Math.random() * 18);
  const tempCategory = getTempCategory(temp);
  const outfitMood = getOutfitMood(temp);

  return {
    city: cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase(),
    country: 'PK',
    timestamp: new Date().toISOString(),
    temperature: { current: temp, feelsLike: temp - 2, high: temp + 4, low: temp - 5, unit: '°C' },
    condition: { label: condition, description: condDesc, icon: '01d' },
    humidity,
    windSpeed,
    windUnit: 'km/h',
    visibility: condition === 'Fog' ? 2 : 10,
    visibilityUnit: 'km',
    tempCategory,
    outfitMood,
    clothingAlert: getClothingAlerts(condition, temp, windSpeed),
    isRainy: condition === 'Rain',
    isHot: temp >= 34,
    isCold: temp <= 14,
    isWindy: windSpeed >= 20,
    isMock: true,
  };
}

module.exports = router;
