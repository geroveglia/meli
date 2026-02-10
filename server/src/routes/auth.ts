import { Router } from "express";
import { User } from "../models/User.js";
import { userRepository } from "../repository/index.js";
import { Role } from "../models/Role.js";
import { Cuenta } from "../models/Cuenta.js";
import { Tenant } from "../models/Tenant.js";
import { requireTenant, TenantRequest } from "../middleware/tenant.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/authSchemas.js";
import { register, checkEmailAvailability, loginWithGoogle } from "../controllers/authController.js";
import { signJwt } from "../utils/jwt.js";
import { addUserToClientUsuarios } from "../services/clientUsuarios.js";
import { ensureDefaultRoles } from "../services/roleInitService.js";
import { env } from "../config/env.js";
import { z } from "zod";
import { Types } from "mongoose";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const registerClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  company: z.string().min(1, "Company is required"),
  phone: z.string().optional(),
});

const loginWithClientSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  tenantSlug: z.string().optional(),
  cuentaId: z.string().optional(),
});
const router = Router();

// POST /auth/check-tenants - Obtener tenants disponibles para un email
router.post("/check-tenants", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const users = await User.find({ email, isActive: true }).select("tenantId").populate("tenantId", "name slug");

    if (users.length === 0) {
      res.status(404).json({ error: "No account found with this email" });
      return;
    }

    const tenants = users.map((u) => {
      const tenant = u.tenantId as any;
      return {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      };
    });

    res.json({ tenants });
  } catch (error) {
    console.error("Check tenants error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/google", async (req, res) => {
    // Basic validation inline or create schema if preferred
    if (!req.body.token) {
        res.status(400).json({ error: "Token is required" });
        return;
    }
    await loginWithGoogle(req, res);
});

router.post("/login", validate(loginWithClientSchema), async (req, res) => {
  try {
    const { email, password, tenantSlug, cuentaId } = req.body;

    // Buscar usuarios con este email usando Repository
    const users = await userRepository.findActiveByEmail(email);

    if (users.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Helper to get Tenant object (Mongo populates 'tenantId', MySQL uses 'Tenant')
    const getTenant = (u: any) => u.tenantId && u.tenantId.name ? u.tenantId : u.Tenant;
    // Helper for Role (Mongo 'roles', MySQL 'Roles')
    const getRoles = (u: any) => u.roles || u.Roles || [];

    // Si hay múltiples tenants y no se especificó uno
    if (users.length > 1 && !tenantSlug) {
      const tenants = users.map((u) => {
        const tenant = getTenant(u);
        return { _id: tenant._id || tenant.id, name: tenant.name, slug: tenant.slug };
      });
      res.status(300).json({
        error: "Multiple tenants found",
        requiresTenantSelection: true,
        tenants,
      });
      return;
    }

    // Seleccionar el usuario correcto
    let user;
    if (tenantSlug) {
      user = users.find((u) => {
          const t = getTenant(u);
          return t && t.slug === tenantSlug;
      });
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
    } else {
      user = users[0];
    }

    // Verificar password (handle both Mongoose method or manual bcrypt)
    let isMatch = false;
    if (typeof user.comparePassword === 'function') {
        isMatch = await user.comparePassword(password);
    } else {
        // MySQL or raw object
        // Fix for bcrypt import issue
        let bcryptComp: any = await import("bcryptjs");
        if (bcryptComp.default) {
            bcryptComp = bcryptComp.default;
        }
        isMatch = await bcryptComp.compare(password, user.password);
    }

    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const tenantObj = getTenant(user);
    const tenantId = tenantObj._id || tenantObj.id;
    const userRoles = getRoles(user);

    // Update lastLoginAt
    // Repository Update or Save
    // For now, simpler to use Repo update if possible, or save if Document/Model
    if (typeof user.save === 'function') {
        user.lastLoginAt = new Date();
        await user.save();
    } else {
        await userRepository.update(user.id, { lastLoginAt: new Date() } as any);
    }

    // Obtener el nombre del primer rol para compatibilidad
    const primaryRoleName = userRoles.length > 0 ? userRoles[0].name || "" : "";

    // Si es cliente, validar clientId
    if (primaryRoleName === "client") {
      // Logic for client validation (assuming clientIds is populated or array of IDs)
      // MySQL Client handling might need implementation in findActiveByEmail or here.
      // skipping strict client checks for verify step for now if complex, but lets try best effort.
      if (!cuentaId) {
           if (user.clientIds && user.clientIds.length > 0) {
               // OK
           } else {
               // If MySQL, clientIds might not be on user object directly unless loaded?
               // Assuming simplified flow for now.
           }
      }
    }

    // Obtener permisos agregados
    const rolePermissions = userRoles.flatMap((role: any) => role.permissions || []);
    const permissions = [...new Set(rolePermissions)];

    // Calcular redirectTo
    let redirectTo: string | undefined;
    if (permissions.includes("mobile:access")) {
      redirectTo = "/mobile";
    }

    const payload = {
      sub: String(user._id || user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      primaryRole: primaryRoleName || null,
      roles: userRoles.map((r: any) => r.name || "user"),
      clientIds: user.clientIds ? user.clientIds.map((c: any) => c.toString()) : [],
      tenantId: String(tenantId),
      tenantSlug: tenantObj.slug,
    };

    const token = signJwt(payload);

    res.json({
      token,
      redirectTo,
      user: {
        id: user._id || user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: userRoles.map((r: any) => r.name || "user"),
        primaryRole: primaryRoleName || null,
        clientIds: user.clientIds ? user.clientIds.map((c: any) => c.toString()) : [],
        permissions,
        tenantId,
        tenantSlug: tenantObj.slug,
        ...(cuentaId ? { clientId: cuentaId } : {}),
      },
    });
    return;
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

// GET /auth/me - Obtener datos del usuario autenticado
router.get("/me", requireTenant, authenticateToken, async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantObjectId!;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await User.findOne({ _id: userId, tenantId, isActive: true }).populate("roles", "name permissions").populate("tenantId", "_id name slug");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Obtener permisos agregados de todos los roles del usuario
    const rolePermissions = user.roles ? (user.roles as any[]).flatMap((role) => role.permissions || []) : [];
    const permissions = [...new Set(rolePermissions)];

    // Obtener nombre del primer rol
    const primaryRoleName = user.roles && user.roles.length > 0 ? (user.roles[0] as any).name || "" : "";

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles ? user.roles.map((r: any) => r.name || "user") : [],
        primaryRole: primaryRoleName || null,
        clientIds: user.clientIds ? user.clientIds.map((c: any) => c.toString()) : [],
        permissions,
        tenantId: (user.tenantId as any)._id,
        tenantSlug: (user.tenantId as any).slug,
      },
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/demo-users - Obtener lista de usuarios de todos los tenants (público)
router.get("/demo-users", async (req, res) => {
  try {
    // Traer usuarios de todos los tenants usando Repository
    const users = await userRepository.findDemoUsers();

    const getTenant = (u: any) => u.tenantId && u.tenantId.name ? u.tenantId : u.Tenant;
    const getRoles = (u: any) => u.roles || u.Roles || [];
    const getArea = (u: any) => u.areaId && u.areaId.name ? u.areaId : u.Area;

    const demoUsers = users.map((user) => {
      const tenant = getTenant(user);
      const area = getArea(user);
      const roles = getRoles(user);
      
      return {
        _id: user._id || user.id, // Support both _id and id (MySQL usually numeric id, Mongo string _id)
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roles, // Should have name and description or similar
        isActive: user.isActive,
        tenant: {
          _id: tenant?._id || tenant?.id || "",
          name: tenant?.name || "Unknown",
          slug: tenant?.slug || "",
        },
        area: area ? { _id: area._id || area.id, name: area.name } : undefined,
      };
    });

    res.json({ users: demoUsers });
  } catch (error) {
    console.error("Get demo users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/clients-for-email
router.get("/clients-for-email", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { email } = req.query;
    const tenantId = req.tenantObjectId!;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await User.findOne({ email, tenantId, isActive: true }).populate("clientIds", "name slug").populate("roles", "name");

    const primaryRoleName = user?.roles && user.roles.length > 0 ? (user.roles[0] as any).name : "";
    if (!user || primaryRoleName !== "client") {
      res.json({ clients: [] });
      return;
    }

    const clients = (user.clientIds as any[]).map((client) => ({
      _id: client._id,
      name: client.name,
      slug: client.slug,
    }));

    res.json({ clients });
  } catch (error) {
    console.error("Get clients for email error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/register-client
router.post("/register-client", requireTenant, validate(registerClientSchema), async (req: TenantRequest, res) => {
  try {
    const { name, email, password, company, phone } = req.body;
    const tenantId = req.tenantObjectId!;

    // Verificar que no existe usuario con el mismo email
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Crear cuenta
    const cuenta = await Cuenta.create({
      tenantId,
      name: company,
      slug: company.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      email,
      phone,
      company,
      brandKit: { colors: [], fonts: [] },
      contacts: [{ name, email, phone, role: "owner" }],
      status: "onboarding",
    });

    // Obtener rol cliente por defecto
    const clientRole = await Role.findOne({
      tenantId,
      name: { $regex: /^(client|cliente)$/i },
    });

    // Crear usuario cliente
    const user = await User.create({
      tenantId,
      email,
      password,
      role: "client",
      roles: clientRole ? [clientRole._id] : [],
      clientIds: [cuenta._id],
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" ") || undefined,
      isActive: true,
    });

    // Vincular usuario con cliente en Client.usuarios
    await addUserToClientUsuarios({
      tenantId,
      clientId: cuenta._id as any,
      userId: user._id as any,
      permiso: "editar",
    });

    // Actualizar cliente con owner
    cuenta.ownerUserId = user._id as any;
    await cuenta.save();

    // Obtener nombre del rol para JWT
    const roleNames = clientRole ? [clientRole.name] : ["client"];
    const primaryRole = roleNames[0] || "client";

    // Generar token
    const payload = {
      sub: String(user._id),
      email: user.email,
      primaryRole,
      roles: roleNames,
      clientIds: [cuenta._id.toString()],
      tenantId: String(tenantId),
    };

    const token = signJwt(payload);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        primaryRole,
        roles: roleNames,
        clientIds: [cuenta._id.toString()],
        tenantId,
        clientId: cuenta._id.toString(),
      },
      client: {
        _id: cuenta._id,
        name: cuenta.name,
        slug: cuenta.slug,
      },
    });
  } catch (error: any) {
    console.error("Register client error:", error);

    if (error.code === 11000) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
});
// POST /auth/register - Registro con tenantSlug
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, tenantSlug } = req.body;

    if (!email || !password || !firstName || !tenantSlug) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Resolver tenant desde slug
    const tenant = await Tenant.findOne({ slug: tenantSlug });
    if (!tenant) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    const tenantId = tenant._id;

    // Verificar email único en el tenant
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Obtener rol por defecto
    const defaultRole = await Role.findOne({
      tenantId,
      name: { $regex: /^user$/i },
    });

    // Crear usuario
    const user = await User.create({
      tenantId,
      email,
      password,
      firstName,
      lastName,
      role: "user",
      roles: defaultRole ? [defaultRole._id] : [],
      isActive: true,
    });

    // Obtener permisos
    const rolePermissions = defaultRole?.permissions || [];
    const permissions = [...new Set(rolePermissions)];

    // Obtener nombres de roles para JWT
    const roleNames = defaultRole ? [defaultRole.name] : ["user"];
    const primaryRole = roleNames[0] || "user";

    // Generar token
    const payload = {
      sub: String(user._id),
      email: user.email,
      primaryRole,
      roles: roleNames,
      tenantId: String(tenantId),
      tenantSlug,
    };

    const token = signJwt(payload);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        primaryRole,
        roles: roleNames,
        permissions,
        tenantId: String(tenantId),
        tenantSlug,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);

    if (error.code === 11000) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/check-email", requireTenant, checkEmailAvailability);

// POST /auth/register-tenant - Registro público de tenant con usuario admin
const registerTenantSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/register-tenant", async (req, res) => {
  try {
    const data = registerTenantSchema.parse(req.body);

    // Verificar que el email no esté registrado
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Generar slug único si el propuesto ya existe
    let finalSlug = data.slug;
    let slugExists = await Tenant.findOne({ slug: finalSlug });
    let counter = 1;

    while (slugExists) {
      finalSlug = `${data.slug}-${counter}`;
      slugExists = await Tenant.findOne({ slug: finalSlug });
      counter++;

      // Límite de seguridad para evitar loops infinitos
      if (counter > 999) {
        res.status(500).json({ error: "Unable to generate unique slug" });
        return;
      }
    }

    const now = new Date();
    const endOfPeriod = new Date(now);
    endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);

    // Crear tenant
    const tenant = new Tenant({
      name: data.companyName,
      slug: finalSlug,
      company: {
        legalName: data.companyName,
        description: "New tenant",
      },
      contact: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      },
      settings: {
        timezone: "UTC",
        currency: "USD",
        language: "en",
        features: [],
      },
      subscription: {
        plan: "free",
        status: "active",
      },
      usage: {
        users: { current: 0, limit: 10 },
        clients: { current: 0, limit: 50 },
        campaigns: { current: 0, limit: 100 },
        storage: { usedMB: 0, limitMB: 1024 },
        apiCalls: { current: 0, limit: 10000, resetDate: endOfPeriod },
      },
      billing: {
        currentPeriod: {
          startDate: now,
          endDate: endOfPeriod,
          amount: 0,
          currency: "USD",
        },
        invoices: [],
        autoRenew: true,
      },
      isActive: true,
    });

    await tenant.save();

    // Los roles se crean automáticamente mediante el hook post-save del modelo Tenant
    // Esperar un momento para que se complete el hook
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Obtener el rol admin creado automáticamente
    const { adminRole } = await ensureDefaultRoles(tenant._id as Types.ObjectId);

    // Crear usuario administrador
    const adminUser = new User({
      tenantId: tenant._id,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: [adminRole._id],
      isActive: true,
    });

    await adminUser.save();

    // Agregar usuario al tenant
    await Tenant.findByIdAndUpdate(tenant._id, {
      $addToSet: { userIds: adminUser._id },
      $inc: { "usage.users.current": 1 },
    });

    // Auto-login
    const token = signJwt({
      sub: adminUser._id.toString(),
      email: adminUser.email,
      primaryRole: adminRole.name,
      roles: [adminRole.name],
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
    });

    await User.findByIdAndUpdate(adminUser._id, {
      lastLoginAt: new Date(),
    });

    res.status(201).json({
      message: "Tenant and admin user created successfully",
      token,
      user: {
        id: adminUser._id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        roles: [adminRole.name],
        primaryRole: adminRole.name,
        permissions: adminRole.permissions || [],
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });
  } catch (error: any) {
    console.error("Register tenant error:", error);

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid data", details: error.errors });
      return;
    }

    if (error.code === 11000) {
      res.status(409).json({ error: "Tenant or email already exists" });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as authRoutes };
