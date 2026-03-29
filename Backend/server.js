require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

db.getConnection()
  .then((connection) => {
    connection.release();
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });
