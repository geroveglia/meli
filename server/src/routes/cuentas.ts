import { Router, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Cuenta, ICuenta } from "../models/Cuenta.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { requireTenant, TenantRequest } from "../middleware/tenant.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const createCuentaSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  company: z.string().trim().optional(),
  email: z.string().email("Email inválido").toLowerCase().trim(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "lead"]).optional().default("active"),
  isFavorite: z.boolean().optional().default(false),
});

const updateCuentaSchema = z.object({
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
      const count = await Cuenta.countDocuments({ tenantId: req.tenantObjectId });
      res.json({ count });
    } catch (error) {
      console.error("Count cuentas error:", error);
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
  requirePermission("cuentas:view"),
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

      const [cuentas, total] = await Promise.all([
        Cuenta.find(filter)
          .sort({ isFavorite: -1, createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Cuenta.countDocuments(filter),
      ]);

      res.json({
        cuentas,
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
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const data = createCuentaSchema.parse(req.body);

      // Check for duplicate email in the same tenant
      const existingCuenta = await Cuenta.findOne({
        tenantId: req.tenantObjectId,
        email: data.email,
      });

      if (existingCuenta) {
        res.status(409).json({
          error: "Duplicate email",
          message: "Ya existe una cuenta con este email en tu organización",
        });
        return;
      }

      const cuenta = new Cuenta({
        ...data,
        tenantId: req.tenantObjectId,
      });

      await cuenta.save();

      res.status(201).json(cuenta.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
        return;
      }
      console.error("Create cuenta error:", error);
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
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid cuenta ID" });
        return;
      }

      const cuenta = await Cuenta.findOne({
        _id: id,
        tenantId: req.tenantObjectId,
      }).lean();

      if (!cuenta) {
        res.status(404).json({ error: "Cuenta not found" });
        return;
      }

      res.json(cuenta);
    } catch (error) {
      console.error("Get cuenta error:", error);
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
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid cuenta ID" });
        return;
      }

      const data = updateCuentaSchema.parse(req.body);

      // Check if cuenta exists and belongs to tenant
      const existingCuenta = await Cuenta.findOne({
        _id: id,
        tenantId: req.tenantObjectId,
      });

      if (!existingCuenta) {
        res.status(404).json({ error: "Cuenta not found" });
        return;
      }

      // If email is being changed, check for duplicates
      if (data.email && data.email !== existingCuenta.email) {
        const duplicateEmail = await Cuenta.findOne({
          tenantId: req.tenantObjectId,
          email: data.email,
          _id: { $ne: id },
        });

        if (duplicateEmail) {
          res.status(409).json({
            error: "Duplicate email",
            message: "Ya existe otra cuenta con este email en tu organización",
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

      const updatedCuenta = await Cuenta.findByIdAndUpdate(id, updateQuery, {
        new: true,
        runValidators: true,
      }).lean();

      res.json(updatedCuenta);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
        return;
      }
      console.error("Update cuenta error:", error);
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
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid cuenta ID" });
        return;
      }

      const cuenta = await Cuenta.findOne({
        _id: id,
        tenantId: req.tenantObjectId,
      });

      if (!cuenta) {
        res.status(404).json({ error: "Cuenta not found" });
        return;
      }

      cuenta.isFavorite = !cuenta.isFavorite;
      await cuenta.save();

      res.json({ isFavorite: cuenta.isFavorite });
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
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid cuenta ID" });
        return;
      }

      const result = await Cuenta.findOneAndDelete({
        _id: id,
        tenantId: req.tenantObjectId,
      });

      if (!result) {
        res.status(404).json({ error: "Cuenta not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete cuenta error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const cuentaRoutes = router;
