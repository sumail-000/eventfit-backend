const express = require('express');
const cors = require('cors');

const outfitRoutes = require('./routes/outfits');
const weatherRoutes = require('./routes/weather');
const chatRoutes = require('./routes/chat');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EventFit API',
    database: req.app.locals.dbConnected ? 'mongodb' : 'in-memory',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/outfits', outfitRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/chat', chatRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
