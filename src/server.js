require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.locals.dbConnected = true;
  } catch (err) {
    console.warn('⚠️  MongoDB unavailable:', err.message);
    console.warn('📦  Running in DEMO MODE with in-memory data');
    app.locals.dbConnected = false;
  }

  app.listen(PORT, () => {
    console.log(`🚀  EventFit API running → http://localhost:${PORT}`);
    console.log(`📡  Health check → http://localhost:${PORT}/api/health`);
    console.log(`💾  Database: ${app.locals.dbConnected ? 'MongoDB' : 'In-Memory (demo)'}`);
  });
})();
