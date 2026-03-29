const db = require('../config/db');

const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function patchedSend(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || 'SYSTEM';
        db.query(
          'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?)',
          [userId, action, resourceType, req.params.id || req.body.id || null]
        ).catch((error) => {
          if (error.code !== 'ER_NO_SUCH_TABLE') {
            console.error('Audit log failed', error);
          }
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

module.exports = {
  auditLog,
};
