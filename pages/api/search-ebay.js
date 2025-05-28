// pages/api/search-ebay.js
import { EBAY_PROD_BROWSE_API_URL } from '../../lib/ebayConfig'; // Ajuste importante: dos niveles arriba

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const appToken = req.headers['x-ebay-app-token'];
    const { q, limit = '50', offset = '0', category_id, marketplace_id = "EBAY_US" } = req.query;

    if (!appToken) {
        return res.status(401).json({ error: "Token de aplicación de eBay no proporcionado en cabecera X-Ebay-App-Token." });
    }
    if (!q) {
        return res.status(400).json({ error: "Parámetro de búsqueda 'q' es requerido." });
    }

    console.info(`Búsqueda solicitada para: q='${q}', limit=${limit}, offset=${offset}, category='${category_id}'`);

    const headersToEbay = {
        'Authorization': `Bearer ${appToken}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplace_id,
        'Accept': 'application/json',
    };

    const paramsToEbay = new URLSearchParams({
        q: q,
        limit: limit,
        offset: offset
    });

    if (category_id) {
        paramsToEbay.append('category_ids', category_id);
    }

    const searchUrl = `${EBAY_PROD_BROWSE_API_URL}?${paramsToEbay.toString()}`;

    try {
        const ebayResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: headersToEbay,
        });
        
        const responseData = await ebayResponse.json();

        if (!ebayResponse.ok) {
            console.error(`Error HTTP de eBay en búsqueda directa (${q}): ${ebayResponse.status} - ${JSON.stringify(responseData)}`);
            return res.status(ebayResponse.status).json({
                error: "Error al contactar la API de eBay.",
                details: responseData
            });
        }

        console.info(`Respuesta de eBay para '${q}' recibida. Estado: ${ebayResponse.status}`);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error(`Error inesperado en búsqueda directa (${q}): ${error.message}`, error);
        return res.status(500).json({ error: `Error inesperado en el servidor: ${error.message}` });
    }
}
