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
                name: "Ciclopirox Olamina",
                brand: "Medley",
                image: "https://drogariaspacheco.vtexassets.com/arquivos/ids/676451/ciclopirox-olamina-10mg-solucao-topica-15ml-medley-generico.jpg",
                description: "Fungicida para tratamento de micoses tópicas.",
            },
            "7896004706597": {
                name: "Losartana Potássica",
                brand: "Germed",
                image: "https://www.drogaeste.com.br/media/catalog/product/7/8/7896004706597_1.jpg",
                description: "Anti-hipertensivo usado para controlar a pressão alta.",
            }
        };

        if (samples[gtin]) {
            return samples[gtin];
        }

        // --- THE "INTERNET SEARCH" ENGINE ---
        // We use multiple public, CORS-friendly sources to identify the medicine dynamically
        const sources = [
            `https://world.openfoodfacts.org/api/v2/product/${gtin}.json`,
            `https://api.upcitemdb.com/prod/trial/lookup?upc=${gtin}`
        ];

        for (const url of sources) {
            try {
                const response = await fetch(url, { method: 'GET' });
                if (response.ok) {
                    const data = await response.json();

                    // Logic for OpenFoodFacts
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
