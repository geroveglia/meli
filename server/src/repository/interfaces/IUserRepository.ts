import { IRepository } from "./IRepository.js";
import { IUser } from "../../models/User.js"; // Importing the interface from Mongoose model for now to share user shape, or we define a generic User Domain Entity.

// For now, let's assume T is a generic User type or we stick with the shape defined in models.
// To make it truly agnostic, we should probably define a Domain Entity, but to fit the request "Abstract interface", we will use a generic or any for now until we unify types.

export interface IUserRepository extends IRepository<any> {
    findByEmail(email: string): Promise<any | null>;
    findByEmailAndTenantId(email: string, tenantId: string): Promise<any | null>;
    findActiveByEmail(email: string): Promise<any[]>;
    findDemoUsers(): Promise<any[]>;
}
