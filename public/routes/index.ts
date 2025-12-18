import express from "express";
import { health } from "../controllers/health/index.js";
import { createOrder, getOrders } from "../controllers/trade/index.js";
import { getPortfolio } from "../controllers/portfolio/index.js";
import { getPnL } from "../controllers/pnl/index.js";
import { updateUSDCBalance } from "../controllers/usdcFunds/index.js";
import { getAllUsers, createUser } from "../controllers/user/index.js";

const router = express.Router();

router.get("/health", health);
router.post("/create_order", createOrder);
router.post("/get_orders", getOrders);
router.post("/get_portfolio", getPortfolio);
router.post("/get_pnl", getPnL);
router.post("/update_usdc_balance", updateUSDCBalance);
router.get("/users", getAllUsers);
router.post("/users", createUser);

export default router;

