import { IUserRepository } from "../interfaces/IUserRepository.js";
import { User, IUser } from "../../models/User.js";

export class MongoUserRepository implements IUserRepository {
  async create(data: Partial<IUser>): Promise<any> {
    const user = new User(data);
    return await user.save();
  }

  async findById(id: string): Promise<any | null> {
    return await User.findById(id);
  }

  async findByEmail(email: string): Promise<any | null> {
    return await User.findOne({ email });
  }

  async findByEmailAndTenantId(email: string, tenantId: string): Promise<any | null> {
      return await User.findOne({ email, tenantId });
  }

  async findActiveByEmail(email: string): Promise<any[]> {
      return await User.find({ email, isActive: true })
        .populate("roles", "name permissions")
        .populate("tenantId", "_id name slug");
  }

  async findDemoUsers(): Promise<any[]> {
      return await User.find({ isActive: true })
        .select("email firstName lastName role isActive tenantId areaId")
        .populate("roles", "name description")
        .populate("tenantId", "name slug")
        .populate("areaId", "name")
        .sort({ "tenantId.name": 1, email: 1 })
        .limit(200);
  }

  async update(id: string, data: Partial<IUser>): Promise<any | null> {
    return await User.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }
}
