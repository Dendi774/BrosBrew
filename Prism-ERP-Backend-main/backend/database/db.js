


import mysql from 'mysql2/promise';
import { DB_CONFIG } from '../config/env.js';

const pool = mysql.createPool({
  ...DB_CONFIG,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;