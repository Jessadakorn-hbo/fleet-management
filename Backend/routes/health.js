const express = require('express');

const db = require('../config/db');
const { createErrorBody } = require('../utils/errors');

const router = express.Router();

router.get('/db', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json(createErrorBody('DB_ERR', error.message));
  }
});

module.exports = router;
