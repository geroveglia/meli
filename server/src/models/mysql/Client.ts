import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/sequelize-instance.js";

export class Client extends Model {
  public id!: number;
  public tenant_id!: string;
  public owner_user_id!: string;
  public slug!: string;
  public name!: string;
  public email!: string;
  public phone?: string;
  public company?: string;
  public industry?: string;
  public website?: string;
  public status!: string;
  public favorite!: boolean;

  // JSON fields
  public socialMedia!: any;
  public brandKit!: any;
  public contacts!: any;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public get _id() { return this.id; }
}

Client.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    owner_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    slug: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    company: { type: DataTypes.STRING, allowNull: true },
    industry: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    
    status: { 
        type: DataTypes.ENUM('active', 'inactive', 'onboarding'), 
        defaultValue: 'onboarding' 
    },
    favorite: { type: DataTypes.BOOLEAN, defaultValue: false },

    socialMedia: { type: DataTypes.JSON, defaultValue: {} },
    brandKit: { type: DataTypes.JSON, defaultValue: { logos: [], documents: [], colors: [], fonts: [] } },
    contacts: { type: DataTypes.JSON, defaultValue: [] },
  },
  {
    sequelize,
    tableName: "clients",
    indexes: [
        { fields: ['tenant_id', 'email'], unique: true },
        { fields: ['tenant_id', 'slug'] }
    ]
  }
);
