


import * as ProductCatalogModel from "../models/productCatalogModel.js";


export const getProductCatalog = async (req, res) => {
    try{
        const data = await ProductCatalogModel.getAllProductCatalog();
        res.status(200).json(data);
    } catch(err){
        res.status(500).json({ message: err.message });
    }
}