import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/sequelize-instance.js";

export class Level extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description: string;
  declare type: string;
  declare position_id: number;
  
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public get _id() { return this.id; }
}

Level.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    type: { 
        type: DataTypes.ENUM('general', 'position-specific'), 
        defaultValue: 'general' 
    },
    position_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName: "levels",
    indexes: [
        // Composite unique index
        // Note: position_id might be null, unique constraint behavior with nulls varies.
        // In MySQL unique index allows multiple nulls.
        { fields: ['tenant_id', 'name', 'position_id'], unique: true }
    ]
  }
);
