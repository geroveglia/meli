
import { Router } from "express";
import { getAuth, callback, webhook, disconnect, sync, getDashboardStats, configureCredentials } from "../controllers/meliController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Protected route to initiate auth flow
router.get("/auth", authenticateToken, getAuth);
router.post("/disconnect", authenticateToken, disconnect);

// Public routes for MELI callbacks
router.get("/callback", callback);
router.post("/notifications", webhook);
router.post("/sync", authenticateToken, sync);
router.post("/credentials", authenticateToken, configureCredentials); // Add this
router.get("/dashboard-stats", authenticateToken, getDashboardStats);

export { router as meliRouter };
