const express = require('express');

const { protect } = require('../middleware/auth');
const { updateCheckpointStatus } = require('../utils/checkpoints');

const router = express.Router();

router.patch('/:id/status', protect(['DRIVER']), updateCheckpointStatus);

module.exports = router;
