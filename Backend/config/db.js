const mysql = require('mysql2/promise');

const createDbConfig = () => {
  if (!process.env.DATABASE_URL) {
    return {
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'password123',
      database: process.env.DB_NAME || 'fleet_db',
    };
  }

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);

    if (databaseUrl.protocol !== 'mysql:') {
      throw new Error('DATABASE_URL must start with mysql://');
    }

    return {
      host: databaseUrl.hostname || 'localhost',
      port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
      user: decodeURIComponent(databaseUrl.username || 'root'),
      password: decodeURIComponent(databaseUrl.password || ''),
      database: decodeURIComponent(databaseUrl.pathname.replace(/^\//, '')),
    };
  } catch (error) {
    console.error('Invalid DATABASE_URL:', error.message);
    process.exit(1);
  }
};

const db = mysql.createPool({
  ...createDbConfig(),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
});

module.exports = db;
