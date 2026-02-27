# PROJETO VITUS 🩺🌿 - ASBUILT OFICIAL

**Descrição:** Assistente de saúde mobile focado em idosos, com scanner inteligente de medicamentos, alarmes automatizados e diário de sinais vitais. Design "Natureza Viva" focado em acessibilidade extrema e minimalismo.

**Stack Técnica:** Expo SDK 54, React 19, React Native 0.81, TypeScript, Supabase (Auth + DB), React Navigation.

**Última atualização:** 25/02/2026 17:15
**Status Geral:** 🛡️ CORE ESTABILIZADO (V1.0)
**Regra de Ouro:** As fases 01 a 05 estão em estado "Frozen". Nenhuma modificação deve ser feita no núcleo funcional atual sem validação explícita.

---

## 🏗️ ROADMAP DE IMPLEMENTAÇÃO (ESTABILIZADO)

### 🔵 FASE 01: FUNDAÇÃO E ESTRUTURA
**Status:** `✅ CONCLUÍDA & PROTEGIDA`
- [x] Configuração do Ambiente (.env + Supabase Client)
- [x] Definição do Schema de Banco de Dados (Profiles, Medications, Reminders, Logs)
- [x] Setup de Navegação (Tab Navigation Customizada e Responsiva)
- [x] Implementação de Login/Cadastro (Natureza Viva style) com persistência de Perfil

---

### 🟢 FASE 02: DIÁRIO DE SAÚDE E SINAIS VITAIS
**Status:** `✅ CONCLUÍDA & PROTEGIDA`
- [x] Tela Home Minimalista (Agenda Inteligente)
- [x] Fluxo de Registro de Pressão/Batimentos (Telas + DB)
- [x] Histórico de Saúde integrado com visualização cronológica

---

### 🟡 FASE 03: LUPA MÁGICA (INTELIGÊNCIA VISUAL)
**Status:** `✅ CONCLUÍDA & PROTEGIDA`
- [x] Scanner de Código de Barras Inteligente (EAN-Search API)
- [x] Reconhecimento Automático de Medicamentos (Nome, Marca, Foto)
- [x] Sistema de Upload de Fotos (Compatível com Mobile e Web)
- [x] Link direto para Bula Digital da ANVISA

---

### 🟠 FASE 04: NOTIFICAÇÕES E ARMARIO DIGITAL
**Status:** `✅ CONCLUÍDA & PROTEGIDA`
- [x] Sistema de Agendamento Flexível (Horários customizáveis e frequências em horas)
- [x] Próximas 5 Doses visíveis no detalhamento do medicamento
- [x] Fluxo de Exclusão de Séries de Alarmes (Mesma dinâmica para agenda e farmácia)
- [x] Persistência de Histórico de Tomada de Medicamentos

---

### 🔴 FASE 05: COMPATIBILIDADE E RELATÓRIOS
**Status:** `✅ CONCLUÍDA & PROTEGIDA`
- [x] Geração de PDF (Relatório de Medicamentos)
- [x] Suporte Web Total (Blindagem de notificações, Upload de Blobs, Print Direto)
- [x] Agenda "Clean": Filtro estrito para o dia atual e ocultação inteligente de itens
- [x] Correção de tipografia e design system "Natureza Viva" finalizado
- [x] Sistema de Monetização: Trial de 7 dias e Paywall integrado ao AuthContext
- [x] Preservação de Histórico: Exclusão de alarmes não apaga mais os registros médicos passados
- [x] Relatórios de Saúde Unificados: Novo fluxo de PDF por período idêntico ao de medicamentos

---

## 🚀 ROADMAP FUTURO (FASE 06+)

### 🟣 FASE 06: EVOLUÇÃO E CONECTIVIDADE (EM PLANEJAMENTO)
- [ ] **Family Link:** Compartilhamento de agenda com cuidadores/familiares.
- [ ] **Gamificação Vitus:** Sistema de conquistas e streaks para incentivar a adesão.
- [ ] **IA de Acompanhamento:** Chatbot simples para tirar dúvidas sobre horários e sintomas.
- [ ] **Dark Mode Natureza:** Vibe noturna inspirada em florestas ao luar.

---

## 💾 DATA SCHEMA (OFICIAL)
* **profiles:** Perfil do usuário e configurações.
* **medications:** Inventário de remédios escaneados.
* **reminders:** Horários e séries de alarmes vinculados.
* **health_logs:** Registros de sinais vitais (pressão, batimentos).
* **medication_history:** Log de doses tomadas/puladas.

---

**Última Atualização por:** SHIVA (Especialista em Produto e Visão)

