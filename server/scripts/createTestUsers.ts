import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const MELI_API_URL = "https://api.mercadolibre.com";

const createTestUser = async (accessToken: string, siteId: string) => {
    const response = await fetch(`${MELI_API_URL}/users/test_user`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            site_id: siteId
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create user: ${await response.text()}`);
    }

    return response.json();
};

const getAppToken = async () => {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.MELI_APP_ID!);
    params.append('client_secret', process.env.MELI_SECRET!);

    const response = await fetch(`${MELI_API_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!response.ok) throw new Error(`Failed to get app token: ${await response.text()}`);
    return response.json();
};

const main = async () => {
    try {
        console.log("Obtaining App Token...");
        const tokenData = await getAppToken();
        const accessToken = tokenData.access_token;

        console.log("Creating Test Seller...");
        const seller = await createTestUser(accessToken, "MLA"); // MLA for Argentina
        console.log("✅ SELLER CREATED:");
        console.log(`User: ${seller.nickname}`);
        console.log(`Password: ${seller.password}`);
        console.log("------------------------------------------------");

        console.log("Creating Test Buyer...");
        const buyer = await createTestUser(accessToken, "MLA");
        console.log("✅ BUYER CREATED:");
        console.log(`User: ${buyer.nickname}`);
        console.log(`Password: ${buyer.password}`);
        console.log("------------------------------------------------");

        console.log("\nINSTRUCCIONES:");
        console.log("1. Abre una ventana de Incógnito.");
        console.log("2. Loguéate en MercadoLibre con el SELLER.");
        console.log("3. En tu App (Lumba), ve a Integraciones y conecta esa cuenta.");
        console.log("4. Publica un producto con el Seller (desde el panel de ML).");
        console.log("5. Abre OTRA ventana de Incógnito (o perfil distinto).");
        console.log("6. Loguéate con el BUYER.");
        console.log("7. Busca la publicación del Seller y cómprala.");
        console.log("8. ¡Verás la notificación en tu sistema!");
    } catch (e) {
        console.error("Error:", e);
    }
};

main();
