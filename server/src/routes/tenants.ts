import { Router, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Tenant, ITenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requirePermission } from "../middleware/permissions.js";
import { ensureDefaultRoles } from "../services/roleInitService.js";
import { sendTenantWelcomeEmail } from "../utils/email.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────

const createTenantSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  slug: z.string().min(2, "El slug debe tener al menos 2 caracteres").trim().toLowerCase()
    .regex(/^[a-z0-9-_]+$/, "El slug solo puede contener letras minúsculas, números, guiones y guiones bajos"),
  domain: z.string().trim().optional(),
  company: z.object({
    legalName: z.string().min(2, "La razón social debe tener al menos 2 caracteres").trim(),
    taxId: z.string().trim().optional(),
    industry: z.string().trim().optional(),
    address: z.object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    }).optional(),
    website: z.string().url().optional().or(z.literal("")),
    description: z.string().trim().optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),
  }),
  contact: z.object({
    firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
    lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres").trim(),
    email: z.string().email("Email inválido").trim().toLowerCase(),
    phone: z.string().trim().optional(),
    position: z.string().trim().optional(),
    department: z.string().trim().optional(),
  }),
  settings: z.object({
    timezone: z.string().default("America/Argentina/Buenos_Aires"),
    currency: z.string().default("ARS"),
    language: z.string().default("es"),
    features: z.array(z.string()).optional(),
  }).optional(),
  subscription: z.object({
    plan: z.enum(["free", "basic", "pro", "enterprise"]).default("free"),
    status: z.enum(["active", "suspended", "cancelled"]).default("active"),
    expiresAt: z.string().datetime().optional(),
  }).optional(),
});

const updateTenantSchema = createTenantSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

// Middleware: Solo SuperAdmin puede acceder
const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  
  const isSuperAdmin = 
    user.primaryRole?.toLowerCase() === "superadmin" || 
    user.roles?.map(r => r.toLowerCase()).includes("superadmin");

  if (!isSuperAdmin) {
    res.status(403).json({ error: "Acceso denegado. Solo superadmin puede acceder a tenants." });
    return;
  }
  
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /tenants/count - Obtener conteo de tenants
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/count",
  authenticateToken,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await Tenant.countDocuments({});
      res.json({ count });
    } catch (error) {
      console.error("Count tenants error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
// ─────────────────────────────────────────────────────────────────────────────
// GET /tenants/current - Obtener tenant actual
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/current",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId; // Set by authenticateToken
      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      const tenant = await Tenant.findById(tenantId).lean();
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      res.json(tenant);
    } catch (error) {
      console.error("Get current tenant error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadPath = path.join(process.cwd(), "storage", "branding");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "branding-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image.") as any);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /tenants/current/branding - Get current tenant branding
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/current/branding",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantObjectId;
      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      const tenant = await Tenant.findById(tenantId).select("branding");
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      res.json(tenant.branding || {});
    } catch (error) {
      console.error("Get branding error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /tenants/current/branding - Update branding
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/current/branding",
  authenticateToken,
  // requirePermission("platform:settings"), // Ensure user has permission to update settings
  upload.fields([
    { name: "headerLight", maxCount: 1 },
    { name: "headerDark", maxCount: 1 },
    { name: "footerLight", maxCount: 1 },
    { name: "footerDark", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantObjectId;
      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      const { width } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Initialize branding if it doesn't exist
      if (!tenant.branding) {
        tenant.branding = {
          logo: {
            width: 150,
            header: {},
            footer: {}
          }
        };
      }
      if (!tenant.branding.logo) {
         tenant.branding.logo = { width: 150, header: {}, footer: {} };
      }

      // Update width
      if (width) {
        tenant.branding.logo.width = Number(width);
      }

      // Helper to process file
      const processFile = (fieldName: string, targetPath: string[]) => {
        if (files && files[fieldName] && files[fieldName][0]) {
           const file = files[fieldName][0];
           const url = `/storage/branding/${file.filename}`;
           
           // Navigate to target and set. e.g. tenant.branding.logo.header.light = url
           let current: any = tenant.branding.logo;
           for(let i=0; i<targetPath.length-1; i++) {
             if(!current[targetPath[i]]) current[targetPath[i]] = {};
             current = current[targetPath[i]];
           }
           current[targetPath[targetPath.length-1]] = url;
        }
      };

      processFile("headerLight", ["header", "light"]);
      processFile("headerDark", ["header", "dark"]);
      processFile("footerLight", ["footer", "light"]);
      processFile("footerDark", ["footer", "dark"]);
      processFile("favicon", ["favicon"]);

      // Handle removals
      const { 
        removeHeaderLight, 
        removeHeaderDark, 
        removeFooterLight, 
        removeFooterDark,
        removeFavicon 
      } = req.body;

      if (removeHeaderLight === "true") {
        if (tenant.branding.logo.header) tenant.branding.logo.header.light = undefined;
      }
      if (removeHeaderDark === "true") {
        if (tenant.branding.logo.header) tenant.branding.logo.header.dark = undefined;
      }
      if (removeFooterLight === "true") {
        if (tenant.branding.logo.footer) tenant.branding.logo.footer.light = undefined;
      }
      if (removeFooterDark === "true") {
        if (tenant.branding.logo.footer) tenant.branding.logo.footer.dark = undefined;
      }
      if (removeFavicon === "true") {
        tenant.branding.logo.favicon = undefined;
      }

      // Update colors
      if (req.body.colors) {
        try {
          const colors = typeof req.body.colors === 'string' 
            ? JSON.parse(req.body.colors) 
            : req.body.colors;
            
          if (colors) {
            tenant.branding.colors = {
              ...tenant.branding.colors,
              ...colors
            };
          }
        } catch (e) {
          console.error("Error parsing colors:", e);
        }
      }

      await tenant.save();

      res.json(tenant.branding);
    } catch (error) {
      console.error("Update branding error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// GET /tenants/current/billing-settings - Get billing settings
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/current/billing-settings",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantObjectId;
      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      const tenant = await Tenant.findById(tenantId).select("billing.settings");
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      // Return default if not exists
      res.json(tenant.billing?.settings || { 
        autoBilling: false, 
        triggerStage: "order_shipped" 
      });
    } catch (error) {
      console.error("Get billing settings error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /tenants/current/billing-settings - Update billing settings
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/current/billing-settings", 
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantObjectId;
      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      const { autoBilling, triggerStage } = req.body;
      
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      if (!tenant.billing) {
        // Initialize billing if missing (should not happen usually)
        tenant.billing = {
            currentPeriod: {
                startDate: new Date(),
                endDate: new Date(),
                amount: 0,
                currency: "ARS"
            },
            invoices: [],
            autoRenew: true,
            settings: { autoBilling: false, triggerStage: "order_shipped" }
        } as any;
      }
      
      // Initialize settings if missing
      if(!tenant.billing.settings) {
          tenant.billing.settings = { autoBilling: false, triggerStage: "order_shipped" };
      }

      if (typeof autoBilling === 'boolean') {
        tenant.billing.settings.autoBilling = autoBilling;
      }
      
      if (triggerStage && ["order_created", "order_paid", "order_shipped", "order_delivered"].includes(triggerStage)) {
         tenant.billing.settings.triggerStage = triggerStage;
      }

      await tenant.save();

      res.json(tenant.billing.settings);
    } catch (error) {
       console.error("Update billing settings error:", error);
       res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /tenants - Listar todos los tenants
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 20, search, status, plan, isActive } = req.query;

      const filter: Record<string, unknown> = {};

      // Búsqueda por nombre, slug o email de contacto
      if (search && typeof search === "string") {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { slug: { $regex: search, $options: "i" } },
          { "contact.email": { $regex: search, $options: "i" } },
          { "company.legalName": { $regex: search, $options: "i" } },
        ];
      }

      // Filtro por estado de suscripción
      if (status && typeof status === "string") {
        filter["subscription.status"] = status;
      }

      // Filtro por plan
      if (plan && typeof plan === "string") {
        filter["subscription.plan"] = plan;
      }

      // Filtro por activo/inactivo
      if (isActive !== undefined) {
        filter.isActive = isActive === "true";
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [tenants, total] = await Promise.all([
        Tenant.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Tenant.countDocuments(filter),
      ]);

      // Agregar conteo de usuarios por tenant
      const tenantsWithUserCounts = await Promise.all(
        tenants.map(async (tenant) => {
          const userCount = await User.countDocuments({ tenantId: tenant._id });
          return { ...tenant, userCount };
        })
      );

      res.json({
        tenants: tenantsWithUserCounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get tenants error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /tenants/:id - Obtener tenant por ID
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/:id",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "ID de tenant inválido" });
        return;
      }

      const tenant = await Tenant.findById(id).lean();

      if (!tenant) {
        res.status(404).json({ error: "Tenant no encontrado" });
        return;
      }

      // Agregar conteo de usuarios
      const userCount = await User.countDocuments({ tenantId: tenant._id });

      res.json({ ...tenant, userCount });
    } catch (error) {
      console.error("Get tenant error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /tenants - Crear nuevo tenant
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createTenantSchema.parse(req.body);

      // Verificar que el slug no exista
      const existingSlug = await Tenant.findOne({ slug: data.slug });
      if (existingSlug) {
        res.status(400).json({ error: "Ya existe un tenant con este slug" });
        return;
      }

      // Verificar que el email de contacto no esté en uso
      const existingEmail = await Tenant.findOne({ "contact.email": data.contact.email });
      if (existingEmail) {
        res.status(400).json({ error: "Ya existe un tenant con este email de contacto" });
        return;
      }

      // Crear billing con valores por defecto
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const tenantData = {
        ...data,
        settings: data.settings || {
          timezone: "America/Argentina/Buenos_Aires",
          currency: "ARS",
          language: "es",
          features: [],
        },
        subscription: data.subscription || {
          plan: "free",
          status: "active",
        },
        billing: {
          currentPeriod: {
            startDate: now,
            endDate: endDate,
            amount: 0,
            currency: "ARS",
          },
          autoRenew: true,
          invoices: [],
        },
        usage: {
          users: { current: 0, limit: 10 },
          clients: { current: 0, limit: 50 },
          campaigns: { current: 0, limit: 100 },
          storage: { usedMB: 0, limitMB: 1024 },
          apiCalls: { current: 0, limit: 10000, resetDate: endDate },
          lastUpdated: now,
        },
        isActive: true,
        isSystem: false,
      };

      const tenant = await Tenant.create(tenantData);

      // --- CREATE ADMIN USER ---
      // Wait a moment for post-save hooks (like role creation) to finish
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { adminRole } = await ensureDefaultRoles(tenant._id as Types.ObjectId);
      
      const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      const adminUser = new User({
        tenantId: tenant._id,
        email: data.contact.email,
        password: generatedPassword,
        firstName: data.contact.firstName,
        lastName: data.contact.lastName,
        roles: [adminRole._id],
        isActive: true,
      });

      await adminUser.save();

      // Ensure user is added to the tenant
      await Tenant.findByIdAndUpdate(tenant._id, {
        $addToSet: { userIds: adminUser._id },
        $inc: { "usage.users.current": 1 },
      });

      // --- SEND EMAIL ---
      sendTenantWelcomeEmail(
        data.contact.email, 
        data.contact.firstName, 
        data.name, 
        generatedPassword
      ).catch(err => {
        console.error("Failed to send tenant welcome email:", err);
      });

      const responseObj: any = tenant.toObject();
      responseObj._generatedPassword = generatedPassword; // Optional, just in case frontend needs to show it

      res.status(201).json(responseObj);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Error de validación",
          details: error.errors,
        });
        return;
      }
      console.error("Create tenant error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /tenants/:id - Actualizar tenant
// ─────────────────────────────────────────────────────────────────────────────

router.put(
  "/:id",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "ID de tenant inválido" });
        return;
      }

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        res.status(404).json({ error: "Tenant no encontrado" });
        return;
      }

      // Proteger tenants del sistema
      if (tenant.isSystem) {
        res.status(403).json({ error: "No se puede modificar un tenant del sistema" });
        return;
      }

      const data = updateTenantSchema.parse(req.body);

      // Si cambia el slug, verificar que no exista
      if (data.slug && data.slug !== tenant.slug) {
        const existingSlug = await Tenant.findOne({ slug: data.slug, _id: { $ne: id } });
        if (existingSlug) {
          res.status(400).json({ error: "Ya existe un tenant con este slug" });
          return;
        }
      }

      // Si cambia el email de contacto, verificar que no exista
      if (data.contact?.email && data.contact.email !== tenant.contact.email) {
        const existingEmail = await Tenant.findOne({
          "contact.email": data.contact.email,
          _id: { $ne: id },
        });
        if (existingEmail) {
          res.status(400).json({ error: "Ya existe un tenant con este email de contacto" });
          return;
        }
      }

      const updatedTenant = await Tenant.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      res.json(updatedTenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Error de validación",
          details: error.errors,
        });
        return;
      }
      console.error("Update tenant error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /tenants/:id - Eliminar tenant
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/:id",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "ID de tenant inválido" });
        return;
      }

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        res.status(404).json({ error: "Tenant no encontrado" });
        return;
      }

      // Proteger tenants del sistema
      if (tenant.isSystem) {
        res.status(403).json({ error: "No se puede eliminar un tenant del sistema" });
        return;
      }

      // Eliminar usuarios asociados al tenant
      await User.deleteMany({ tenantId: tenant._id });

      // Eliminar clientes y cuentas asociados (para limpiar conexiones de MeLi)
      const { Client } = await import("../models/Client.js");
      const { Cuenta } = await import("../models/Cuenta.js");
      await Client.deleteMany({ tenantId: tenant._id });
      await Cuenta.deleteMany({ tenantId: tenant._id });

      // Eliminar órdenes
      const { Order } = await import("../models/Order.js");
      await Order.deleteMany({ tenantId: tenant._id });

      // Opcional: ELIMINAR OTROS DATOS ASOCIADOS (facturas, productos, etc.) 
      // Si el sistema requiere un borrado duro en cascada total, podrías agregar otras colecciones.

      await Tenant.findByIdAndDelete(id);

      res.json({ message: "Tenant eliminado correctamente" });
    } catch (error) {
      console.error("Delete tenant error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /tenants/:id/status - Cambiar estado activo/inactivo
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  "/:id/status",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "ID de tenant inválido" });
        return;
      }

      if (typeof isActive !== "boolean") {
        res.status(400).json({ error: "isActive debe ser un booleano" });
        return;
      }

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        res.status(404).json({ error: "Tenant no encontrado" });
        return;
      }

      // Proteger tenants del sistema
      if (tenant.isSystem) {
        res.status(403).json({ error: "No se puede modificar el estado de un tenant del sistema" });
        return;
      }

      tenant.isActive = isActive;
      await tenant.save();

      res.json({ isActive: tenant.isActive });
    } catch (error) {
      console.error("Toggle tenant status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /tenants/:id/subscription - Cambiar plan de suscripción
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  "/:id/subscription",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { plan, status } = req.body;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: "ID de tenant inválido" });
        return;
      }

      const validPlans = ["free", "basic", "pro", "enterprise"];
      const validStatuses = ["active", "suspended", "cancelled"];

      if (plan && !validPlans.includes(plan)) {
        res.status(400).json({ error: "Plan inválido" });
        return;
      }

      if (status && !validStatuses.includes(status)) {
        res.status(400).json({ error: "Estado de suscripción inválido" });
        return;
      }

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        res.status(404).json({ error: "Tenant no encontrado" });
        return;
      }

      if (plan) tenant.subscription.plan = plan;
      if (status) tenant.subscription.status = status;

      await tenant.save();

      res.json({ subscription: tenant.subscription });
    } catch (error) {
      console.error("Update tenant subscription error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const tenantRoutes = router;
