


import * as ingredientsModel from '../models/ingredientsModel.js';



export const getIngredients = async (req, res) => {
    try{
        const data = await ingredientsModel.getAllIngredients();
        res.status(200).json(data);
    } catch(err){
        res.status(500).json({message: err.message});
    }
}