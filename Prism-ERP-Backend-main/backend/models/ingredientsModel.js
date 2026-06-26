


import pool from '../database/db.js';


export const getAllIngredients = async () => {
    const [ingredients] = await pool.query(`SELECT * FROM ingredients`);
    return ingredients;
}