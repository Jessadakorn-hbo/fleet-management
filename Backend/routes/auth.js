const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../config/db');
const { createErrorBody, sendAuthError } = require('../utils/errors');
const { loadTableColumns } = require('../utils/schema');

const router = express.Router();
const ACCESS_SECRET = process.env.ACCESS_SECRET || 'my_super_secret_access_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'my_super_secret_refresh_key';

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex === -1) {
        return acc;
      }

      const key = part.slice(0, separatorIndex);
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      acc[key] = value;
      return acc;
    }, {});

const setRefreshCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/auth',
  });
};

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });

const signRefreshToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, type: 'refresh' }, REFRESH_SECRET, {
    expiresIn: '7d',
  });

const getAuthSchema = async () => {
  const columns = await loadTableColumns('users');
  const identifierColumns = ['username', 'email', 'id', 'name'].filter((column) =>
    columns.has(column)
  );
  const passwordColumn = ['password', 'password_hash'].find((column) => columns.has(column));

  return {
    columns,
    identifierColumn: identifierColumns[0] || null,
    identifierColumns,
    passwordColumn,
  };
};

const comparePassword = async (inputPassword, storedPassword) => {
  if (typeof storedPassword !== 'string' || !storedPassword.length) {
    return false;
  }

  if (storedPassword.startsWith('$2')) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  return inputPassword === storedPassword;
};

const formatUser = (user, identifierColumn) => ({
  id: user.id,
  username: user.username || user.email || user.name || user[identifierColumn] || user.id,
  name: user.name || null,
  email: user.email || null,
  role: user.role,
});

const hashPassword = async (password) => bcrypt.hash(password, 10);

const findUserByIdentifier = async (identifierColumns, identifier) => {
  for (const column of identifierColumns) {
    const [users] = await db.query(`SELECT * FROM users WHERE ${column} = ? LIMIT 1`, [identifier]);

    if (users.length) {
      return {
        user: users[0],
        identifierColumn: column,
      };
    }
  }

  return {
    user: null,
    identifierColumn: identifierColumns[0] || 'id',
  };
};

router.post('/register', async (req, res) => {
  const { id, username, email, password, name, phone, role, status } = req.body ?? {};

  try {
    const { columns, identifierColumns, passwordColumn } = await getAuthSchema();

    if (!passwordColumn) {
      return res.status(500).json(
        createErrorBody('AUTH_SCHEMA_INVALID', 'Users table must contain a password column')
      );
    }

    if (!columns.has('id') || !columns.has('role') || !columns.has('status')) {
      return res.status(500).json(
        createErrorBody('AUTH_SCHEMA_INVALID', 'Users table is missing required auth fields')
      );
    }

    const identifierValue = username || email;

    if (!identifierValue || !password || !name) {
      return res.status(400).json(
        createErrorBody('VALIDATION_ERROR', 'username or email, password, and name are required')
      );
    }

    const lookup = await findUserByIdentifier(identifierColumns, identifierValue);

    if (lookup.user) {
      return res.status(409).json(createErrorBody('CONFLICT', 'User already exists'));
    }

    const nextId =
      id || `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const nextRole = role || 'DRIVER';
    const nextStatus = status || 'ACTIVE';
    const nextPassword = await hashPassword(password);

    const insertColumns = [];
    const insertValues = [];
    const placeholders = [];

    const maybeAddColumn = (columnName, value) => {
      if (columns.has(columnName)) {
        insertColumns.push(columnName);
        insertValues.push(value);
        placeholders.push('?');
      }
    };

    maybeAddColumn('id', nextId);
    maybeAddColumn('username', username || null);
    maybeAddColumn('email', email || null);
    maybeAddColumn(passwordColumn, nextPassword);
    maybeAddColumn('name', name);
    maybeAddColumn('phone', phone || null);
    maybeAddColumn('role', nextRole);
    maybeAddColumn('status', nextStatus);

    await db.query(
      `INSERT INTO users (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      insertValues
    );

    const [createdUsers] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [nextId]);

    return res.status(201).json({
      message: 'User registered',
      user: formatUser(createdUsers[0], identifierColumns[0] || 'id'),
    });
  } catch (error) {
    return res.status(500).json(createErrorBody('DB_ERR', error.message));
  }
});

router.post('/login', async (req, res) => {
  const { username, password, identifier } = req.body ?? {};
  const loginIdentifier = identifier || username;

  if (!loginIdentifier || !password) {
    return sendAuthError(
      res,
      400,
      'VALIDATION_ERROR',
      'Identifier and password are required'
    );
  }

  try {
    const { identifierColumn, identifierColumns, passwordColumn } = await getAuthSchema();

    if (!identifierColumn || !passwordColumn) {
      return res.status(500).json(
        createErrorBody(
          'AUTH_SCHEMA_INVALID',
          'Users table must contain an identifier column and a password column'
        )
      );
    }

    const { user, identifierColumn: matchedIdentifierColumn } = await findUserByIdentifier(
      identifierColumns,
      loginIdentifier
    );

    if (!user || !(await comparePassword(password, user[passwordColumn]))) {
      return sendAuthError(res, 401, 'AUTH_FAILED', 'Invalid credentials');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    return res.json({
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user: formatUser(user, matchedIdentifierColumn),
    });
  } catch (error) {
    return res.status(500).json(createErrorBody('DB_ERR', error.message));
  }
});

router.post('/refresh', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    clearRefreshCookie(res);
    return sendAuthError(res, 401, 'REFRESH_REQUIRED', 'Refresh token required', {
      forceLogout: true,
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      clearRefreshCookie(res);
      return sendAuthError(res, 401, 'REFRESH_INVALID', 'Invalid refresh token', {
        forceLogout: true,
      });
    }

    const [users] = await db.query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (!users.length) {
      clearRefreshCookie(res);
      return sendAuthError(res, 401, 'REFRESH_INVALID', 'Invalid refresh token', {
        forceLogout: true,
      });
    }

    const accessToken = signAccessToken(users[0]);

    return res.json({
      accessToken,
      expiresIn: 15 * 60,
      user: formatUser(users[0], 'id'),
    });
  } catch (error) {
    clearRefreshCookie(res);
    return sendAuthError(
      res,
      401,
      'REFRESH_INVALID',
      'Refresh token expired or invalid',
      { forceLogout: true }
    );
  }
});

router.post('/logout', (req, res) => {
  clearRefreshCookie(res);
  res.status(204).send();
});

module.exports = router;
