import { IRepository } from "./IRepository.js";

export interface ITenantRepository extends IRepository<any> {
  findBySlug(slug: string): Promise<any | null>;
  findById(id: string): Promise<any | null>; // Ensure we have this explicitly if needed, though IRepository might cover generic
}
