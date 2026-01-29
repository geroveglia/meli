import { ITenantRepository } from "../interfaces/ITenantRepository.js";
import { sequelize } from "../../config/sequelize-instance.js"; 
// We will lazy load or dynamic import the model if needed to avoid circular, 
// strictly though the model should be imported from models/mysql/Tenant.ts
// But since models are loaded in sequelize.ts, we can import from the model file directly.
import { Tenant } from "../../models/mysql/Tenant.js";

export class MysqlTenantRepository implements ITenantRepository {
  async create(data: any): Promise<any> {
    return await Tenant.create(data);
  }

  async findAll(query?: any): Promise<any[]> {
    return await Tenant.findAll({ where: query });
  }

  async findById(id: string): Promise<any | null> {
    return await Tenant.findByPk(id);
  }

  async update(id: string, data: any): Promise<any | null> {
    const [affectedCount] = await Tenant.update(data, { where: { id } });
    if (affectedCount === 0) return null;
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
      const deleted = await Tenant.destroy({ where: { id } });
      return deleted > 0;
  }

  async findBySlug(slug: string): Promise<any | null> {
    return await Tenant.findOne({ where: { slug } });
  }
}
