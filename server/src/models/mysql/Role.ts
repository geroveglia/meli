import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/sequelize-instance.js";

export class Role extends Model {
  public id!: number;
  public tenant_id!: string; // Foreign key to Tenant (kept as string to match User model convention)
  public name!: string;
  public description?: string;
  public permissions!: string[];
  public isDefault!: boolean;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public get _id() { return this.id; }
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    permissions: { 
        type: DataTypes.JSON, 
        defaultValue: [] 
    },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName: "roles",
    indexes: [
      { fields: ['tenant_id', 'name'], unique: true },
      // Check partial index support in mysql? standard unique index works if not null. 
      // Emulating { tenantId: 1, isDefault: 1 } where isDefault=true is tricky in basic MySQL unique constraint.
      // We'll skip the partial unique constraint for now or do it in application logic.
    ]
  }
);
