import { env } from "../config/env.js";
import { IUserRepository } from "./interfaces/IUserRepository.js";
import { MongoUserRepository } from "./mongodb/MongoUserRepository.js";
import { MysqlUserRepository } from "./mysql/MysqlUserRepository.js";

import { ITenantRepository } from "./interfaces/ITenantRepository.js";
import { MongoTenantRepository } from "./mongodb/MongoTenantRepository.js";
import { MysqlTenantRepository } from "./mysql/MysqlTenantRepository.js";

let userRepository: IUserRepository;
let tenantRepository: ITenantRepository;

if (env.DB_CONNECTION === "mysql") {
  userRepository = new MysqlUserRepository();
  tenantRepository = new MysqlTenantRepository();
  console.log("[RepositoryFactory] Loading repositories for: mysql");
} else {
  userRepository = new MongoUserRepository();
  tenantRepository = new MongoTenantRepository();
  console.log("[RepositoryFactory] Loading repositories for: mongodb");
}

export { userRepository, tenantRepository };
