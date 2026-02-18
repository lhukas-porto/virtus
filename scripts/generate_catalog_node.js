const fs = require('fs');
const path = require('path');

// INSTRUÇÕES:
// 1. Baixe a "Lista de Preços de Medicamentos" (XLS/XLSX) mais recente no site da ANVISA:
//    https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos
// 2. Salve o arquivo como 'medicamentos.xlsx' na pasta raiz do projeto Vitus.
// 3. Instale a biblioteca necessária: npm install xlsx
// 4. Execute: node scripts/generate_catalog_node.js

const INPUT_FILE = path.join(__dirname, '..', 'medicamentos.xlsx');
const OUTPUT_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '20260218_seed_catalog_massive.sql');

async function generateSql() {
    try {
        // Tentar importar xlsx dinamicamente ou verificar se existe
        let XLSX;
        try {
            XLSX = require('xlsx');
        } catch (e) {
            console.error('\n❌ Biblioteca "xlsx" não encontrada.');
            console.error('Por favor, execute: npm install xlsx\n');
            process.exit(1);
        }

        if (!fs.existsSync(INPUT_FILE)) {
            console.error(`\n❌ Arquivo "${INPUT_FILE}" não encontrado.`);
            console.error('Baixe a lista oficial em: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos');
            console.error('Salve como "medicamentos.xlsx" na raiz do projeto.\n');
            process.exit(1);
        }

        console.log(`\n📖 Lendo ${INPUT_FILE}... (Isso pode demorar um pouco)`);

        // Ler apenas cabeçalho primeiro? SheetJS carrega tudo memória.
        // Se for muito grande, node pode estourar memória. Mas a lista da Anvisa tem ~30k linhas, deve caber (aprox 10MB).
        const workbook = XLSX.readFile(INPUT_FILE);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converter para JSON para facilitar (array de arrays ou objetos)
        // header: 1 devolve array de arrays
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`📊 Planilha carregada: ${rows.length} linhas.`);

        // Identificar cabeçalho
        let headerRowIndex = -1;
        let eanColIdx = -1;
        let prodColIdx = -1;
        let labColIdx = -1;
        let descColIdx = -1;

        for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const row = rows[i].map(c => String(c).toUpperCase());
            if (row.some(c => c.includes('EAN')) && row.some(c => c.includes('PRODUTO'))) {
                headerRowIndex = i;
                // Mapear índices
                row.forEach((col, idx) => {
                    if (col.includes('EAN') && col.includes('1')) eanColIdx = idx; // Prefer EAN 1
                    else if (col.includes('EAN') && eanColIdx === -1) eanColIdx = idx; // Fallback

                    if (col.includes('PRODUTO')) prodColIdx = idx;
                    if (col.includes('LABORATÓRIO') || col.includes('LABORATORIO')) labColIdx = idx;
                    if (col.includes('APRESENTAÇÃO') || col.includes('APRESENTACAO')) descColIdx = idx;
                });
                break;
            }
        }

        if (headerRowIndex === -1 || eanColIdx === -1 || prodColIdx === -1) {
            console.error('❌ Não foi possível identificar as colunas EAN e PRODUTO automaticamente.');
            process.exit(1);
        }

        console.log(`✅ Cabeçalho detectado na linha ${headerRowIndex + 1}. Gerando SQL...`);

        const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
        stream.write("-- Massive seed generated from ANVISA CMED table (Node.js version)\n");
        stream.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");

        let batch = [];
        let seenEans = new Set();
        let totalProcessed = 0;

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[eanColIdx]) continue;

            let ean = String(row[eanColIdx]).replace(/\D/g, ''); // Remove não-dígitos
            // Remover zeros a esquerda se excel bagunçou? Não, EAN tem tam fixo.
            // Mas excel pode ter lido como numero e tirado zero a esquerda. Ajustar pra 13 digitos?
            // Melhor confiar no raw string e validar tamanho.

            if (ean.length < 8 || ean.length > 14) continue;

            if (seenEans.has(ean)) continue;
            seenEans.add(ean);

            let name = String(row[prodColIdx] || '').trim().replace(/'/g, "''");
            let brand = labColIdx > -1 ? String(row[labColIdx] || '').trim().replace(/'/g, "''") : '';
            let desc = descColIdx > -1 ? String(row[descColIdx] || '').trim().replace(/'/g, "''") : '';

            // Truncate name
            if (name.length > 250) name = name.substring(0, 250);

            batch.push(`('${ean}', '${name}', '${brand}', '${desc}')`);

            if (batch.length >= 1000) {
                stream.write(batch.join(',\n'));
                stream.write("\nON CONFLICT (ean) DO NOTHING;\n\n");
                stream.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");
                batch = [];
                process.stdout.write(`⏳ Processados: ${seenEans.size}...\r`);
            }
        }

        if (batch.length > 0) {
            stream.write(batch.join(',\n'));
            stream.write("\nON CONFLICT (ean) DO NOTHING;\n");
        }

        stream.end();
        console.log(`\n\n✅ Sucesso! Arquivo gerado em: ${OUTPUT_FILE}`);
        console.log(`Total de medicamentos únicos: ${seenEans.size}`);
        console.log(`\n👉 Próximo passo: Copie o conteúdo do arquivo .sql gerado e execute no Editor SQL do Supabase.`);

    } catch (error) {
        console.error('\n❌ Erro durante a execução:', error);
    }
}

generateSql();
