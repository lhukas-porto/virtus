# ASBUILT - ARQUITETURA VITUS 🔥

## 📦 STACK TÉCNICA
* **Frontend:** React Native com Expo SDK.
* **Backend:** Supabase (Auth, Database, Storage).
* **Banco de Dados:** PostgreSQL via Supabase.
* **Biblioteca Excel:** `xlsx` para geração de planilhas.

## 💾 DATA SCHEMA
* **table profiles:** `id, email, full_name, created_at`
* **table medications:** `id, user_id, name, dosage, barcode, image_url, time, frequency`
* **table health_logs:** `id, user_id, systolic, diastolic, heart_rate, created_at`

## 🚀 ROADMAP DE EXECUÇÃO
1. **Fase 1:** Setup Supabase e Autenticação.
2. **Fase 2:** Scanner de Barcode e Integração com API de medicamentos.
3. **Fase 3:** Sistema de Agendamento de Alarmes Locais.
4. **Fase 4:** Dashboard de Saúde e Exportação Excel.