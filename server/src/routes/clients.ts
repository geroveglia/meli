import { Router, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Client, IClient } from "../models/Client.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { requireTenant, TenantRequest } from "../middleware/tenant.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const createClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  company: z.string().trim().optional(),
  email: z.string().email("Email inválido").toLowerCase().trim(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "lead"]).optional().default("active"),
  isFavorite: z.boolean().optional().default(false),
});

const updateClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim().optional(),
  company: z.string().trim().nullable().optional(),
  email: z.string().email("Email inválido").toLowerCase().trim().optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive", "lead"]).optional(),
  isFavorite: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Check ObjectId validity
// ─────────────────────────────────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /clients/count - Get total count for navbar badge
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/count",
  requireTenant,
  authenticateToken,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const count = await Client.countDocuments({ tenantId: req.tenantObjectId });
      res.json({ count });
    } catch (error) {
      console.error("Count clients error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /clients - List clients with search and filters
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/",
  requireTenant,
  authenticateToken,
  requirePermission("clients:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { page = 1, limit = 20, search, status, isFavorite } = req.query;

      const filter: Record<string, unknown> = { tenantId: req.tenantObjectId };

      // Search by name, company, or email
      if (search && typeof search === "string" && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        filter.$or = [
          { name: searchRegex },
          { company: searchRegex },
          { email: searchRegex },
        ];
      }

      // Filter by status
      if (status && typeof status === "string" && ["active", "inactive", "lead"].includes(status)) {
        filter.status = status;
      }

      // Filter by favorite
      if (isFavorite === "true") {
        filter.isFavorite = true;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [clients, total] = await Promise.all([
        Client.find(filter)
          .sort({ isFavorite: -1, createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Client.countDocuments(filter),
      ]);

      res.json({
        clients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /clients - Create a new client
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/",
  requireTenant,
  authenticateToken,
  requirePermission("clients:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const data = createClientSchema.parse(req.body);

      // Check for duplicate email in the same tenant
      const existingClient = await Client.findOne({
        tenantId: req.tenantObjectId,
        email: data.email,
      });

      if (existingClient) {
        res.status(409).json({
          error: "Duplicate email",
          message: "Ya existe un cliente con este email en tu organización",
        });
        return;
      }

      const client = new Client({
        ...data,
        tenantId: req.tenantObjectId,
      });

      await client.save();

      res.status(201).json(client.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
        return;
      }
      console.error("Create client error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /clients/:id - Get client by ID
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/:id",
  requireTenant,
  authenticateToken,
  requirePermission("clients:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid client ID" });
        return;
      }

      const client = await Client.findOne({
        _id: id,
        tenantId: req.tenantObjectId,
      }).lean();

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ error: "Internal server area" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /clients/:id - Update client (partial update)
// ─────────────────────────────────────────────────────────────────────────────

router.put(
  "/:id",
  requireTenant,
  authenticateToken,
  requirePermission("clients:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid client ID" });
        return;
      }

      const data = updateClientSchema.parse(req.body);

      // Check if client exists and belongs to tenant
      const existingClient = await Client.findOne({
        _id: id,
        tenantId: req.tenantObjectId,
      });

      if (!existingClient) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      // If email is being changed, check for duplicates
      if (data.email && data.email !== existingClient.email) {
        const duplicateEmail = await Client.findOne({
          tenantId: req.tenantObjectId,
          email: data.email,
          _id: { $ne: id },
        });

        if (duplicateEmail) {
          res.status(409).json({
            error: "Duplicate email",
            message: "Ya existe otro cliente con este email en tu organización",
          });
          return;
        }
      }

      // Build update object, handling null values for optional fields
      const updateData: Record<string, unknown> = {};
      const unsetData: Record<string, 1> = {};

      for (const [key, value] of Object.entries(data)) {
        if (value === null) {
          unsetData[key] = 1;
        } else if (value !== undefined) {
          updateData[key] = value;
        }
      }

      const updateQuery: Record<string, unknown> = {};
      if (Object.keys(updateData).length > 0) {
        updateQuery.$set = updateData;
      }
      if (Object.keys(unsetData).length > 0) {
        updateQuery.$unset = unsetData;
      }

      const updatedClient = await Client.findByIdAndUpdate(id, updateQuery, {
        new: true,
        runValidators: true,
      }).lean();

      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
        return;
      }
      console.error("Update client error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /clients/:id/favorite - Toggle favorite status
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  "/:id/favorite",
  requireTenant,
  authenticateToken,
  requirePermission("clients:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid client ID" });
        return;
      }

      const client = await Client.findOne({
        _id: id,
        tenantId: req.tenantObjectId,
      });

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      client.isFavorite = !client.isFavorite;
      await client.save();

      res.json({ isFavorite: client.isFavorite });
    } catch (error) {
      console.error("Toggle favorite error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /clients/:id - Delete client (hard delete)
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/:id",
  requireTenant,
  authenticateToken,
  requirePermission("clients:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid client ID" });
        return;
      }

      const result = await Client.findOneAndDelete({
        _id: id,
        tenantId: req.tenantObjectId,
      });

      if (!result) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const clientRoutes = router;
