const express = require('express');

const db = require('../config/db');
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { createErrorBody } = require('../utils/errors');

const router = express.Router();

const allowedTransitions = {
  IDLE: ['ACTIVE'],
  ACTIVE: ['MAINTENANCE', 'IDLE'],
  MAINTENANCE: ['IDLE'],
  RETIRED: [],
};

router.get('/', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  const [vehicles] = await db.query('SELECT * FROM vehicles ORDER BY license_plate ASC');
  res.json(vehicles);
});

router.get('/:id', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  const [vehicles] = await db.query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [req.params.id]);

  if (!vehicles.length) {
    return res.status(404).json(createErrorBody('NOT_FOUND', 'Vehicle not found'));
  }

  return res.json(vehicles[0]);
});

router.post('/', protect(['ADMIN']), auditLog('CREATE', 'VEHICLE'), async (req, res) => {
  const { id, license_plate, type, driver_id = null, context } = req.body;

  try {
    await db.query(
      `INSERT INTO vehicles (
        id, license_plate, type, status, driver_id, brand, model, year, fuel_type, mileage_km, last_service_km, next_service_km
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        license_plate,
        type,
        context?.status || 'IDLE',
        driver_id,
        context?.brand || null,
        context?.model || null,
        context?.year || null,
        context?.fuel_type || null,
        context?.mileage_km || 0,
        context?.last_service_km || 0,
        context?.next_service_km || 10000,
      ]
    );
    res.status(201).json({ message: 'Vehicle added' });
  } catch (error) {
    res.status(500).json(createErrorBody('DB_ERR', error.message));
  }
});

router.patch('/:id/status', protect(['ADMIN']), async (req, res) => {
  const { status } = req.body ?? {};
  const [vehicles] = await db.query('SELECT id, status FROM vehicles WHERE id = ? LIMIT 1', [req.params.id]);

  if (!vehicles.length) {
    return res.status(404).json(createErrorBody('NOT_FOUND', 'Vehicle not found'));
  }

  const currentStatus = vehicles[0].status;
  const nextStatuses = allowedTransitions[currentStatus] || [];

  if (!nextStatuses.includes(status)) {
    return res.status(400).json(
      createErrorBody('INVALID_TRANSITION', `Vehicle cannot move from ${currentStatus} to ${status}`, {
        allowed: nextStatuses,
      })
    );
  }

  await db.query('UPDATE vehicles SET status = ? WHERE id = ?', [status, req.params.id]);
  return res.json({ message: 'Vehicle status updated' });
});

module.exports = router;
