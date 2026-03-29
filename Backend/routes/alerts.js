const express = require('express');

const db = require('../config/db');
const { protect } = require('../middleware/auth');
const { getFirstExistingTable, hasColumn } = require('../utils/schema');

const router = express.Router();

const alertRules = [
  {
    name: 'Vehicle Due for Service',
    severity: 'CRITICAL',
    check: async () => {
      const isSupported =
        (await hasColumn('vehicles', 'license_plate')) &&
        (await hasColumn('vehicles', 'mileage_km')) &&
        (await hasColumn('vehicles', 'next_service_km'));

      if (!isSupported) {
        return [];
      }

      const [rows] = await db.query(
        'SELECT id, license_plate FROM vehicles WHERE mileage_km >= next_service_km'
      );
      return rows.map((row) => ({
        resource_id: row.id,
        resource_type: 'VEHICLE',
        message: `Vehicle ${row.license_plate} is due for service`,
      }));
    },
  },
  {
    name: 'License Expiring Soon',
    severity: 'WARNING',
    check: async () => {
      const driverTable = (await hasColumn('users', 'license_expiry')) ? 'users' : null;

      if (!driverTable) {
        return [];
      }

      const [rows] = await db.query(
        "SELECT id, name FROM users WHERE role = 'DRIVER' AND license_expiry <= DATE_ADD(NOW(), INTERVAL 30 DAY)"
      );
      return rows.map((row) => ({
        resource_id: row.id,
        resource_type: 'DRIVER',
        message: `Driver ${row.name} license expires within 30 days`,
      }));
    },
  },
  {
    name: 'Overdue Maintenance',
    severity: 'CRITICAL',
    check: async () => {
      const maintenanceTable = await getFirstExistingTable(['maintenances', 'maintenance']);

      if (!maintenanceTable) {
        return [];
      }

      const [rows] = await db.query(
        `SELECT id, vehicle_id
         FROM ${maintenanceTable}
         WHERE status IN ('SCHEDULED', 'OVERDUE')
           AND scheduled_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)`
      );
      return rows.map((row) => ({
        resource_id: row.vehicle_id,
        resource_type: 'MAINTENANCE',
        message: `Maintenance ${row.id} is overdue by 3+ days`,
      }));
    },
  },
];

router.get('/', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  let allAlerts = [];

  for (const rule of alertRules) {
    const triggers = await rule.check();
    const formatted = triggers.map((trigger) => ({
      ...trigger,
      severity: rule.severity,
    }));
    allAlerts = [...allAlerts, ...formatted];
  }

  const { severity, resource_type } = req.query;
  if (severity) {
    allAlerts = allAlerts.filter((alert) => alert.severity === severity);
  }
  if (resource_type) {
    allAlerts = allAlerts.filter((alert) => alert.resource_type === resource_type);
  }

  res.json(allAlerts);
});

module.exports = router;
