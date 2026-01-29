
import { Tenant } from "../models/mysql/Tenant.js";
import { User } from "../models/mysql/User.js";
import { Role } from "../models/mysql/Role.js";
import { Position } from "../models/mysql/Position.js";
import { Level } from "../models/mysql/Level.js";
import { Area } from "../models/mysql/Area.js";
import { env } from "../config/env.js";
import bcrypt from "bcryptjs";

export const seedMysql = async () => {
  console.log("🌱 Starting MySQL seed process...");

  try {
    // 1. Create Default Tenant
    const tenantSlug = env.SEED_TENANT_SLUG || "demo-tenant";
    let tenant = await Tenant.findOne({ where: { slug: tenantSlug } });

    if (!tenant) {
      console.log(`Creating tenant: ${tenantSlug}`);
      tenant = await Tenant.create({
        name: "Demo Tenant",
        slug: tenantSlug,
        domain: "demo.com",
        isSystem: false,
        isActive: true,
        company: { legalName: "Demo Corp" },
        contact: { firstName: "Admin", lastName: "E", email: env.SEED_ADMIN_EMAIL || "admin@example.com" },
        // ... other defaults
      });
    } else {
        console.log(`Tenant ${tenantSlug} already exists. ID: ${tenant.id}`);
    }

    if (!tenant || !tenant.id) {
        throw new Error("Failed to resolve Tenant ID during seeding.");
    }
    
    // 2. Create Roles for Tenant
    const rolesData = [
        { name: "Super Admin", isDefault: false, permissions: ["*"] },
        { name: "Admin", isDefault: false, permissions: ["*"] },
        { name: "User", isDefault: true, permissions: ["read:own"] }
    ];

    const rolesMap: Record<string, Role> = {};

    for (const r of rolesData) {
        let role = await Role.findOne({ where: { tenant_id: tenant.id, name: r.name } });
        if (!role) {
             role = await Role.create({
                 tenant_id: tenant.id,
                 name: r.name,
                 isDefault: r.isDefault,
                 permissions: r.permissions
             });
             console.log(`Created role: ${r.name}`);
        }
        rolesMap[r.name] = role;
    }

    // 3. Create Super Admin User
    const adminEmail = env.SEED_ADMIN_EMAIL || "admin@example.com";
    let adminUser = await User.findOne({ where: { email: adminEmail } });

    if (!adminUser) {
        const hashedPassword = await bcrypt.hash(env.SEED_ADMIN_PASS || "admin123", 12);
        
        // Ensure role exists
        const adminRole = rolesMap["Super Admin"] || rolesMap["Admin"];
        
        adminUser = await User.create({
            email: adminEmail,
            password: hashedPassword,
            firstName: "Super",
            lastName: "Admin",
            tenantId: tenant.id, // ID is number now
            isActive: true
        });
        
        if (adminRole) {
            // Add role association
            // @ts-ignore
            await adminUser.addRole(adminRole);
        }
        console.log(`Created admin user: ${adminEmail}`);
    } else {
        console.log(`Admin user ${adminEmail} already exists.`);
    }

    // 4. Create Areas, Positions, Levels
    const areas = ["IT", "HR", "Sales"];
    for (const name of areas) {
        await Area.findOrCreate({
            where: { tenant_id: tenant.id, name },
            defaults: { tenant_id: tenant.id, name }
        });
    }
    
    const positions = ["Developer", "Manager", "Analyst"];
    for (const name of positions) {
        await Position.findOrCreate({
            where: { tenant_id: tenant.id, name },
            defaults: { tenant_id: tenant.id, name }
        });
    }
    
    const levels = ["Junior", "Senior", "Lead"];
    for (const name of levels) {
        await Level.findOrCreate({
            where: { tenant_id: tenant.id, name },
            defaults: { tenant_id: tenant.id, name, type: 'general' }
        });
    }

    console.log("✅ MySQL seed completed successfully");

  } catch (error) {
    console.error("❌ MySQL seed failed:", error);
  }
};
