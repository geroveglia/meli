import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { Role } from "../models/Role.js";
import { Position } from "../models/Position.js";
import { Area } from "../models/Area.js";
import { Level } from "../models/Level.js";
import { Types } from "mongoose";

/* ----------------------------- helpers ----------------------------- */

async function ensureTenant({ name, slug }: { name: string; slug: string }) {
  let tenant = await Tenant.findOne({ slug });
  if (!tenant) {
    const now = new Date();
    const endOfPeriod = new Date(now);
    endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);

    tenant = new Tenant({
      name,
      slug,
      company: {
        legalName: name,
        description: "Demo tenant for testing purposes",
      },
      contact: {
        firstName: "Demo",
        lastName: "Contact",
        email: "contact@demo.com",
      },
      settings: {
        timezone: "UTC",
        currency: "USD",
        language: "en",
        features: [],
      },
      subscription: {
        plan: "pro",
        status: "active",
      },
      usage: {
        users: { current: 0, limit: 100 },
        clients: { current: 0, limit: 500 },
        campaigns: { current: 0, limit: 1000 },
        storage: { usedMB: 0, limitMB: 10240 },
        apiCalls: { current: 0, limit: 100000, resetDate: endOfPeriod.toISOString() },
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
    console.log(`✅ ensureTenant: created ${name} with _id: ${tenant._id}`);
  } else {
    console.log(`✔️ ensureTenant: exists ${name} with _id: ${tenant._id}`);
  }
  return tenant;
}

async function ensureRole(tenantId: Types.ObjectId, name: string, permissions: string[] = [], description = "") {
  let role = await Role.findOne({ tenantId, name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (!role) {
    role = await Role.create({
      tenantId,
      name,
      description: description || `${name} role`,
      permissions,
      isDefault: false,
    });
    console.log(`✅ Created role: ${name} (${permissions.length ? `perms: ${permissions.join(", ")}` : "sin permisos"})`);
  } else {
    const mustUpdate = permissions.length && (role.permissions.length !== permissions.length || permissions.some((p) => !role.permissions.includes(p)));
    if (mustUpdate) {
      role.permissions = permissions;
      await role.save();
      console.log(`♻️ Updated role: ${name} (perms sync)`);
    } else {
      console.log(`✔️ Role exists: ${name}`);
    }
  }
  return role;
}

async function ensureUser(params: { tenantId: Types.ObjectId; email: string; password: string; roleName: "superadmin" | "admin"; firstName: string; lastName: string; isActive?: boolean; positionId?: Types.ObjectId; levelId?: Types.ObjectId; areaId?: Types.ObjectId }) {
  const { tenantId, email, password, roleName, firstName, lastName, isActive = true, positionId, levelId, areaId } = params;

  let user = await User.findOne({ tenantId, email });
  let wantedRole: any = await Role.findOne({ tenantId, name: { $regex: new RegExp(`^${roleName}$`, "i") } });

  if (!wantedRole) {
    const perms = roleName === "superadmin" ? ["*"] : roleName === "admin" ? [] : [];
    wantedRole = await ensureRole(tenantId, roleName, perms, `${roleName} role`);
  }

  if (!user) {
    user = new User({
      tenantId,
      email,
      password,
      roles: [wantedRole._id],
      firstName,
      lastName,
      isActive,
      positionId,
      levelId,
      areaId,
    });
    await user.save();

    await Tenant.findByIdAndUpdate(tenantId, {
      $addToSet: { userIds: user._id },
      $inc: { "usage.users.current": 1 },
    });

    console.log(`✅ ensureUser: created ${email} [${roleName}]`);
  } else {
    let isModified = false;
    const userRoles = user.roles.map((r) => r.toString());

    if (!userRoles.includes(String(wantedRole._id))) {
      user.roles = [wantedRole._id];
      isModified = true;
    }
    if (user.firstName !== firstName) {
      user.firstName = firstName;
      isModified = true;
    }
    if (user.lastName !== lastName) {
      user.lastName = lastName;
      isModified = true;
    }
    if (typeof isActive === "boolean" && user.isActive !== isActive) {
      user.isActive = isActive;
      isModified = true;
    }
    if (positionId && String(user.positionId) !== String(positionId)) {
      user.positionId = positionId;
      isModified = true;
    }
    if (levelId && String(user.levelId) !== String(levelId)) {
      user.levelId = levelId;
      isModified = true;
    }
    if (areaId && String(user.areaId) !== String(areaId)) {
      user.areaId = areaId;
      isModified = true;
    }

    // NOTE: We intentionally do NOT reset the password here.
    // If the user changed their password (e.g. via forgot-password),
    // the seed should not overwrite it on every server restart.

    if (isModified) {
      await user.save();
      console.log(`♻️ ensureUser: updated ${email}`);
    } else {
      console.log(`✔️ ensureUser: exists ${email}`);
    }
  }
  return user!;
}

/* ----------------------------- seed main ---------------------------- */

export async function ensureSuperAdmin() {
  console.log("🔐 Ensuring superadmin user...");

  try {
    let superAdminTenant = await Tenant.findOne({ slug: "superadmin" });
    if (!superAdminTenant) {
      const now = new Date();
      const endOfPeriod = new Date(now);
      endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);

      superAdminTenant = new Tenant({
        name: "Platform Administration",
        slug: "superadmin",
        isSystem: true,
        company: {
          legalName: "Platform Administration",
          description: "System tenant for platform administration",
        },
        contact: {
          firstName: "Super",
          lastName: "Admin",
          email: "superadmin@example.com",
        },
        settings: {
          timezone: "UTC",
          currency: "USD",
          language: "en",
          features: [],
        },
        subscription: {
          plan: "enterprise",
          status: "active",
        },
        usage: {
          users: { current: 0, limit: 999999 },
          clients: { current: 0, limit: 999999 },
          campaigns: { current: 0, limit: 999999 },
          storage: { usedMB: 0, limitMB: 999999 },
          apiCalls: {
            current: 0,
            limit: 999999,
            resetDate: endOfPeriod,
          },
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
      await superAdminTenant.save();
      console.log(`✅ Created system tenant: superadmin with _id: ${superAdminTenant._id}`);
    } else {
      if (!superAdminTenant.isSystem) {
        superAdminTenant.isSystem = true;
        await superAdminTenant.save();
        console.log(`♻️ Updated existing tenant: superadmin to isSystem = true`);
      } else {
        console.log(`✔️ System tenant exists: superadmin with _id: ${superAdminTenant._id}`);
      }
    }

    const superAdminTenantId = new Types.ObjectId(superAdminTenant._id as any);

    // ---- ROLES ----
    await ensureRole(superAdminTenantId, "superadmin", ["*"], "Acceso total a toda la plataforma");
    await ensureRole(superAdminTenantId, "admin", [], "Administrador del tenant");

    // Remove legacy mobile roles if they exist
    await Role.deleteMany({
      tenantId: superAdminTenantId,
      name: { $in: ["Mobile-Coordinador", "Mobile-Colaborador", "Mobile - Coordinador", "Mobile - Colaborador"] }
    });
    console.log("🧹 Cleaned up mobile roles for superadmin");


    // ---- SUPERADMIN USER ----
    await ensureUser({
      tenantId: superAdminTenantId,
      email: "superadmin@example.com",
      password: "superadmin123",
      roleName: "superadmin",
      firstName: "Super",
      lastName: "Admin",
      isActive: true,
    });

    console.log("✅ SuperAdmin ready: superadmin@example.com / superadmin123");
    console.log("🏢 SuperAdmin tenant slug: superadmin (isSystem: true)");
    return true;
  } catch (error) {
    console.error("❌ Error ensuring superadmin:", error);
    throw error;
  }
}

export async function seedOnStart() {
  console.log("🌱 Starting seed process...");

  const tenantSlug = env.SEED_TENANT_SLUG;
  const adminEmail = env.SEED_ADMIN_EMAIL;
  const adminPassword = env.SEED_ADMIN_PASS;

  if (!tenantSlug || !adminEmail || !adminPassword) {
    console.warn("⚠️  Seed variables not fully configured, skipping seed");
    return;
  }

  try {
    console.log(`🌱 Ensuring seed data for tenant slug: ${tenantSlug}`);

    // [MODIFICADO] Ya no eliminamos a todos los usuarios para evitar que los clientes creados
    // desde el panel se borren al reiniciar el servidor.
    // await User.deleteMany({
    //   email: { $nin: ["superadmin@example.com", adminEmail] }
    // });
    // console.log(`🧹 Cleaned up all users except superadmin@example.com and ${adminEmail}`);

    // TENANT
    const tenant = await ensureTenant({
      name: "Demo Tenant",
      slug: tenantSlug,
    });
    const tenantId = new Types.ObjectId(tenant._id as any);
    console.log(`🏢 Tenant ready - Slug: ${tenantSlug}, ObjectId: ${String(tenantId)}`);

    // ---- ROLES ----
    const adminRole = await ensureRole(tenantId, "admin", [], "Administrador del tenant");

    // Remove legacy mobile roles if they exist
    await Role.deleteMany({
      tenantId,
      name: { $in: ["Mobile-Coordinador", "Mobile-Colaborador", "Mobile - Coordinador", "Mobile - Colaborador"] }
    });
    console.log("🧹 Cleaned up mobile roles for tenant");

    void adminRole;


    // ---- POSITIONS (CARGOS) ----
    console.log("📋 Seeding Positions...");
    let positionDirector = await Position.findOne({ tenantId, name: "Director" });
    if (!positionDirector) {
      positionDirector = await Position.create({
        tenantId,
        name: "Director",
        description: "Responsable de la dirección estratégica y toma de decisiones",
      });
      console.log(`✅ Created Position: Director (ID: ${positionDirector._id})`);
    } else {
      console.log(`✔️ Position exists: Director (ID: ${positionDirector._id})`);
    }

    let positionProductor = await Position.findOne({ tenantId, name: "Productor" });
    if (!positionProductor) {
      positionProductor = await Position.create({
        tenantId,
        name: "Productor",
        description: "Responsable de la producción y coordinación de proyectos",
      });
      console.log(`✅ Created Position: Productor (ID: ${positionProductor._id})`);
    } else {
      console.log(`✔️ Position exists: Productor (ID: ${positionProductor._id})`);
    }

    let positionEditor = await Position.findOne({ tenantId, name: "Editor" });
    if (!positionEditor) {
      positionEditor = await Position.create({
        tenantId,
        name: "Editor",
        description: "Responsable de la edición y creación de contenido",
      });
      console.log(`✅ Created Position: Editor (ID: ${positionEditor._id})`);
    } else {
      console.log(`✔️ Position exists: Editor (ID: ${positionEditor._id})`);
    }

    // ---- LEVELS (NIVELES) ----
    console.log("📊 Seeding Levels...");

    // General levels
    console.log("📊 Creating General Levels...");
    let levelTrainee = await Level.findOne({ tenantId, name: "Trainee", type: "general" });
    if (!levelTrainee) {
      levelTrainee = await Level.create({
        tenantId,
        name: "Trainee",
        description: "Nivel inicial en formación, aprendiendo los fundamentos del rol",
        type: "general",
      });
      console.log(`✅ Created General Level: Trainee (ID: ${levelTrainee._id})`);
    } else {
      console.log(`✔️ General Level exists: Trainee (ID: ${levelTrainee._id})`);
    }

    let levelJunior = await Level.findOne({ tenantId, name: "Junior", type: "general" });
    if (!levelJunior) {
      levelJunior = await Level.create({
        tenantId,
        name: "Junior",
        description: "Nivel de experiencia inicial con autonomía básica",
        type: "general",
      });
      console.log(`✅ Created General Level: Junior (ID: ${levelJunior._id})`);
    } else {
      console.log(`✔️ General Level exists: Junior (ID: ${levelJunior._id})`);
    }

    let levelMid = await Level.findOne({ tenantId, name: "Mid", type: "general" });
    if (!levelMid) {
      levelMid = await Level.create({
        tenantId,
        name: "Mid",
        description: "Nivel de experiencia intermedio con proyectos complejos",
        type: "general",
      });
      console.log(`✅ Created General Level: Mid (ID: ${levelMid._id})`);
    } else {
      console.log(`✔️ General Level exists: Mid (ID: ${levelMid._id})`);
    }

    let levelSenior = await Level.findOne({ tenantId, name: "Senior", type: "general" });
    if (!levelSenior) {
      levelSenior = await Level.create({
        tenantId,
        name: "Senior",
        description: "Nivel de experiencia avanzado con liderazgo y mentoría",
        type: "general",
      });
      console.log(`✅ Created General Level: Senior (ID: ${levelSenior._id})`);
    } else {
      console.log(`✔️ General Level exists: Senior (ID: ${levelSenior._id})`);
    }

    console.log(`📊 Levels Summary: 4 General Levels created`);

    // ---- AREAS ----
    console.log("🏢 Seeding Areas...");
    const areaNames = ["General", "Administración", "Operaciones"];
    const areaMap: Record<string, Types.ObjectId> = {};

    for (const name of areaNames) {
      let area = await Area.findOne({ tenantId, name });
      if (!area) {
        area = await Area.create({
          tenantId,
          name,
          description: `Area de ${name}`,
        });
        console.log(`✅ Created Area: ${name} (ID: ${area._id})`);
      } else {
        console.log(`✔️ Area exists: ${name} (ID: ${area._id})`);
      }
      areaMap[name] = area._id as Types.ObjectId;
    }

    // ---- ADMIN USER ----
    const adminUser = await ensureUser({
      tenantId,
      email: adminEmail,
      password: adminPassword,
      roleName: "admin",
      firstName: "Admin",
      lastName: "User",
      isActive: true,
      positionId: positionDirector._id as Types.ObjectId,
      levelId: levelSenior._id as Types.ObjectId,
      areaId: areaMap["Administración"],
    });

    console.log(`👤 Admin assigned: Position=${positionDirector.name}, Level=${levelSenior.name}, Area=Administración`);

    console.log("🎉 Seed completed successfully!");
    console.log(`👤 Admin: ${adminEmail} / ${adminPassword}`);
    console.log("🔐 Roles: admin");
  } catch (error) {
    console.error("❌ Seed error:", error);
    throw error;
  }
}

/* --------------------------- direct execution --------------------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  connectDB()
    .then(async () => {
      await ensureSuperAdmin();
      await seedOnStart();
      await disconnectDB();
      console.log("✅ Seed process completed");
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Seed process failed:", err);
      await disconnectDB().catch(() => {});
      process.exit(1);
    });
}
