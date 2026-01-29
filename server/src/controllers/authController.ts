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