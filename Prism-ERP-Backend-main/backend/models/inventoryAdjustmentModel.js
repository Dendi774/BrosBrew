import pool from '../database/db.js';

// NOTE: stock lives on `ingredients` (quantity_in_stock), not on products —
// products are made-to-order (see productModel.js). So every adjustment here
// is keyed by ingredient_id, same as stockIn and the order/return flows.
//
// We reuse the existing `inventory_transactions` table rather than building
// a parallel one:
//   - 'Sale'       -> already inserted by salesOrderModel when an order moves
//                     to 'Preparing' (routine consumption, not an adjustment)
//   - 'Waste'      -> already inserted by salesReturnModel when an *approved*
//                     return belongs to a Completed order (ingredients were
//                     already consumed and can't be reclaimed)
//   - 'Adjustment' -> NEW. Manual entries made from this module: damage,
//                     spoilage, loss, or a stock-count correction. Can be an
//                     Increase or a Decrease.
//
// This module only ever reads/writes 'Waste' and 'Adjustment' rows — 'Sale'
// rows are routine order fulfillment, not something that belongs on an
// "Inventory Adjustments" screen.

const formatAdjustmentNumber = (transactionId) => `IA-${String(transactionId).padStart(5, '0')}`;

// Lists every Waste/Adjustment row, normalized into a single shape the UI
// can render directly — regardless of whether it was entered manually here
// or auto-logged by an approved sales return.
export const getAllAdjustments = async () => {
  const [rows] = await pool.query(
    `SELECT it.transaction_id, it.ingredient_id, i.ingredient_name, i.unit,
            it.order_id, it.transaction_type, it.quantity, it.notes, it.created_at
       FROM inventory_transactions it
       JOIN ingredients i ON it.ingredient_id = i.ingredient_id
      WHERE it.transaction_type IN ('Waste', 'Adjustment')
      ORDER BY it.created_at DESC, it.transaction_id DESC`
  );

  return rows.map((row) => {
    // 'Waste' rows (manual or from a return) are always stored as a
    // positive magnitude representing a loss. 'Adjustment' rows carry their
    // own sign: positive = stock-count increase, negative = decrease.
    const quantityChange =
      row.transaction_type === 'Adjustment'
        ? Number(row.quantity)
        : -Math.abs(Number(row.quantity));

    let source = 'Manual Adjustment';
    if (row.transaction_type === 'Waste') {
      source = row.order_id ? 'Sales Return' : 'Manual Waste';
    }

    return {
      transaction_id: row.transaction_id,
      adjustment_number: formatAdjustmentNumber(row.transaction_id),
      date: row.created_at,
      ingredient_id: row.ingredient_id,
      ingredient_name: row.ingredient_name,
      unit: row.unit,
      type: quantityChange >= 0 ? 'Increase' : 'Decrease',
      quantity_change: quantityChange,
      reason: row.notes,
      source,
      order_id: row.order_id,
      status: 'Recorded',
    };
  });
};

// Manually logs a stock loss or count correction outside of the order/return
// flow (e.g. a spilled drink, an expired ingredient, a recount that found
// more or less than the system shows). Takes effect immediately — there's
// no pending/approval step, same as stockIn.
export const addAdjustment = async (data) => {
  const { ingredient_id, adjustment_type, quantity, reason } = data;

  if (!ingredient_id) throw new Error('ingredient_id is required');
  if (!quantity || Number(quantity) <= 0) {
    throw new Error('quantity must be a positive number');
  }
  if (!['Increase', 'Decrease'].includes(adjustment_type)) {
    throw new Error("adjustment_type must be 'Increase' or 'Decrease'");
  }

  const signedQuantity = adjustment_type === 'Increase' ? Number(quantity) : -Number(quantity);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [ingredientRows] = await connection.query(
      'SELECT * FROM ingredients WHERE ingredient_id = ? FOR UPDATE',
      [ingredient_id]
    );
    if (ingredientRows.length === 0) throw new Error('Ingredient not found');

    if (
      adjustment_type === 'Decrease' &&
      Number(ingredientRows[0].quantity_in_stock) < Number(quantity)
    ) {
      throw new Error('Cannot decrease more than the current quantity in stock');
    }

    await connection.query(
      'UPDATE ingredients SET quantity_in_stock = quantity_in_stock + ? WHERE ingredient_id = ?',
      [signedQuantity, ingredient_id]
    );

    const [result] = await connection.query(
      `INSERT INTO inventory_transactions
         (ingredient_id, order_id, transaction_type, quantity, notes, created_at)
       VALUES (?, NULL, 'Adjustment', ?, ?, NOW())`,
      [ingredient_id, signedQuantity, reason || null]
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
