const fs = require('fs');
const path = require('path');

// INSTRUÇÕES:
// 1. Baixe a "Lista de Preços de Medicamentos" (XLS/XLSX) mais recente no site da ANVISA.
// 2. Salve como 'medicamentos.xlsx' na pasta raiz do projeto Vitus.
// 3. npm install xlsx
// 4. node scripts/generate_catalog_node.js

const INPUT_FILE = path.join(__dirname, '..', 'medicamentos.xlsx');
const PARTS_DIR = path.join(__dirname, '..', 'supabase', 'migrations', 'seed_parts');
const RECORDS_PER_FILE = 3000; // Limite seguro para Supabase SQL Editor

async function generateSql() {
    try {
        let XLSX;
        try {
            XLSX = require('xlsx');
        } catch (e) {
            console.error('\n❌ Biblioteca "xlsx" não encontrada. Execute: npm install xlsx\n');
            process.exit(1);
        }

        if (!fs.existsSync(INPUT_FILE)) {
            console.error(`\n❌ Arquivo "${INPUT_FILE}" não encontrado.`);
            process.exit(1);
        }

        console.log(`\n📖 Lendo ${INPUT_FILE}...`);
        const workbook = XLSX.readFile(INPUT_FILE);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`📊 Total de linhas brutas: ${rows.length}`);

        // Identificar cabeçalho
        let headerRowIndex = -1;
        let eanColIdx = -1;
        let prodColIdx = -1;
        let labColIdx = -1;
        let descColIdx = -1;

        console.log("🔍 Buscando colunas...");

        for (let i = 0; i < Math.min(rows.length, 100); i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row)) continue;
            const rowStr = row.map(c => String(c).toUpperCase());

            const hasEan = rowStr.some(c => c.includes('EAN') || c.includes('BARRAS'));
            const hasProd = rowStr.some(c => c.includes('PRODUTO') || c.includes('SUBSTÂNCIA') || c.includes('SUBSTANCIA'));

            if (hasEan || hasProd) {
                if (hasEan && hasProd) {
                    headerRowIndex = i;
                    console.log(`✅ Cabeçalho detectado na linha ${i + 1}`);

                    rowStr.forEach((col, idx) => {
                        if (col.includes('EAN') && col.includes('1')) eanColIdx = idx;
                        else if (col.includes('EAN') && eanColIdx === -1) eanColIdx = idx;
                        else if (col.includes('BARRAS') && eanColIdx === -1) eanColIdx = idx;

                        if (col.includes('PRODUTO')) prodColIdx = idx;
                        else if ((col.includes('SUBSTÂNCIA') || col.includes('SUBSTANCIA')) && prodColIdx === -1) prodColIdx = idx;

                        if (col.includes('LABORATÓRIO') || col.includes('LABORATORIO')) labColIdx = idx;
                        if (col.includes('APRESENTAÇÃO') || col.includes('APRESENTACAO')) descColIdx = idx;
                    });
                    break;
                }
            }
        }

        if (headerRowIndex === -1 || eanColIdx === -1 || prodColIdx === -1) {
            console.error('❌ Não foi possível identificar as colunas automaticamente.');
            process.exit(1);
        }

        // Preparar output
        if (!fs.existsSync(PARTS_DIR)) {
            fs.mkdirSync(PARTS_DIR, { recursive: true });
        }

        let fileCounter = 1;
        let currentRecords = 0;
        let batch = [];
        let seenEans = new Set();
        let currentFile = path.join(PARTS_DIR, `part_${fileCounter}.sql`);
        let stream = fs.createWriteStream(currentFile, { encoding: 'utf8' });

        console.log(`📂 Gerando arquivos em: ${PARTS_DIR}`);
        console.log(`📝 Escrevendo parte ${fileCounter}...`);

        stream.write(`-- Part ${fileCounter}\n`);
        stream.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[eanColIdx]) continue;

            // Limpar EAN
            let ean = String(row[eanColIdx]).replace(/\D/g, '');
            if (ean.length < 8 || ean.length > 14) continue;
            if (seenEans.has(ean)) continue;
            seenEans.add(ean);

            let name = String(row[prodColIdx] || '').trim().replace(/'/g, "''").substring(0, 250);
            let brand = labColIdx > -1 ? String(row[labColIdx] || '').trim().replace(/'/g, "''") : '';
            let desc = descColIdx > -1 ? String(row[descColIdx] || '').trim().replace(/'/g, "''") : '';

            batch.push(`('${ean}', '${name}', '${brand}', '${desc}')`);
            currentRecords++;

            if (batch.length >= 500) { // Escreve no arquivo em chunks de 500
                stream.write(batch.join(',\n'));
                stream.write("\nON CONFLICT (ean) DO NOTHING;\n");
                batch = [];

                if (currentRecords >= RECORDS_PER_FILE) {
                    // Fechar arquivo atual e abrir proximo, mas SÓ SE ainda houver dados
                    stream.end();
                    console.log(`✅ Parte ${fileCounter} salva (${currentRecords} registros).`);

                    if (i < rows.length - 1) { // Ainda tem loops pela frente?
                        fileCounter++;
                        currentRecords = 0;
                        currentFile = path.join(PARTS_DIR, `part_${fileCounter}.sql`);
                        stream = fs.createWriteStream(currentFile, { encoding: 'utf8' });
                        console.log(`📝 Escrevendo parte ${fileCounter}...`);
                        stream.write(`-- Part ${fileCounter}\n`);
                        stream.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");
                    }
                } else {
                    // Continua no mesmo arquivo
                    stream.write("\nINSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");
                }
            }
        }

        // Escrever o que sobrou no batch final
        if (batch.length > 0) {
            stream.write(batch.join(',\n'));
            stream.write("\nON CONFLICT (ean) DO NOTHING;\n");
        }

        stream.end();
        console.log(`✅ Parte ${fileCounter} salva.`);
        console.log(`\n🎉 Concluído! Total de ${seenEans.size} medicamentos divididos em ${fileCounter} arquivos.`);
        console.log(`👉 Vá no Supabase > SQL Editor e execute os arquivos da pasta 'supabase/migrations/seed_parts/' um por um.`);

    } catch (error) {
        console.error('\n❌ Erro:', error);
    }
}

generateSql();
