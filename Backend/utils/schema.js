const db = require('../config/db');

const cache = new Map();

const loadTableColumns = async (tableName) => {
  const cacheKey = `columns:${tableName}`;

  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      db
        .query(
          `SELECT COLUMN_NAME
           FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = ?`,
          [tableName]
        )
        .then(([rows]) => new Set(rows.map((row) => row.COLUMN_NAME)))
        .catch((error) => {
          cache.delete(cacheKey);
          throw error;
        })
    );
  }

  return cache.get(cacheKey);
};

const hasTable = async (tableName) => {
  const columns = await loadTableColumns(tableName);
  return columns.size > 0;
};

const hasColumn = async (tableName, columnName) => {
  const columns = await loadTableColumns(tableName);
  return columns.has(columnName);
};

const getFirstExistingTable = async (tableNames) => {
  for (const tableName of tableNames) {
    if (await hasTable(tableName)) {
      return tableName;
    }
  }

  return null;
};

module.exports = {
  getFirstExistingTable,
  hasColumn,
  hasTable,
  loadTableColumns,
};
