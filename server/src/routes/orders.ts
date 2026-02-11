import { Router, Response } from "express";
import { Order } from "../models/Order.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/orders
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
       res.status(400).json({ error: "Tenant ID required" });
       return;
    }

    // Default Filters
    const { status, dateFrom, dateTo, search } = req.query;
    
    let query: any = { tenantId };

    if (dateFrom && dateTo) {
      query.dateCreated = { 
        $gte: new Date(String(dateFrom)), 
        $lte: new Date(String(dateTo)) 
      };
    }

    if (search) {
        // Simple search by buyer nickname or ID
        // For mongo search, regex is options
        const searchStr = String(search);
        query.$or = [
            { meliId: { $regex: searchStr, $options: 'i' } },
            { "buyer.nickname": { $regex: searchStr, $options: 'i' } }
        ];
    }
    
    // Fetch orders
    const orders = await Order.find(query).sort({ dateCreated: -1 }).limit(100);
    
    // Map to Frontend Interface if needed, or simply return
    // The Frontend 'Order' interface in lumbaStore matches closely but check mapping
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const orderRouter = router;
