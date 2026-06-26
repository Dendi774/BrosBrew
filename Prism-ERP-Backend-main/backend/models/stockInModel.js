


import pool from '../database/db.js';


// generates a random stockInReference number
const generateStockInNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `SI-${timestamp}`;
};

export const getAllStockIns = async () => {
    const [result] = await pool.query(`SELECT * FROM stock_in`);
    return result;
}


export const addStockIn = async (data) => {
    const {ingredient, quantity, cost, supplier, unit, reorder_level} = data;
    const stockInNumber = generateStockInNumber();
    const stockInDate = new Date();
    const total = quantity * cost;

    const connection = await pool.getConnection();

    try{
        const [result] = await connection.query(
        `INSERT INTO stock_in (reference_no, stock_in_date, supplier, ingredient, quantity, cost, total) VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
        [stockInNumber, supplier, ingredient, quantity, cost, total]
        );

        const [addIngredients] = await connection.query(
            `INSERT INTO ingredients (ingredient_name, unit, quantity_in_stock, reorder_level, cost_per_unit) VALUES (?, ?, ?, ?, ?)
            
            ON DUPLICATE KEY UPDATE quantity_in_stock = quantity_in_stock + VALUES(quantity_in_stock)
            `,
            [ingredient, unit, quantity, reorder_level, cost]
        );

        
        return stockInNumber;

        connection.commit();
    } catch(err){
        await connection.rollback()
        throw err;
    } finally{
        connection.release();
    }
    
    
}