/**
 * Medicine scraping and identification service
 */

export interface IdentificationResult {
    name: string;
    brand?: string;
    image?: string;
    description?: string;
    bulaUrl?: string;
}

/**
 * Identifies medicine by GTIN barcode using free APIs and fallback scrapers
 */
export const identifyMedicineByGTIN = async (gtin: string): Promise<IdentificationResult | null> => {
    try {
        // Core local database for guaranteed "wow" factor on common meds
        const samples: Record<string, IdentificationResult> = {
            "7894916203021": {
                name: "Dorflex",
                brand: "Sanofi",
                image: "https://d36u887n96777n.cloudfront.net/Custom/Content/Products/98/55/985536_dorflex-sanofi-50-comprimidos_m1_637042526550756306.jpg",
                description: "Analgésico e relaxante muscular.",
                bulaUrl: "https://www.sanofi.com.br/-/media/Project/One-Win/Country/Brazil/Products-Brazil/Bulas/Dorflex.pdf"
            },
            "7891058002916": {
                name: "Dorflex 10 cpr",
                brand: "Sanofi",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/653069/dorflex-com-10-comprimidos.jpg",
                description: "Analgésico e relaxante muscular.",
            },
            "7896112112158": {
                name: "Dipirona Sódica 500mg",
                brand: "Medley",
                image: "https://d2j6dbq0eux0bg.cloudfront.net/images/11181058/312015843.jpg",
                description: "Analgésico e antitérmico.",
            },
            "7896422512145": {
                name: "Ciclopirox Olamina 10mg/ml",
                brand: "Medley",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/676451-800-auto?v=637920188667500000&width=800&height=auto&aspect=true",
                description: "Fungicida para tratamento de micoses tópicas.",
            },
            "7896004706597": {
                name: "Losartana Potássica",
                brand: "Germed",
                image: "https://www.drogaeste.com.br/media/catalog/product/7/8/7896004706597_1.jpg",
                description: "Anti-hipertensivo usado para controlar a pressão alta.",
            },
            "7895296445863": {
                name: "Dipirona Monoidratada 500mg",
                brand: "Nova Química",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/664121-800-auto?v=637841639097700000&width=800&height=auto&aspect=true",
                description: "Analgésico e antitérmico.",
            }
        };

        if (samples[gtin]) {
            return samples[gtin];
        }

        // --- THE "INTERNET SEARCH" ENGINE ---
        // We use multiple public, CORS-friendly sources to identify the medicine dynamically
        const sources = [
            `https://world.openfoodfacts.org/api/v2/product/${gtin}.json`,
            `https://world.openbeautyfacts.org/api/v2/product/${gtin}.json`,
            `https://api.upcitemdb.com/prod/trial/lookup?upc=${gtin}`
        ];

        // Add EAN-Search API if token is configured
        const eanSearchToken = process.env.EXPO_PUBLIC_EAN_SEARCH_TOKEN;
        if (eanSearchToken) {
            sources.push(`https://api.ean-search.org/api?token=${eanSearchToken}&op=barcode-lookup&ean=${gtin}&format=json`);
        }

        for (const url of sources) {
            try {
                const response = await fetch(url, { method: 'GET' });
                if (response.ok) {
                    const data = await response.json();

                    // Logic for OpenFoodFacts / OpenBeautyFacts
                    if (data.product && data.product.product_name) {
                        return {
                            name: data.product.product_name,
                            brand: data.product.brands || '',
                            image: data.product.image_url || undefined,
                            description: data.product.generic_name || 'Identificado via rede mundial.'
                        };
                    }

                    // Logic for UPCItemDB
                    if (data.items && data.items.length > 0) {
                        const item = data.items[0];
                        return {
                            name: item.title,
                            brand: item.brand || '',
                            image: item.images && item.images.length > 0 ? item.images[0] : undefined,
                            description: 'Encontrado em base internacional de produtos.'
                        };
                    }

                    // Logic for EAN-Search
                    if (Array.isArray(data) && data.length > 0 && data[0].name) {
                        const item = data[0];
                        return {
                            name: item.name,
                            brand: '', // EAN-Search basic response might not split brand
                            image: undefined, // Basic tier might not include image URL in JSON
                            description: 'Identificado via EAN-Search API.'
                        };
                    }
                }
            } catch (err) {
                console.log(`Source ${url} failed, trying next...`);
            }
        }

        return null;
    } catch (error) {
        return null; // Silent fail to allow manual entry
    }
};
