import { Router, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { requireTenant, TenantRequest } from "../middleware/tenant.js";
import { requirePermission } from "../middleware/permissions.js";
import { sendClientWelcomeEmail } from "../utils/email.js";

const router = Router();

// Validation Schemas
const createClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  company: z.string().trim().optional(),
  email: z.string().email("Email inválido").toLowerCase().trim(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "lead"]).optional().default("active"),
  isFavorite: z.boolean().optional().default(false),
  createUser: z.boolean().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
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

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

// GET /clientes/count
router.get(
  "/count",
  authenticateToken,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      let tenantId = req.headers["x-tenant-id"] || req.headers["X-Tenant-Id"];
      const user = req.user!;
      const isSuperAdmin = user.primaryRole === 'superadmin' || user.roles?.includes('superadmin');

      if (!tenantId && user.tenantId) {
          tenantId = user.tenantId.toString();
      }

      if (!isSuperAdmin && !tenantId) {
         return res.status(400).json({ error: "Missing tenantId" });
      }

      let tenantObjectId = null;
      if (tenantId) {
          const { tenantRepository } = await import("../repository/index.js");
          let tenant;
          const isMongoId = /^[0-9a-fA-F]{24}$/.test(String(tenantId));
          const isNumericId = /^\d+$/.test(String(tenantId));
          if (isMongoId || isNumericId) {
              tenant = await tenantRepository.findById(String(tenantId));
              if (!tenant && !isNumericId) tenant = await tenantRepository.findBySlug(String(tenantId));
          } else {
              tenant = await tenantRepository.findBySlug(String(tenantId));
          }
          if (!tenant) return res.status(404).json({ error: "Tenant not found" });
          tenantObjectId = tenant._id;
      }

      const query: any = {};
      if (tenantObjectId) query.tenantId = tenantObjectId;

      const count = await Client.countDocuments(query);
      res.json({ count });
    } catch (error) {
      console.error("Count clientes error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /clientes
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { page = 1, limit = 20, search, status, isFavorite } = req.query;
      let tenantId = req.headers["x-tenant-id"] || req.headers["X-Tenant-Id"];
      
      const user = req.user!;
      const isSuperAdmin = user.primaryRole === 'superadmin' || user.roles?.includes('superadmin');
      
      if (!tenantId && user.tenantId) tenantId = user.tenantId.toString();
      if (!isSuperAdmin && !tenantId) return res.status(400).json({ error: "Missing tenantId" });

      let tenantObjectId = null;
      if (tenantId) {
          const { tenantRepository } = await import("../repository/index.js");
          let tenant;
          const isMongoId = /^[0-9a-fA-F]{24}$/.test(String(tenantId));
          const isNumericId = /^\d+$/.test(String(tenantId));
          if (isMongoId || isNumericId) {
              tenant = await tenantRepository.findById(String(tenantId));
              if (!tenant && !isNumericId) tenant = await tenantRepository.findBySlug(String(tenantId));
          } else {
              tenant = await tenantRepository.findBySlug(String(tenantId));
          }
          if (!tenant) return res.status(404).json({ error: "Tenant not found" });
          tenantObjectId = tenant._id;
      }

      const filter: Record<string, unknown> = {};
      if (tenantObjectId) filter.tenantId = tenantObjectId;

      if (search && typeof search === "string" && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ name: searchRegex }, { company: searchRegex }, { email: searchRegex }];
      }

      if (status && typeof status === "string" && ["active", "inactive", "lead"].includes(status)) {
        filter.status = status;
      }

      if (isFavorite === "true") filter.isFavorite = true;

      const skip = (Number(page) - 1) * Number(limit);

      const [clientes, total] = await Promise.all([
        Client.find(filter).sort({ isFavorite: -1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        Client.countDocuments(filter),
      ]);

      res.json({
        clientes,
        pagination: {
          page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get clientes error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /clientes
router.post(
  "/",
  requireTenant,
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const data = createClientSchema.parse(req.body);

      const existingClient = await Client.findOne({ tenantId: req.tenantObjectId, email: data.email });
      if (existingClient) {
        return res.status(409).json({ error: "Duplicate email", message: "Ya existe un cliente con este email en tu organización" });
      }

      // Create Client
      const client = new Client({ ...data, tenantId: req.tenantObjectId });
      await client.save();

      // Check for user with that email
      let existingUser = await User.findOne({ email: data.email, tenantId: req.tenantObjectId });

      let generatedPassword = null;
      if (data.createUser && !existingUser) {
        // Find or Create 'cliente' role
        let clienteRole = await Role.findOne({ tenantId: req.tenantObjectId, name: "cliente" });
        if (!clienteRole) {
            clienteRole = new Role({
                tenantId: req.tenantObjectId,
                name: "cliente",
                description: "Rol para acceso de Clientes",
                permissions: ["cuentas:view"], 
                isDefault: false
            });
            await clienteRole.save();
        }

        // Generate strong random password or use provided
        generatedPassword = data.password || (Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8));

        // Create User directly using the User model (already imported)
        try {
            const newUser = await User.create({
                firstName: data.name,
                lastName: data.company || "Cliente",
                email: data.email,
                password: generatedPassword,
                roles: [clienteRole._id],
                tenantId: req.tenantObjectId,
                isActive: true,
                clienteId: client._id,
                clientIds: [client._id],
            });
            console.log(`[Clientes] ✅ User created for client: ${data.email} (userId: ${newUser._id})`);
        } catch (userError: any) {
            console.error(`[Clientes] ❌ Failed to create user for client ${data.email}:`, userError);
            // Don't fail the whole request — client is already created
            generatedPassword = `ERROR_CREATING_USER: ${userError.message}`;
        }

        // Send welcome email with password asynchronously
        sendClientWelcomeEmail(data.email, data.name, generatedPassword).catch(err => {
            console.error("Failed to send welcome email:", err);
        });
      }

      const responseObj: any = client.toObject();
      if (generatedPassword) {
        responseObj._generatedPassword = generatedPassword;
      }
      res.status(201).json(responseObj);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create cliente error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /clientes/:id
router.get(
  "/:id",
  requireTenant,
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid cliente ID" });

      const client = await Client.findOne({ _id: id, tenantId: req.tenantObjectId }).lean();
      if (!client) return res.status(404).json({ error: "Cliente not found" });

      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PUT /clientes/:id
router.put(
  "/:id",
  requireTenant,
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid cliente ID" });

      const data = updateClientSchema.parse(req.body);
      const existingClient = await Client.findOne({ _id: id, tenantId: req.tenantObjectId });
      if (!existingClient) return res.status(404).json({ error: "Cliente not found" });

      if (data.email && data.email !== existingClient.email) {
        const duplicateEmail = await Client.findOne({ tenantId: req.tenantObjectId, email: data.email, _id: { $ne: id } });
        if (duplicateEmail) return res.status(409).json({ error: "Duplicate email", message: "Ya existe otro cliente con este email en tu organización" });
      }

      const updateData: Record<string, unknown> = {};
      const unsetData: Record<string, 1> = {};

      for (const [key, value] of Object.entries(data)) {
        if (value === null) unsetData[key] = 1;
        else if (value !== undefined) updateData[key] = value;
      }

      const updateQuery: Record<string, unknown> = {};
      if (Object.keys(updateData).length > 0) updateQuery.$set = updateData;
      if (Object.keys(unsetData).length > 0) updateQuery.$unset = unsetData;

      const updatedClient = await Client.findByIdAndUpdate(id, updateQuery, { new: true, runValidators: true }).lean();
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation error", details: error.errors });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PATCH /clientes/:id/favorite
router.patch(
  "/:id/favorite",
  requireTenant,
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid cliente ID" });

      const client = await Client.findOne({ _id: id, tenantId: req.tenantObjectId });
      if (!client) return res.status(404).json({ error: "Cliente not found" });

      client.isFavorite = !client.isFavorite;
      await client.save();
      res.json({ isFavorite: client.isFavorite });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PATCH /clientes/:id/reset-password
router.patch(
  "/:id/reset-password",
  requireTenant,
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ error: "Invalid cliente ID" });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }

      const client = await Client.findOne({ _id: id, tenantId: req.tenantObjectId });
      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      // Find user associated with this client
      const user = await User.findOne({ 
        tenantId: req.tenantObjectId, 
        email: client.email 
      });

      if (!user) {
        return res.status(404).json({ error: "No se encontró un usuario asociado a este cliente" });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Reset client password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /clientes/:id
router.delete(
  "/:id",
  requireTenant,
  authenticateToken,
  requirePermission("cuentas:view"),
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid cliente ID" });

      const result = await Client.findOneAndDelete({ _id: id, tenantId: req.tenantObjectId });
      if (!result) return res.status(404).json({ error: "Cliente not found" });

      // Also delete the associated User to revoke login access
      await User.deleteOne({ email: result.email, tenantId: req.tenantObjectId });
      
      // Delete any Cuentas associated with this client to prevent dangling MeLi connections
      const { Cuenta } = await import("../models/Cuenta.js");
      await Cuenta.deleteMany({ clienteId: id, tenantId: req.tenantObjectId });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const clienteRoutes = router;
