const jwt = require('jsonwebtoken');

const { sendAuthError } = require('../utils/errors');

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'my_super_secret_access_key';

const protect = (roles = []) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return sendAuthError(res, 401, 'UNAUTHORIZED', 'Missing access token');
    }

    try {
      const decoded = jwt.verify(token, ACCESS_SECRET);
      const allowed =
        !roles.length || decoded.role === 'ADMIN' || roles.includes(decoded.role);

      if (!allowed) {
        return sendAuthError(res, 403, 'FORBIDDEN', 'Access denied');
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendAuthError(
          res,
          401,
          'TOKEN_EXPIRED',
          'Access token expired. Please refresh.',
          { shouldRefresh: true }
        );
      }

      return sendAuthError(res, 401, 'UNAUTHORIZED', 'Invalid access token');
    }
  };
};

module.exports = {
  protect,
};
