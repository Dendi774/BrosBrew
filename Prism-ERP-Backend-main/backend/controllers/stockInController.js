


import * as stockInModel from "../models/stockInModel.js";


export const getStockIn = async(req, res) => {
    try{
        const data = await stockInModel.getAllStockIns();
        res.status(200).json(data);
    } catch(err){
        res.status(500).json({message: err.message});
    }
}


export const addStockIn = async (req, res) => {
    try{
        const data = await stockInModel.addStockIn(req.body);
        res.status(201).json({message: "stock Added to Inventory", stockReferenceNumber: data});
    } catch(err){
        res.status(500).json({message: err.message});
    }
}