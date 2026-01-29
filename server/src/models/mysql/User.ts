import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/sequelize-instance.js";

export class User extends Model {
  declare id: number;
  declare email: string;
  declare password: string;
  declare firstName: string;
  declare lastName: string;
  declare tenantId: number;
  declare positionId: number;
  declare levelId: number;
  declare areaId: number;
  
  declare isActive: boolean;
  declare lastLoginAt: Date;
  
  // Timestamps
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  
  // For compatibility with Mongoose interface (simulated)
  public get _id() { return this.id; }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Note: Scope by tenantId might be needed, but simple unique for now
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tenantId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'tenant_id',
    },
    // Foreign Keys
    positionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'position_id',
    },
    levelId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'level_id',
    },
    areaId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'area_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
  }
);
