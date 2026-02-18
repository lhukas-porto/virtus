# Banco de Dados de Medicamentos Global

Para habilitar a consulta e o cache global de medicamentos (Feature de Inteligência Coletiva), execute os seguintes scripts SQL no Editor SQL do seu painel Supabase:

1. `supabase/migrations/20260218_create_medication_catalog.sql` -> Cria a tabela de catálogo global.
2. `supabase/migrations/20260218_allow_insert_catalog.sql` -> Permite que o aplicativo salve novos medicamentos encontrados na internet, populando o banco automaticamente.
3. `supabase/migrations/20260218_seed_catalog_extended.sql` -> Popula o banco com cerca de 50 medicamentos populares organizados por categoria (Dor, Gripe, Estômago, etc.).

## Como popular com TODOS os medicamentos da ANVISA (20.000+)

Para ter um banco de dados completo, siga os passos abaixo:

### Opção 1: Node.js (Recomendada)

1.  Baixe a **"Lista de Preços de Medicamentos"** mais recente no site da ANVISA:
    [https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos)
    *   Procure pelo arquivo XLS/XLSX "Lista de Preços Fábrica e Máximos ao Consumidor".
2.  Salve o arquivo como `medicamentos.xlsx` na pasta raiz do projeto Vitus.
3.  Instale a dependência necessária:
    ```bash
    npm install xlsx
    ```
4.  Execute o script:
    ```bash
    node scripts/generate_catalog_node.js
    ```
5.  O script criará o arquivo `supabase/migrations/20260218_seed_catalog_massive.sql`. Copie e execute no Supabase SQL Editor.

### Opção 2: Python

1.  Siga os passos 1 e 2 acima.
2.  Instale as dependências:
    ```bash
    pip install pandas openpyxl
    ```
3.  Execute o script:
    ```bash
    python scripts/generate_catalog_sql.py
    ```
5.  O script criará um arquivo SQL massivo em `supabase/migrations/20260218_seed_catalog_massive.sql`.
6.  Copie o conteúdo deste arquivo e execute no **Supabase SQL Editor**.
    *   *Nota:* O arquivo pode ser grande. Se o editor do Supabase reclamar do tamanho, divida a execução em partes.

## Como funciona

1. O app verifica se o código de barras já existe neste `medication_catalog`.
2. Se não existir, busca nas APIs externas (OpenFoodFacts, EAN-Search, etc.).
3. Se encontrar na internet, salva automaticamente no `medication_catalog` para que a próxima consulta seja instantânea.
