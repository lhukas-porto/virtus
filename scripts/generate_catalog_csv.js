const fs = require('fs');
const path = require('path');

// INSTRUÇÕES:
// 1. Certifique-se de que o arquivo 'medicamentos.csv' esteja na pasta raiz do projeto.
// 2. npm install xlsx (se ainda não tiver instalado)
// 3. node scripts/generate_catalog_csv.js

const INPUT_FILE = path.join(__dirname, '..', 'medicamentos.csv');
const PARTS_DIR = path.join(__dirname, '..', 'supabase', 'migrations', 'seed_parts_csv'); // Pasta separada para não misturar
const RECORDS_PER_FILE = 4000;

async function generateSqlFromCsv() {
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

        // Ler CSV - Tentando identificar encoding automaticamente ou forçar leitura como string
        // Obs: O CSV parece ter problemas de encoding no cabeçalho. Vamos ser flexíveis na busca.
        const workbook = XLSX.readFile(INPUT_FILE, { type: 'file' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`📊 Total de linhas brutas: ${rows.length}`);

        // Variáveis de índice de coluna
        let headerRowIndex = -1;
        let eanColIdx = -1;
        let prodColIdx = -1;
        let labColIdx = -1;
        let classColIdx = -1;

        console.log("🔍 Buscando colunas...");

        // Detectar colunas com regex flexível para ignorar erros de acentuação/encoding
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row)) continue;
            const rowStr = row.map(c => String(c).toUpperCase());

            // Critérios de busca mais permissivos
            const hasEan = rowStr.some(c => c.includes('EAN') || c.includes('BARRAS'));
            const hasLab = rowStr.some(c => c.includes('LAB') || c.includes('BORAT') || c.includes('ORAT')); // Pega LABORATÓRIO, BORATÓRIO, etc.

            if (hasEan || hasLab) {
                headerRowIndex = i;
                console.log(`✅ Cabeçalho detectado na linha ${i + 1}`);
                console.log(`   Colunas encontradas: ${JSON.stringify(rowStr)}`);

                rowStr.forEach((col, idx) => {
                    // EAN
                    if (col.includes('EAN') && col.includes('1')) eanColIdx = idx;
                    else if (col.includes('EAN') && eanColIdx === -1) eanColIdx = idx;

                    // PRODUTO / NOME
                    if (col.includes('PRODUTO') || col.includes('NOME')) prodColIdx = idx;

                    // LABORATÓRIO / BRAND
                    if (col.includes('LAB') || col.includes('BORAT') || col.includes('ORAT')) labColIdx = idx;

                    // CLASSE / DESCRIÇÃO
                    if (col.includes('CLASSE') || col.includes('TERAP') || col.includes('TERA')) classColIdx = idx;
                });
                break;
            }
        }

        if (headerRowIndex === -1 || eanColIdx === -1) {
            console.error('❌ Não foi possível identificar as colunas (EAN não encontrado).');
            // Fallback manual baseado no padrão visto
            console.log('⚠️ Usando fallback posicional: 0=Lab, 1=EAN, 2=Prod, 3=Classe');
            headerRowIndex = 0;
            labColIdx = 0;
            eanColIdx = 1;
            prodColIdx = 2;
            classColIdx = 3;
        }

        // Preparar output
        if (!fs.existsSync(PARTS_DIR)) {
            fs.mkdirSync(PARTS_DIR, { recursive: true });
        }

        let fileCounter = 1;
        let currentRecords = 0;
        let batch = [];
        let seenEans = new Set();
        let currentFile = path.join(PARTS_DIR, `part_csv_${fileCounter}.sql`);
        let stream = fs.createWriteStream(currentFile, { encoding: 'utf8' });

        console.log(`📂 Gerando arquivos em: ${PARTS_DIR}`);
        console.log(`📝 Escrevendo parte ${fileCounter}...`);

        stream.write(`-- Part ${fileCounter} (From CSV)\n`);
        stream.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            const rowEan = row[eanColIdx];
            if (!rowEan) continue;

            // Limpeza EAN
            let ean = String(rowEan).replace(/\D/g, '');
            if (ean.length < 8 || ean.length > 14) continue;
            if (seenEans.has(ean)) continue;
            seenEans.add(ean);

            // Extração
            let rawProduct = prodColIdx > -1 ? String(row[prodColIdx] || '').trim() : '';
            let rawLab = labColIdx > -1 ? String(row[labColIdx] || '').trim() : '';
            let rawClass = classColIdx > -1 ? String(row[classColIdx] || '').trim() : '';

            // --- DE PARA ---
            // Name <- Produto
            let name = rawProduct.replace(/'/g, "''").substring(0, 250);

            // Brand <- Laboratório (Completo desta vez)
            let brand = rawLab.replace(/'/g, "''").substring(0, 100);

            // Description <- Classe Terapêutica
            let desc = rawClass.replace(/'/g, "''").substring(0, 500);

            batch.push(`('${ean}', '${name}', '${brand}', '${desc}')`);
            currentRecords++;

            // Flush em chunks (para o arquivo)
            if (batch.length >= 500) {
                stream.write(batch.join(',\n'));
                stream.write("\nON CONFLICT (ean) DO NOTHING;\n");
                batch = [];

                // Flush de arquivo (se atingiu limite do Supabase Editor)
                if (currentRecords >= RECORDS_PER_FILE) {
                    stream.end();
                    console.log(`✅ Parte ${fileCounter} salva (${currentRecords} registros).`);

                    if (i < rows.length - 1) {
                        fileCounter++;
                        currentRecords = 0;
                        currentFile = path.join(PARTS_DIR, `part_csv_${fileCounter}.sql`);
                        stream = fs.createWriteStream(currentFile, { encoding: 'utf8' });
                        console.log(`📝 Escrevendo parte ${fileCounter}...`);
                        stream.write(`-- Part ${fileCounter} (From CSV)\n`);
                        stream.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");
                    }
                } else {
                    stream.write("\nINSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n");
                }
            }
        }

        // Sobras finais
        if (batch.length > 0) {
            stream.write(batch.join(',\n'));
            stream.write("\nON CONFLICT (ean) DO NOTHING;\n");
        }

        stream.end();
        console.log(`✅ Parte ${fileCounter} salva.`);
        console.log(`\n🎉 Concluído! Total de ${seenEans.size} medicamentos processados do CSV.`);
        console.log(`👉 Vá no Supabase > SQL Editor e execute os arquivos da pasta 'supabase/migrations/seed_parts_csv/' um por um.`);

    } catch (error) {
        console.error('\n❌ Erro:', error);
    }
}

generateSqlFromCsv();
