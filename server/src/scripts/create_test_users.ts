
import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { Tenant } from "../models/Tenant.js";
import { Cuenta } from "../models/Cuenta.js";
import { refreshAccessToken } from "../services/meliService.js";
import fs from "fs";
import path from "path";

async function createTestUsers() {
    try {
        await connectDB();
        console.log("🔌 Connected to DB");

        // 1. Find a valid token
        console.log("🔍 Searching for a connected account...");
        
        let accessToken = "";
        let siteId = "MLA"; // Default to Argentina

        // Try to find in Cuentas first
        const cuenta = await Cuenta.findOne({ "mercadolibre.accessToken": { $exists: true } });
        if (cuenta && cuenta.mercadolibre) {
            console.log(`✅ Found connected Cuenta: ${cuenta.name}`);
            accessToken = cuenta.mercadolibre.accessToken;
            if (cuenta.mercadolibre.expiresAt && cuenta.mercadolibre.expiresAt < Date.now()) {
                 console.log("🔄 Token expired, refreshing...");
                 const newTokens = await refreshAccessToken(cuenta.mercadolibre.refreshToken);
                 accessToken = newTokens.accessToken;
                 cuenta.mercadolibre.accessToken = newTokens.accessToken;
                 cuenta.mercadolibre.expiresAt = newTokens.expiresAt.getTime();
                 await cuenta.save();
            }
        } else {
            // Try Tenant
            const tenant = await Tenant.findOne({ "mercadolibre.accessToken": { $exists: true } });
            if (tenant && tenant.mercadolibre) {
                 console.log(`✅ Found connected Tenant: ${tenant.name}`);
                 accessToken = tenant.mercadolibre.accessToken;
                 if (tenant.mercadolibre.expiresAt && tenant.mercadolibre.expiresAt.getTime() < Date.now()) {
                    console.log("🔄 Token expired, refreshing...");
                    const newTokens = await refreshAccessToken(tenant.mercadolibre.refreshToken);
                    accessToken = newTokens.accessToken;
                    tenant.mercadolibre.accessToken = newTokens.accessToken;
                    tenant.mercadolibre.expiresAt = newTokens.expiresAt;
                    await tenant.save();
               }
            }
        }

        if (!accessToken) {
            console.error("❌ No connected MercadoLibre account found in DB. Please connect an account first via the UI.");
            process.exit(1);
        }

        const usersList = [];

        console.log("🚀 Creating 2 Test Users on MercadoLibre (Site: MLA)...");

        for (let i = 1; i <= 2; i++) {
            const response = await fetch("https://api.mercadolibre.com/users/test_user", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ site_id: siteId })
            });

            if (!response.ok) {
                const err = await response.text();
                console.error(`❌ Failed to create Test User ${i}:`, err);
                continue;
            }

            const data = await response.json();
            console.log(`\n🎉 Test User ${i} Created!`);
            
            usersList.push({
                id: data.id,
                nickname: data.nickname,
                password: data.password,
                site_id: data.site_id
            });
        }

        const outputPath = path.join(process.cwd(), "test_users_credentials.json");
        fs.writeFileSync(outputPath, JSON.stringify(usersList, null, 2));
        console.log(`\n✅ Credentials saved to ${outputPath}`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

// Run
createTestUsers();
