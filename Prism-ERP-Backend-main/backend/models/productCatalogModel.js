


import pool from '../database/db.js';

export const getAllProductCatalog = async () =>{
    const [rows] = await pool.query(`SELECT * FROM products`);
    return rows;
}