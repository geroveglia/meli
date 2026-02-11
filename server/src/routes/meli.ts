
import { Router } from "express";
import { getAuth, callback, webhook, disconnect } from "../controllers/meliController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Protected route to initiate auth flow
router.get("/auth", authenticateToken, getAuth);
router.post("/disconnect", authenticateToken, disconnect);

// Public routes for MELI callbacks
router.get("/callback", callback);
router.post("/notifications", webhook);

export { router as meliRouter };
