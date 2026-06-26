

import { Router } from "express";
import * as ProductCatalogController from "../controllers/productCatalogController.js";

const router = Router();


router.get('/', ProductCatalogController.getProductCatalog);

export default router;
