const express = require('express');

const db = require('../config/db');
const { protect } = require('../middleware/auth');
const { hasTable } = require('../utils/schema');

const router = express.Router();

router.get('/', protect(['ADMIN', 'DRIVER']), async (req, res) => {
  if (!(await hasTable('audit_logs'))) {
    return res.json([]);
  }

  let query = 'SELECT * FROM audit_logs';
  const params = [];

  if (req.user.role === 'DRIVER') {
    query += ' WHERE user_id = ?';
    params.push(req.user.id);
  }

  const [logs] = await db.query(`${query} ORDER BY created_at DESC`, params);
  res.json(logs);
});

module.exports = router;
