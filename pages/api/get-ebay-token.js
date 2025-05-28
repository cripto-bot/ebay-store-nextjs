// pages/api/get-ebay-token.js
import {
    EBAY_PROD_CLIENT_ID,
    EBAY_PROD_CLIENT_SECRET,
    EBAY_PROD_TOKEN_URL,
    SCOPES_PROD_STRING
} from '../../lib/ebayConfig'; // Ajuste importante: dos niveles arriba para salir de pages/api/

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    if (!EBAY_PROD_CLIENT_ID || !EBAY_PROD_CLIENT_SECRET) {
        console.error("Credenciales de eBay (ID o Secret) no disponibles en las variables de entorno.");
        return res.status(503).json({ error: "Configuración del servidor incompleta. Revisa las variables de entorno en Vercel." });
    }

    console.info("Solicitando Nuevo Token de Aplicación de eBay (Backend)...");

    const authString = `${EBAY_PROD_CLIENT_ID}:${EBAY_PROD_CLIENT_SECRET}`;
    const encodedAuthString = Buffer.from(authString).toString('base64');

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedAuthString}`
    };

    const body = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': SCOPES_PROD_STRING
    });

    try {
        const ebayResponse = await fetch(EBAY_PROD_TOKEN_URL, {
            method: 'POST',
            headers: headers,
            body: body.toString(),
        });

        if (!ebayResponse.ok) {
            const errorText = await ebayResponse.text();
            console.error(`Error HTTP al obtener token de eBay: ${ebayResponse.status}. Respuesta: ${errorText}`);
            return res.status(ebayResponse.status).json({ error: `Error HTTP del servidor de eBay: ${ebayResponse.status}`, details: errorText });
        }

        const data = await ebayResponse.json();
        const accessToken = data.access_token;
        const expiresIn = data.expires_in || 3000;

        if (accessToken) {
            console.info(`Nuevo token de eBay obtenido por backend. Válido por ~${Math.floor(expiresIn / 60)} minutos.`);
            return res.status(200).json({
                access_token: accessToken,
                source: "api",
                expires_in: expiresIn
            });
        } else {
            console.error(`No se encontró 'access_token' en la respuesta de eBay: ${JSON.stringify(data)}`);
            return res.status(500).json({ error: "No se pudo obtener el token de eBay desde la API." });
        }
    } catch (error) {
        console.error(`Error inesperado al obtener token de eBay: ${error.message}`, error);
        return res.status(500).json({ error: `Error inesperado en el servidor: ${error.message}` });
    }
}
