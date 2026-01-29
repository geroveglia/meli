import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/sequelize-instance.js";

export class Area extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description: string;
  
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public get _id() { return this.id; }
}

Area.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: "areas",
    indexes: [
        { fields: ['tenant_id', 'name'], unique: true }
    ]
  }
);
