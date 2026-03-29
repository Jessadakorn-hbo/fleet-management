const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const tripRoutes = require('./routes/trips');
const checkpointRoutes = require('./routes/checkpoints');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const healthRoutes = require('./routes/health');

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.get('/', (req, res) => {
  res.send('Fleet Management API is Running! Go to localhost:3000 for the Frontend.');
});

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/trips', tripRoutes);
app.use('/checkpoints', checkpointRoutes);
app.use('/alerts', alertRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/audit-logs', auditRoutes);
app.use('/health', healthRoutes);

module.exports = app;
