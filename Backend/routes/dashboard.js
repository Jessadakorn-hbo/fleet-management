const express = require('express');

const db = require('../config/db');
const { protect } = require('../middleware/auth');
const { getFirstExistingTable } = require('../utils/schema');

const router = express.Router();

router.get('/metrics', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  const maintenanceTable = await getFirstExistingTable(['maintenances', 'maintenance']);
  const [vehicles] = await db.query('SELECT COUNT(*) as total FROM vehicles');
  const [trips] = await db.query("SELECT COUNT(*) as total FROM trips WHERE status = 'IN_PROGRESS'");
  const [overdue] = maintenanceTable
    ? await db.query(`SELECT COUNT(*) as total FROM ${maintenanceTable} WHERE status = 'OVERDUE'`)
    : [[{ total: 0 }]];

  res.json({
    totalVehicles: vehicles[0].total,
    activeTrips: trips[0].total,
    maintenanceOverdue: overdue[0].total,
  });
});

module.exports = router;
