import { ITenantRepository } from "../interfaces/ITenantRepository.js";
import { Tenant } from "../../models/Tenant.js";

export class MongoTenantRepository implements ITenantRepository {
  async create(data: any): Promise<any> {
    return await Tenant.create(data);
  }

  async findAll(query?: any): Promise<any[]> {
    return await Tenant.find(query || {});
  }

  async findById(id: string): Promise<any | null> {
    return await Tenant.findById(id);
  }

  async update(id: string, data: any): Promise<any | null> {
    return await Tenant.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Tenant.findByIdAndDelete(id);
    return !!result;
  }

  async findBySlug(slug: string): Promise<any | null> {
    return await Tenant.findOne({ slug });
  }
}
