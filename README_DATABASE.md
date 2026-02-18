# Banco de Dados de Medicamentos Global

Para habilitar a consulta e o cache global de medicamentos (Feature de Inteligência Coletiva), execute os seguintes scripts SQL no Editor SQL do seu painel Supabase:

1. `supabase/migrations/20260218_create_medication_catalog.sql` -> Cria a tabela de catálogo global.
2. `supabase/migrations/20260218_allow_insert_catalog.sql` -> Permite que o aplicativo salve novos medicamentos encontrados na internet, populando o banco automaticamente.

## Como funciona

1. O app verifica se o código de barras já existe neste `medication_catalog`.
2. Se não existir, busca nas APIs externas (OpenFoodFacts, EAN-Search, etc.).
3. Se encontrar na internet, salva automaticamente no `medication_catalog` para que a próxima consulta seja instantânea.
