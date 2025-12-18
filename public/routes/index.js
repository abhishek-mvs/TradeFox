import express from "express";
import { health } from "../controllers/health/index.js";

const router = express.Router();

router.get("/health", health);


export default router; 