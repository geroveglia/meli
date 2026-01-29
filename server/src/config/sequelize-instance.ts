import { Sequelize } from "sequelize";
import { env } from "./env.js";

export const sequelize = new Sequelize(
  env.MYSQL_DATABASE || 'database',
  env.MYSQL_USER || 'user',
  env.MYSQL_PASSWORD || 'password',
  {
    host: env.MYSQL_HOST || 'localhost',
    port: env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: env.NODE_ENV === 'development' ? console.log : false,
  }
);
