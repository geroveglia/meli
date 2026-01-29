import { IUserRepository } from "../interfaces/IUserRepository.js";
import { User } from "../../models/mysql/User.js";

export class MysqlUserRepository implements IUserRepository {
  async create(data: any): Promise<any> {
    // Adapter to match Mongoose inputs to Sequelize
    // e.g. mapping `_id` to `id` if needed, but here we just pass data
    const user = await User.create(data);
    return user; 
  }

  async findById(id: string): Promise<any | null> {
    const user = await User.findByPk(id);
    return user;
  }

  async findByEmail(email: string): Promise<any | null> {
    return await User.findOne({ where: { email } });
  }

  async findByEmailAndTenantId(email: string, tenantId: string): Promise<any | null> {
    return await User.findOne({ where: { email, tenant_id: tenantId } });
  }

  async findActiveByEmail(email: string): Promise<any[]> {
      // Need to include Roles and Tenant
      // Dynamic import to avoid circular dep issues in some contexts or ensure loaded
      const { Role } = await import("../../models/mysql/Role.js");
      const { Tenant } = await import("../../models/mysql/Tenant.js");
      
      const users = await User.findAll({ 
          where: { email, isActive: true },
          include: [
              { model: Role, through: { attributes: [] } }, // Many-to-Many
              { model: Tenant }
          ]
      });
      return users;
  }

  async findDemoUsers(): Promise<any[]> {
     const { Role } = await import("../../models/mysql/Role.js");
     const { Tenant } = await import("../../models/mysql/Tenant.js");
     const { Area } = await import("../../models/mysql/Area.js");

     const users = await User.findAll({
         where: { isActive: true },
         include: [
             { model: Role, through: { attributes: [] } },
             { model: Tenant },
             { model: Area }
         ],
         limit: 200,
         order: [
             [Tenant, 'name', 'ASC'],
             ['email', 'ASC']
         ]
     });
     return users;
  }

  async update(id: string, data: any): Promise<any | null> {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update(data);
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const count = await User.destroy({ where: { id } });
    return count > 0;
  }
}
