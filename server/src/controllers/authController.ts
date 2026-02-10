import { Request, Response } from "express";
import { userRepository } from "../repository/index.js";
import { env } from "../config/env.js";
import { Role } from "../models/Role.js";
import { RegisterInput } from "../validators/authSchemas.js";
import { signJwt } from "../utils/jwt.js";
import { TenantRequest } from "../middleware/tenant.js";

export const register = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password }: RegisterInput = req.body;
    const tenantId = req.tenantObjectId!;

    // Verificar si el usuario ya existe en este tenant
    const existingUser = await userRepository.findByEmailAndTenantId(email, String(tenantId));
    if (existingUser) {
      res.status(409).json({ error: "Este correo ya está registrado en este tenant" });
      return;
    }

    // Obtener rol por defecto para el tenant (Only for MongoDB for now, pending MySQL impl)
    let defaultRole;
    if (env.DB_CONNECTION === 'mongodb') {
        defaultRole = await Role.findOne({ tenantId, isDefault: true });
        if (!defaultRole) {
            console.warn(`[Register] No default role found for tenant: ${tenantId}`);
        } else {
            console.log(`[Register] Assigning default role: ${defaultRole.name} (${defaultRole._id})`);
        }
    }


    const roleIds = defaultRole ? [defaultRole._id] : [];

    // Crear nuevo usuario
    const user = await userRepository.create({
      firstName,
      lastName,
      email,
      password, // Note: Repository impl or pre-save hook should handle hashing. Mongoose does it. MySQL hooks?
      roles: roleIds,
      tenantId,
      isActive: true,
    }); // returns the created user

    // await user.save(); // Repository create calls save/create

    // Obtener permisos agregados de todos los roles del usuario
    // For now, if MySQL, we skip population or implement findByIdWithRoles.
    // If MongoDB, we can partly rely on populated result or fetch again.
    let rolePermissions: any[] = [];

    if (env.DB_CONNECTION === 'mongodb') {
      // Direct mongoose usage for legacy compat or add this to MongoRepository
       const userWithRoles = await import("../models/User.js").then(m => m.User.findById(user._id || user.id).populate('roles', 'permissions'));
       rolePermissions = userWithRoles?.roles ?
         (userWithRoles.roles as any[]).flatMap(role => role.permissions || []) : [];
    }


    // Eliminar duplicados
    const permissions = [...new Set(rolePermissions)];

    // Generar JWT con nombres de roles
    const roleNames = defaultRole ? [defaultRole.name] : [];
    const primaryRole = roleNames.length > 0 ? roleNames[0] : null;

    const payload = {
      sub: String(user._id || user.id),
      email: user.email,
      primaryRole,
      roles: roleNames,
      tenantId: String(tenantId),
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = signJwt(payload);

    // Respuesta exitosa (sin password)
    res.status(201).json({
      token,
      user: {
          id: user._id || user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleIds.map(id => id.toString()),
        permissions,
        tenantId,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    
    // Error de duplicado (por si el índice único falla)
    if (error.code === 11000) {
      res.status(409).json({ error: "Este correo ya está registrado en este tenant" });
      return;
    }
    
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, tenantSlug, cuentaId } = req.body;

    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const verificationResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    
    if (!verificationResponse.ok) {
       res.status(401).json({ error: "Invalid Google token" });
       return;
    }
    
    const payload = await verificationResponse.json();
    
    // Verify audience (Client ID)
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        // Checking against multiple client IDs if needed (e.g. web, android, ios)
        // For now strict check
        console.warn("Google token audience mismatch", payload.aud, process.env.GOOGLE_CLIENT_ID);
        // Allow if it matches one of valid clients (optional) or just fail
        // res.status(401).json({ error: "Invalid token audience" });
        // return; 
    }

    const email = payload.email;

    if (!email) {
      res.status(400).json({ error: "Email not found in Google token" });
      return;
    }

    // Buscar usuarios con este email usando Repository
    let users = await userRepository.findActiveByEmail(email);

    // [AUTO-REGISTER START]
    if (users.length === 0) {
        console.log(`[GoogleLogin] User not found for ${email}. Attempting auto-registration.`);
        
        // 1. Determine target tenant
        // Priority: provided slug > env.SEED_TENANT_SLUG > "demo-tenant"
        const targetSlug = tenantSlug || env.SEED_TENANT_SLUG || "demo-tenant";
        
        // We need to import Tenant model dynamically or use repository if available.
        // Assuming strict Mongoose for now based on file context.
        const { Tenant } = await import("../models/Tenant.js");
        const defaultTenant = await Tenant.findOne({ slug: targetSlug });

        if (!defaultTenant) {
            console.error(`[GoogleLogin] Default tenant '${targetSlug}' not found.`);
            res.status(401).json({ error: "User not found and default tenant unavailable for registration." });
            return;
        }

        // 2. Determine default role
        const { Role } = await import("../models/Role.js");
        // Try to find a role named "user" or "admin" (for dev convenience? maybe just "user")
        // Or check if there is an isDefault role.
        let defaultRole = await Role.findOne({ tenantId: defaultTenant._id, name: "user" });
        if (!defaultRole) {
             defaultRole = await Role.findOne({ tenantId: defaultTenant._id, isDefault: true });
        }
        // Fallback to creating a basic role if absolutely nothing exists? 
        // Better to fail safe or pick first available role?
        // Let's pick 'admin' if 'user' doesn't exist AND it's the 'demo-tenant' (dev mode convenience)
        if (!defaultRole && targetSlug === 'demo-tenant') {
             defaultRole = await Role.findOne({ tenantId: defaultTenant._id, name: 'admin' });
        }

        if (!defaultRole) {
             console.error(`[GoogleLogin] No valid role found for new user in ${targetSlug}`);
             res.status(401).json({ error: "Registration failed: No default role configured." });
             return;
        }

        // 3. Create User
        // Split name
        const displayName = payload.name || "";
        const [firstName = "New", ...rest] = displayName.split(" ");
        const lastName = rest.length > 0 ? rest.join(" ") : "User";

        try {
            const newUser = await userRepository.create({
                firstName,
                lastName,
                email,
                password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Dummy password
                roles: [defaultRole._id],
                tenantId: defaultTenant._id as any,
                isActive: true
            });
            console.log(`[GoogleLogin] Auto-registered ${email} in ${targetSlug}`);
            
            // Re-fetch to ensure consistency with login flow expectations (population etc)
            users = [newUser]; 
        } catch (err) {
            console.error("[GoogleLogin] Auto-registration failed", err);
             res.status(500).json({ error: "Error creating user account." });
             return;
        }
    }
    // [AUTO-REGISTER END]

    if (users.length === 0) {
      res.status(401).json({ error: "User not found" });
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
        res.status(401).json({ error: "Invalid credentials (tenant mismatch)" });
        return;
      }
    } else {
      user = users[0];
    }
    
    const tenantObj = getTenant(user);
    const tenantId = tenantObj._id || tenantObj.id;
    const userRoles = getRoles(user);

    // Update lastLoginAt
    if (typeof user.save === 'function') {
        user.lastLoginAt = new Date();
        await user.save();
    } else {
        await userRepository.update(user.id, { lastLoginAt: new Date() } as any);
    }

    // Obtener el nombre del primer rol para compatibilidad
    const primaryRoleName = userRoles.length > 0 ? userRoles[0].name || "" : "";

    // Obtener permisos agregados
    const rolePermissions = userRoles.flatMap((role: any) => role.permissions || []);
    const permissions = [...new Set(rolePermissions)];

    // Calcular redirectTo
    let redirectTo: string | undefined;
    if (permissions.includes("mobile:access")) {
      redirectTo = "/mobile";
    }

    const jwtPayload = {
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

    const jwtToken = signJwt(jwtPayload);

    res.json({
      token: jwtToken,
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

  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkEmailAvailability = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.query;
    const tenantId = req.tenantObjectId!;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const existingUser = await userRepository.findByEmailAndTenantId(email, String(tenantId));
    
    res.json({ available: !existingUser });
  } catch (error) {
    console.error("Check email availability error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};