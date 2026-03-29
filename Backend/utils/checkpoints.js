const db = require('../config/db');
const { createErrorBody } = require('./errors');

const allowedStatuses = ['PENDING', 'ARRIVED', 'DEPARTED', 'SKIPPED'];

const updateCheckpointStatus = async (req, res) => {
  const { status } = req.body ?? {};

  if (!allowedStatuses.includes(status)) {
    return res
      .status(400)
      .json(createErrorBody('VALIDATION_ERROR', 'Invalid checkpoint status'));
  }

  const [current] = await db.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);

  if (!current.length) {
    return res.status(404).json(createErrorBody('NOT_FOUND', 'Checkpoint not found'));
  }

  if (current[0].sequence > 1) {
    const [prev] = await db.query(
      'SELECT status FROM checkpoints WHERE trip_id = ? AND sequence = ?',
      [current[0].trip_id, current[0].sequence - 1]
    );

    if (prev[0]?.status !== 'DEPARTED') {
      return res.status(400).json(createErrorBody('SEQ_ERR', 'Previous stop not finished'));
    }
  }

  await db.query(
    'UPDATE checkpoints SET status = ?, arrived_at = CASE WHEN ? = ? THEN NOW() ELSE arrived_at END WHERE id = ?',
    [status, status, 'ARRIVED', req.params.id]
  );
  return res.json({ message: 'Checkpoint updated' });
};

module.exports = {
  updateCheckpointStatus,
};
