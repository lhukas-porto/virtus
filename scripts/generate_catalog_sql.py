import pandas as pd
import sys
import os

# INSTRUÇÕES:
# 1. Baixe a "Lista de Preços de Medicamentos" (XLS/XLSX) mais recente no site da ANVISA:
#    https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos
# 2. Salve o arquivo como 'medicamentos.xlsx' na pasta raiz do projeto Vitus.
# 3. Este script requer pandas e openpyxl: pip install pandas openpyxl
# 4. Execute: python scripts/generate_catalog_sql.py

OUTPUT_FILE = 'supabase/migrations/20260218_seed_catalog_massive.sql'

def generate_sql():
    xls_file = 'medicamentos.xlsx'
    
    if not os.path.exists(xls_file):
        print(f"Erro: Arquivo '{xls_file}' não encontrado.")
        print("Por favor, baixe a lista oficial da CMED/ANVISA e salve como 'medicamentos.xlsx'.")
        return

    try:
        print(f"Lendo {xls_file}... Isso pode levar alguns minutos.")
        # Identificar o header. Às vezes as planilhas da Anvisa têm cabeçalho na linha X.
        # Vamos tentar ler as primeiras linhas para achar "EAN"
        df_preview = pd.read_excel(xls_file, nrows=50)
        
        # Achar a linha do cabeçalho
        header_row_idx = 0
        for i, row in df_preview.iterrows():
            row_str = row.astype(str).str.upper().tolist()
            if any('EAN' in s for s in row_str) and any('PRODUTO' in s for s in row_str):
                header_row_idx = i + 1 # pandas usa 0-based, mas header=0 é a primeira linha. Se header tá na linha 1 do excel (index 0 no preview), é header=0? Não, header row index.
                # Se achou no index i do preview, esse é o header row.
                header_row_idx = i
                break
        
        print(f"Cabeçalho detectado na linha {header_row_idx}")
        
        df = pd.read_excel(xls_file, header=header_row_idx)
        
        # Limpar nomes de colunas
        df.columns = [str(c).upper().strip() for c in df.columns]
        print(f"Colunas: {df.columns.tolist()}")
        
        # Tentar identificar colunas chave
        ean_col = next((c for c in df.columns if 'EAN' in c and '1' in c), None) # Geralmente EAN 1
        if not ean_col: ean_col = next((c for c in df.columns if 'EAN' in c), None)
        
        prod_col = next((c for c in df.columns if 'PRODUTO' in c), None)
        lab_col = next((c for c in df.columns if 'LABORATÓRIO' in c or 'LABORATORIO' in c), None)
        desc_col = next((c for c in df.columns if 'APRESENTAÇÃO' in c or 'APRESENTACAO' in c), None)
        
        if not ean_col or not prod_col:
            print("Erro crítico: Colunas EAN ou PRODUTO não identificadas.")
            print(f"EAN: {ean_col}, PRODUTO: {prod_col}")
            return

        print("Processando dados e gerando SQL...")
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("-- Massive seed generated from ANVISA CMED table\n")
            
            chunk = []
            seen_eans = set()
            batch_count = 0
            
            # Escreve o início do primeiro insert
            f.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n")

            for index, row in df.iterrows():
                try:
                    raw_ean = row[ean_col]
                    # Tratamento EAN
                    if pd.isna(raw_ean): continue
                    ean_val = str(raw_ean).replace('.0', '').strip()
                    
                    # EANs válidos tem geralmente 13 ou 8 digitos.
                    if not ean_val.isdigit() or len(ean_val) < 8:
                        continue
                        
                    if ean_val in seen_eans:
                        continue
                    seen_eans.add(ean_val)
                    
                    name_val = str(row[prod_col]).strip().replace("'", "''")
                    brand_val = (str(row[lab_col]).strip().replace("'", "''")) if lab_col and not pd.isna(row[lab_col]) else ''
                    desc_val = (str(row[desc_col]).strip().replace("'", "''")) if desc_col and not pd.isna(row[desc_col]) else ''
                    
                    # Truncate fields if necessary
                    name_val = name_val[:255]
                    
                    chunk.append(f"('{ean_val}', '{name_val}', '{brand_val}', '{desc_val}')")
                    
                    if len(chunk) >= 500:
                        f.write(",\n".join(chunk))
                        f.write("\nON CONFLICT (ean) DO NOTHING;\n\n")
                        f.write("INSERT INTO public.medication_catalog (ean, name, brand, description) VALUES\n")
                        chunk = []
                        batch_count += 1
                        print(f"Processados: {len(seen_eans)} itens...", end='\r')
                        
                except Exception as e:
                    continue
            
            # Escrever o resto
            if chunk:
                f.write(",\n".join(chunk))
                f.write("\nON CONFLICT (ean) DO NOTHING;\n")
                
        print(f"\nSucesso! {len(seen_eans)} medicamentos exportados para {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"\nErro fatal: {e}")

if __name__ == "__main__":
    generate_sql()
