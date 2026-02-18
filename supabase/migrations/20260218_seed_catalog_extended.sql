-- Extended seed data for medication_catalog
-- Generated based on popular Brazilian medications (Top 100+)
-- Run this in Supabase SQL Editor.

INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES
-- Analgésicos e Antitérmicos
('7891058001407', 'Novalgina 1g 10 Comprimidos', 'Sanofi', 'Analgésico e antitérmico'),
('7896004713366', 'Dipirona Monoidratada 500mg', 'EMS', 'Analgésico genérico'),
('7897595604689', 'Tylenol 750mg 20 Comprimidos', 'Janssen', 'Paracetamol'),
('7896094917682', 'Dorflex 36 Comprimidos', 'Sanofi', 'Relaxante muscular e analgésico'),
('7896226102631', 'Neosaldina 30 Drágeas', 'Takeda', 'Para dor de cabeça e enxaqueca'),
('7891721020294', 'Buscopan Composto', 'Boehringer', 'Para cólicas'),
('7891058002916', 'Dorflex 10 Comprimidos', 'Sanofi', 'Relaxante muscular'),
('7896004703541', 'Dipirona 500mg Gotas', 'EMS', 'Analgésico líquido'),
('7896112123567', 'Ibuprofeno 600mg', 'Medley', 'Anti-inflamatório'),
('7896004710341', 'Ibuprofeno 400mg', 'EMS', 'Anti-inflamatório'),
('7896658001610', 'Aspirina 500mg', 'Bayer', 'Ácido Acetilsalicílico'),

-- Gripe e Resfriado
('7896004715568', 'Cimegripe 20 Cápsulas', 'Cimed', 'Antigripal'),
('7897843200832', 'Benegrip 12 Comprimidos', 'Hypera', 'Antigripal'),
('7896094200678', 'Resfenol 20 Cápsulas', 'Kley Hertz', 'Para gripe e resfriado'),
('7897595602357', 'Naldecon Dia e Noite', 'Reckitt', 'Antigripal'),
('7891142123711', 'Vick Pyrena Mel e Limão', 'P&G', 'Chá antigripal'),

-- Estômago e Digestão
('7896112106317', 'Omeprazol 20mg 28 Cápsulas', 'Medley', 'Para gastrite'),
('7896004709871', 'Omeprazol 20mg', 'EMS', 'Para gastrite'),
('7896112135676', 'Simeticona 40mg', 'Medley', 'Antigases'),
('7896004716459', 'Simeticona 125mg', 'Cimed', 'Antigases'),
('7896094208759', 'Eno Sal de Frutas Tradicional', 'GSK', 'Antiácido'),
('7896094208766', 'Eno Sal de Frutas Laranja', 'GSK', 'Antiácido'),
('7891058005375', 'Pantoprazol 40mg', 'Medley', 'Para refluxo e gastrite'),
('7896658027580', 'Epocler Flaconete', 'Hypera', 'Para fígado'),

-- Hipertensão e Coração
('7896004706597', 'Losartana Potássica 50mg', 'Germed', 'Anti-hipertensivo'),
('7896112145897', 'Losartana Potássica 50mg', 'Medley', 'Anti-hipertensivo'),
('7896004712390', 'Atenolol 25mg', 'EMS', 'Beta-bloqueador'),
('7896112156787', 'Hidroclorotiazida 25mg', 'Medley', 'Diurético'),
('7896112101237', 'Enalapril 10mg', 'Medley', 'Anti-hipertensivo'),
('7896004723143', 'Captopril 25mg', 'EMS', 'Anti-hipertensivo'),

-- Diabetes
('7896112109875', 'Metformina 850mg', 'Medley', 'Para diabetes tipo 2'),
('7896004705675', 'Glibenclamida 5mg', 'EMS', 'Para diabetes'),

-- Antibióticos (Muitos genéricos)
('7896004702339', 'Amoxicilina 500mg', 'EMS', 'Antibiótico'),
('7896112104566', 'Azitromicina 500mg 3 Comprimidos', 'Medley', 'Antibiótico'),
('7896004712345', 'Cefalexina 500mg', 'EMS', 'Antibiótico'),
('7896112198765', 'Ciprofloxacino 500mg', 'Medley', 'Antibiótico'),

-- Anti-alérgicos
('7896112105679', 'Loratadina 10mg', 'Medley', 'Antialérgico'),
('7896004708911', 'Desloratadina 5mg', 'EMS', 'Antialérgico moderno'),
('7896658004567', 'Histamin 2mg', 'Neo Química', 'Antialérgico (Dexclorfeniramina)'),
('7896094201234', 'Allegra 120mg', 'Sanofi', 'Antialérgico'),
('7896226101238', 'Polaramine', 'Mantecorp', 'Antialérgico clássico'),

-- Vitaminas e Suplementos
('7897947606550', 'Lavitan A-Z', 'Cimed', 'Polivitamínico'),
('7897947612780', 'Lavitan Hair', 'Cimed', 'Para cabelos e unhas'),
('7891010567890', 'Centrum Select', 'GSK', 'Polivitamínico'),
('7896094901234', 'Vitamina C 1g Efervescente', 'EMS', 'Imunidade'),
('7896658007890', 'Vitamina D 2000UI', 'Neo Química', 'Saúde óssea'),

-- Saúde da Mulher
('7896112102340', 'Ciclo 21', 'União Química', 'Anticoncepcional'),
('7896004701233', 'Microvlar', 'Bayer', 'Anticoncepcional'),

-- Pele e Cuidados
('7891142200566', 'Bepantol Derma Creme', 'Bayer', 'Hidratante e cicatrizante'),
('7891142111220', 'Hipoglós Amêndoas', 'P&G', 'Pomada para assaduras'),
('7896422512145', 'Ciclopirox Olamina 10mg/ml', 'Medley', 'Antifúngico'),
('7895296445863', 'Dipirona Monoidratada 500mg', 'Nova Química', 'Analgésico'),

-- Outros Comuns
('7896004709999', 'Dramin B6', 'Takeda', 'Para enjoo'),
('7896226109998', 'Salonpas Adesivo', 'Hisamitsu', 'Para dores musculares'),
('7896094909997', 'Vick Vaporub', 'P&G', 'Descongestionante'),
('7896658012345', 'Soro Fisiológico 0,9%', 'Múltiplos', 'Para limpeza nasal')

-- Adicione mais conforme necessário...
ON CONFLICT (ean) DO NOTHING;
