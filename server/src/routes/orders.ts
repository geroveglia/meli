import { Router, Response } from "express";
import { Order } from "../models/Order.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/orders
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let tenantId = req.tenantId;
    
    // Multi-tenant / SuperAdmin Logic
    const requestedTenant = req.query.tenantId as string;
    const requestedClient = req.query.clientId as string;
    const requestedMode = req.query.mode as string;
    
    const userRoles = req.user?.roles || [];
    const isSuperAdmin = req.user?.primaryRole === 'superadmin' || userRoles.includes('superadmin');

    if (isSuperAdmin) {
        if (requestedTenant === 'all' || requestedMode === 'all') {
            tenantId = undefined; // No tenant filter = All
        } else if (requestedTenant) {
            tenantId = requestedTenant;
        }
    }

    // Default Filters
    const { status, dateFrom, dateTo, search } = req.query;
    
    let query: any = {};
    if (tenantId) {
        query.tenantId = tenantId;
    }
    
    if (requestedClient) {
        query.clientId = requestedClient;
    }

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
// GET /api/v1/orders/:id/label
router.get("/:id/label", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // Find Order
        const query: any = { $or: [{ _id: id }, { meliId: id }] };
        if (tenantId) query.tenantId = tenantId;

        const order = await Order.findOne(query);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (!order.shipping?.id) {
            return res.status(400).json({ error: "Order has no shipping ID" });
        }

        // Get Access Token
        let accessToken = "";
        
        // Check if order belongs to a specific client (Cuenta)
        if (order.clientId) {
            const { Cuenta } = await import("../models/Cuenta.js"); 
            const cuenta = await Cuenta.findById(order.clientId);
            if (cuenta && cuenta.mercadolibre?.accessToken) {
                accessToken = cuenta.mercadolibre.accessToken;
            }
        } 
        
        // If not found or no client, try Tenant (fallback/legacy)
        if (!accessToken) {
            const { Tenant } = await import("../models/Tenant.js");
            const tenant = await Tenant.findById(order.tenantId);
             if (tenant && tenant.mercadolibre?.accessToken) {
                accessToken = tenant.mercadolibre.accessToken;
            }
        }

        if (!accessToken) {
             return res.status(500).json({ error: "No valid access token found for this order" });
        }

        // Fetch Label
        try {
            const { getShipmentLabel } = await import("../services/meliService.js");
            const labelResponse = await getShipmentLabel(order.shipping.id, accessToken);

            // Stream PDF
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="label-${order.meliId}.pdf"`);
            
            // @ts-ignore
            if (labelResponse.body && typeof labelResponse.body.pipe === 'function') {
                 // @ts-ignore
                 labelResponse.body.pipe(res);
            } else {
                // If pure fetch response (node-fetch or native fetch in some envs might differ)
                const arrayBuffer = await labelResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                res.send(buffer);
            }

        } catch (err: any) {
             console.error("Error getting label:", err);
             res.status(502).json({ error: "Failed to fetch label from MercadoLibre", details: err.message });
        }

    } catch (error) {
        console.error("Error in label endpoint:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/v1/orders/:id
router.patch("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId; // Ensure tenant isolation if applicable
        const updates = req.body;

        // Validation: Only allow specific fields to be updated manually
        const allowedUpdates = ["logisticsStatus", "packaged", "tagStatus"];
        const actualUpdates: any = {};

        // Filter updates
        for (const key of Object.keys(updates)) {
            if (allowedUpdates.includes(key)) {
                actualUpdates[key] = updates[key];
            }
        }

        // Additional mapping for 'packaged' if it comes as 'isPackaged' or check boolean
        if (updates.packaged !== undefined) {
             actualUpdates.isPackaged = updates.packaged;
             delete actualUpdates.packaged;
        }

        if (Object.keys(actualUpdates).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        // Add lastUpdated timestamp
        actualUpdates.lastUpdated = new Date();

        // Find and Update
        // Use findOneAndUpdate to ensure we match tenant if needed (though ID should be unique)
        // const query = { _id: id, ...(tenantId ? { tenantId } : {}) }; // Enforce tenant check if strict
        // For now, ID based find is usually sufficient but let's be safe if tenantId is present
        const query: any = { $or: [{ _id: id }, { meliId: id }] }; 
        if (tenantId) query.tenantId = tenantId;

        const order = await Order.findOneAndUpdate(
            query, 
            { $set: actualUpdates },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json(order);

    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export const orderRouter = router;
