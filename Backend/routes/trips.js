const express = require('express');

const db = require('../config/db');
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { createErrorBody } = require('../utils/errors');
const { updateCheckpointStatus } = require('../utils/checkpoints');

const router = express.Router();
const tripStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

router.get('/', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  let query = 'SELECT * FROM trips';
  const params = [];
  const filters = [];

  if (req.user.role === 'DRIVER') {
    filters.push('driver_id = ?');
    params.push(req.user.id);
  }

  if (req.query.status) {
    filters.push('status = ?');
    params.push(req.query.status);
  }

  if (req.query.vehicle_id) {
    filters.push('vehicle_id = ?');
    params.push(req.query.vehicle_id);
  }

  if (filters.length) {
    query += ` WHERE ${filters.join(' AND ')}`;
  }

  const [trips] = await db.query(`${query} ORDER BY id DESC`, params);
  return res.json(trips);
});

router.get('/:id', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  const [trips] = await db.query('SELECT * FROM trips WHERE id = ? LIMIT 1', [req.params.id]);

  if (!trips.length) {
    return res.status(404).json(createErrorBody('NOT_FOUND', 'Trip not found'));
  }

  if (req.user.role === 'DRIVER' && trips[0].driver_id !== req.user.id) {
    return res.status(403).json(createErrorBody('FORBIDDEN', 'Access denied'));
  }

  return res.json(trips[0]);
});

router.post('/', protect(['DRIVER']), auditLog('CREATE', 'TRIP'), async (req, res) => {
  const {
    id,
    vehicle_id,
    driver_id,
    origin,
    destination,
    distance_km,
    cargo_type,
    cargo_weight_kg,
    parent_trip_id,
  } = req.body ?? {};

  if (!id || !vehicle_id || !driver_id) {
    return res
      .status(400)
      .json(createErrorBody('VALIDATION_ERROR', 'id, vehicle_id, and driver_id are required'));
  }

  const [busy] = await db.query(
    "SELECT id FROM trips WHERE vehicle_id = ? AND status = 'IN_PROGRESS'",
    [vehicle_id]
  );

  if (busy.length) {
    return res.status(400).json(createErrorBody('BUSY', 'Vehicle busy'));
  }

  await db.query(
    `INSERT INTO trips (
      id, vehicle_id, driver_id, origin, destination, distance_km, status, cargo_type, cargo_weight_kg, parent_trip_id, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?, NOW())`,
    [
      id,
      vehicle_id,
      driver_id,
      origin || null,
      destination || null,
      distance_km || null,
      cargo_type || 'GENERAL',
      cargo_weight_kg || null,
      parent_trip_id || null,
    ]
  );
  res.json({ message: 'Trip started' });
});

router.patch('/:id/status', protect(['DRIVER']), async (req, res) => {
  const { status } = req.body ?? {};

  if (!tripStatuses.includes(status)) {
    return res.status(400).json(createErrorBody('VALIDATION_ERROR', 'Invalid trip status'));
  }

  const [trips] = await db.query('SELECT id FROM trips WHERE id = ? LIMIT 1', [req.params.id]);

  if (!trips.length) {
    return res.status(404).json(createErrorBody('NOT_FOUND', 'Trip not found'));
  }

  await db.query(
    `UPDATE trips
     SET status = ?, ended_at = CASE WHEN ? = 'COMPLETED' THEN NOW() ELSE ended_at END
     WHERE id = ?`,
    [status, status, req.params.id]
  );

  return res.json({ message: 'Trip status updated' });
});

router.get('/:id/checkpoints', protect(['DRIVER', 'ADMIN']), async (req, res) => {
  const [checkpoints] = await db.query(
    'SELECT * FROM checkpoints WHERE trip_id = ? ORDER BY sequence ASC',
    [req.params.id]
  );
  return res.json(checkpoints);
});

router.post('/:id/checkpoints', protect(['DRIVER']), async (req, res) => {
  const {
    id,
    sequence,
    status = 'PENDING',
    location_name,
    latitude,
    longitude,
    purpose,
    notes,
  } = req.body ?? {};

  if (!id || !sequence || !location_name || !purpose) {
    return res.status(400).json(
      createErrorBody(
        'VALIDATION_ERROR',
        'id, sequence, location_name, and purpose are required'
      )
    );
  }

  await db.query(
    `INSERT INTO checkpoints (
      id, trip_id, sequence, status, location_name, latitude, longitude, purpose, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.params.id,
      sequence,
      status,
      location_name,
      latitude || null,
      longitude || null,
      purpose,
      notes || null,
    ]
  );

  return res.status(201).json({ message: 'Checkpoint created' });
});

router.patch('/checkpoints/:id/status', protect(['DRIVER']), updateCheckpointStatus);

module.exports = router;
