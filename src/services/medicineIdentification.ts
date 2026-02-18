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
        // Extensive local database for common Brazilian medications (WOW effect for MVP)
        const samples: Record<string, IdentificationResult> = {
            "7894916203021": {
                name: "Dorflex",
                brand: "Sanofi",
                image: "https://d36u887n96777n.cloudfront.net/Custom/Content/Products/98/55/985536_dorflex-sanofi-50-comprimidos_m1_637042526550756306.jpg",
                description: "Analgésico e relaxante muscular.",
                bulaUrl: "https://www.sanofi.com.br/-/media/Project/One-Win/Country/Brazil/Products-Brazil/Bulas/Dorflex.pdf"
            },
            "7891058002916": { // Outro EAN Dorflex
                name: "Dorflex 10 cpr",
                brand: "Sanofi",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/653069/dorflex-com-10-comprimidos.jpg",
                description: "Analgésico e relaxante muscular.",
            },
            "7897005870478": { // Dorflex MAX
                name: "Dorflex MAX",
                brand: "Sanofi",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/653069/dorflex-com-10-comprimidos.jpg",
                description: "Analgésico e relaxante muscular potente.",
            },
            "7896112112158": { // Dipirona Medley
                name: "Dipirona Sódica 500mg",
                brand: "Medley",
                image: "https://d2j6dbq0eux0bg.cloudfront.net/images/11181058/312015843.jpg",
                description: "Analgésico e antitérmico.",
            },
            "7894916143202": { // Dipirona EMS
                name: "Dipirona Sódica 500mg",
                brand: "EMS",
                image: "https://www.farmaciaitaituba.com.br/wp-content/uploads/2022/02/7894916143202.jpg",
                description: "Analgésico e antitérmico.",
            },
            "7897595901323": {
                name: "Puran T4 75mcg",
                brand: "Merck",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/621183/puran-t4-75mcg-30-comprimidos.jpg",
                description: "Reposição hormonal da tireoide.",
            },
            "7891721027468": {
                name: "Glifage XR 500mg",
                brand: "Merck",
                image: "https://drogariaspacheco.vtexassets.com/arquivos/ids/676571/glifage-xr-500mg-30-comprimidos.jpg",
                description: "Controle da diabetes tipo 2.",
            },
            "7896094921986": {
                name: "Neosaldina",
                brand: "Takeda",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/621183/neosaldina-30mg-30mg-300mg-4-comprimidos.jpg",
                description: "Analgésico para dor de cabeça.",
            },
            "7896094922242": {
                name: "Buscopan Composto",
                brand: "Boehringer",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/621183/buscopan-composto-10mg-250mg-4-comprimidos.jpg",
                description: "Antiespasmódico e analgésico.",
            },
            "7891268044409": {
                name: "Advil 400mg",
                brand: "Haleon",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/621183/advil-400mg-com-3-capsulas-liquidas.jpg",
                description: "Alívio rápido para dores e febre.",
            },
            "7896523212319": {
                name: "Simeticona",
                brand: "Cimed",
                image: "https://d2j6dbq0eux0bg.cloudfront.net/images/11181058/312015843.jpg",
                description: "Alívio de gases.",
            },
            "7896523212685": {
                name: "Nimesulida 100mg",
                brand: "Cimed",
                image: "https://www.drogaeste.com.br/media/catalog/product/7/8/7896004706597_1.jpg",
                description: "Anti-inflamatório e analgésico.",
            },
            "7891045041041": {
                name: "Advil 400mg (Unit)",
                brand: "Haleon",
                image: "https://paguemenos.vtexassets.com/arquivos/ids/621183/advil-400mg-com-3-capsulas-liquidas.jpg",
                description: "Cápsula líquida para dor.",
            },
            "7896004706597": {
                name: "Losartana Potássica",
                brand: "Germed",
                image: "https://www.drogaeste.com.br/media/catalog/product/7/8/7896004706597_1.jpg",
                description: "Anti-hipertensivo usado para controlar a pressão alta.",
                bulaUrl: "https://consultas.anvisa.gov.br/#/medicamentos/25351221430200931/"
            }
        };

        if (samples[gtin]) {
            return samples[gtin];
        }

        // FALLBACK: Search the internet (Using OpenFoodFacts as a public CORS-friendly proxy)
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${gtin}.json`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.product && data.product.product_name) {
                    return {
                        name: data.product.product_name,
                        brand: data.product.brands || '',
                        image: data.product.image_url || undefined,
                        description: data.product.generic_name || 'Item identificado via busca web.'
                    };
                }
            }
        } catch (e) {
            console.log("Internet search fallback failed, skipping...");
        }

        return null;
    } catch (error) {
        return null;
    }
};
