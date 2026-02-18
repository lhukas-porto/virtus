-- Seed data for medication_catalog
-- Contains a starting list of popular Brazilian medications to populate the database.
-- Run this in Supabase SQL Editor.

INSERT INTO public.medication_catalog (ean, name, brand, description, image_url) VALUES
('7891058001407', 'Novalgina 1g', 'Sanofi', 'Analgésico e antitérmico', 'https://www.drogariaminasbrasil.com.br/media/catalog/product/n/o/novalgina_1g_c_10_cpr.jpg'),
('7896004713366', 'Dipirona Monoidratada 500mg', 'EMS', 'Analgésico e antitérmico genérico', NULL),
('7897595604689', 'Tylenol 750mg', 'Janssen', 'Paracetamol analgésico e antitérmico', 'https://www.drogariaminasbrasil.com.br/media/catalog/product/t/y/tylenol_750mg_blister_c_4_comprimidos_1.jpg'),
('7896094917682', 'Dorflex 36 Comprimidos', 'Sanofi', 'Relaxante muscular e analgésico', 'https://paguemenos.vtexassets.com/arquivos/ids/653069/dorflex-com-10-comprimidos.jpg'),
('7896226102631', 'Neosaldina 30 Drágeas', 'Takeda', 'Analgésico para dores de cabeça', 'https://www.drogarianovaesperanca.com.br/imagens/produtos/800x800/neosaldina-com-30-drageas-2.jpg'),
('7891721020294', 'Buscopan Composto', 'Boehringer', 'Para cólicas e desconforto abdominal', NULL),
('7896004702339', 'Amoxicilina 500mg', 'EMS', 'Antibiótico', NULL),
('7896112135676', 'Simeticona 40mg', 'Medley', 'Para gases e desconforto abdominal', NULL),
('7896658006233', 'Rivotril 2.5mg/ml', 'Roche', 'Ansiolítico (Tarja Preta)', NULL),
('7896112106317', 'Omeprazol 20mg', 'Medley', 'Para gastrite e úlcera', NULL),
('7891058002916', 'Dorflex 10 Comprimidos', 'Sanofi', 'Analgésico e relaxante muscular', 'https://paguemenos.vtexassets.com/arquivos/ids/653069/dorflex-com-10-comprimidos.jpg'),
('7896422512145', 'Ciclopirox Olamina 10mg/ml', 'Medley', 'Fungicida para tratamento de micoses tópicas', 'https://paguemenos.vtexassets.com/arquivos/ids/676451-800-auto?v=637920188667500000&width=800&height=auto&aspect=true'),
('7895296445863', 'Dipirona Monoidratada 500mg', 'Nova Química', 'Analgésico e antitérmico', 'https://paguemenos.vtexassets.com/arquivos/ids/664121-800-auto?v=637841639097700000&width=800&height=auto&aspect=true'),
('7894916203021', 'Dorflex 50 Comprimidos', 'Sanofi', 'Analgésico e relaxante muscular', 'https://d36u887n96777n.cloudfront.net/Custom/Content/Products/98/55/985536_dorflex-sanofi-50-comprimidos_m1_637042526550756306.jpg'),
('7896004706597', 'Losartana Potássica 50mg', 'Germed', 'Anti-hipertensivo', 'https://www.drogaeste.com.br/media/catalog/product/7/8/7896004706597_1.jpg')
ON CONFLICT (ean) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();

-- NOTE: To add more medications in bulk, you can download the CSV from ANVISA Open Data:
-- https://dados.gov.br/dados/conjuntos-dados/medicamentos-registrados-no-brasil
-- And import it using the Supabase Table Editor (Import CSV).
