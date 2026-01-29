import { sequelize } from "./sequelize-instance.js";
import { env } from "./env.js";

// Re-export sequelize for convenience if needed, but models should import from instance directly.
export { sequelize };

import { Tenant } from "../models/mysql/Tenant.js";
import { User } from "../models/mysql/User.js";
import { Role } from "../models/mysql/Role.js";
import { Client } from "../models/mysql/Client.js";
import { Position } from "../models/mysql/Position.js";
import { Level } from "../models/mysql/Level.js";
import { Area } from "../models/mysql/Area.js";
import { DataTypes } from "sequelize";

// Define Associations
// Tenant
Tenant.hasMany(User, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });

Tenant.hasMany(Role, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });
Role.belongsTo(Tenant, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });

Tenant.hasMany(Client, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });
Client.belongsTo(Tenant, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });

// Define UserRoles explicitly if needed, or let Sequelize create it.
// To fix "Table UserRoles doesn't exist", we force it here or ensure name matches.
const UserRoles = sequelize.define('UserRoles', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER.UNSIGNED,
    role_id: DataTypes.INTEGER.UNSIGNED
}, { timestamps: true });

// User <> Role (Many-to-Many)
User.belongsToMany(Role, { through: UserRoles, foreignKey: 'user_id', otherKey: 'role_id' });
Role.belongsToMany(User, { through: UserRoles, foreignKey: 'role_id', otherKey: 'user_id' });

// User <> Position/Level/Area
User.belongsTo(Position, { foreignKey: 'position_id' });
User.belongsTo(Level, { foreignKey: 'level_id' });
User.belongsTo(Area, { foreignKey: 'area_id' });

export const connectMysql = async () => {
  try {
    await sequelize.authenticate();
    console.log('[db] ✅ MySQL Connected');
    // Basic sync for development - in production use migrations
    if (env.NODE_ENV === 'development') {
        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('[db] MySQL Models Synced');
    }
  } catch (error) {
    console.error('[db] ❌ Unable to connect to MySQL:', error);
  }
};
