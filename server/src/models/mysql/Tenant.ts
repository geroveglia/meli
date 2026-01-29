import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/sequelize-instance.js";

export class Tenant extends Model {
  declare id: number;
  declare name: string;
  declare slug: string;
  declare domain: string;
  declare isSystem: boolean;
  declare isActive: boolean;
  
  // Nested objects as JSON
  declare company: any;
  declare contact: any;
  declare settings: any;
  declare subscription: any;
  declare usage: any;
  declare billing: any;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public get _id() { return this.id; }
}

Tenant.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    // For compatibility, if we really wanted to use Mongo IDs we'd use CHAR(24).
    // But for a new SQL implementation, auto-inc is standard.
    // The `User.tenantId` is STRING. So we will store the stringified ID there.
    // If we want to use this ID in User.tenantId, we'll cast it to string.

    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    domain: { type: DataTypes.STRING, allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

    // JSON Fields for nested data
    company: { type: DataTypes.JSON, defaultValue: {} },
    contact: { type: DataTypes.JSON, defaultValue: {} },
    settings: { type: DataTypes.JSON, defaultValue: {} },
    subscription: { type: DataTypes.JSON, defaultValue: {} },
    billing: { type: DataTypes.JSON, defaultValue: {} },
    usage: { type: DataTypes.JSON, defaultValue: {} },
  },
  {
    sequelize,
    tableName: "tenants",
    indexes: [
        { unique: true, fields: ['slug'] },
        { fields: ['domain'] },
        { fields: ['isActive'] }
    ]
  }
);
