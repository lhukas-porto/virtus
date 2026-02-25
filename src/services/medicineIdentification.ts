/**
 * Medicine scraping and identification service
 */

import { supabase } from './supabase';

export interface IdentificationResult {
    name: string;
    brand?: string;
    image?: string;
    description?: string;
    bulaUrl?: string;
    dosage?: string;
}

/**
 * Identifies medicine by GTIN barcode using free APIs and fallback scrapers
 */
export const identifyMedicineByGTIN = async (gtin: string): Promise<IdentificationResult | null> => {
    try {
        // 1. Check Global Catalog in Supabase (Centralized Database)
        try {
            const { data, error } = await supabase
                .from('medication_catalog')
                .select('*')
                .eq('ean', gtin)
                .maybeSingle();

            if (data && !error) {
                return {
                    name: data.name,
                    brand: data.brand || '',
                    image: data.image_url || undefined,
                    description: data.description || 'Identificado no Catálogo Vitus.',
                    dosage: data.dosage || undefined
                };
            }
        } catch (dbError) {
            console.log('Error querying medication_catalog...', dbError);
        }

        // 1.1 Check User Medications Catalog (Crowdsourced)
        try {
            const { data, error } = await supabase
                .from('medication_user')
                .select('*')
                .eq('ean', gtin)
                .maybeSingle();

            if (data && !error) {
                return {
                    name: data.name,
                    brand: data.brand || '',
                    image: data.image_url || undefined,
                    description: data.description || 'Identificado na base colaborativa Vitus.',
                    dosage: data.dosage || undefined
                };
            }
        } catch (dbError) {
            console.log('Error querying medication_user...', dbError);
        }

        // 2. Core local database for guaranteed "wow" factor on common meds
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

        return null;
    } catch (error) {
        console.error("Error identifying medicine:", error);
        return null;
    }
};

const saveToGlobalCatalog = async (ean: string, data: IdentificationResult) => {
    try {
        await supabase.from('medication_catalog').upsert({
            ean,
            name: data.name,
            brand: data.brand || null,
            description: data.description || null,
            image_url: data.image || null,
            updated_at: new Date()
        });
    } catch (e) {
        console.warn('Failed to cache medicine in global catalog', e);
    }
};
