# PROJETO VITUS 🩺🌿

**Descrição:** Assistente de saúde mobile focado em idosos, com scanner de medicamentos, alarmes inteligentes e diário de sinais vitais. Design "Natureza Viva" focado em acessibilidade extrema, com visual clean e fundo branco.

**Stack Técnica:** Expo SDK 54, React 19, React Native 0.81, TypeScript, Supabase (Auth + DB), React Navigation.

**Última atualização:** 17/02/2026 21:10
**Status Geral:** 🏗️ Fase de Fundação (Migrado para SDK 54)

---

## Roadmap de Implementação

### 🔵 FASE 01: FUNDAÇÃO E ESTRUTURA
**Status:** `✅ Concluída`
**Progresso:** 6/6 tarefas (100%)

- [x] Configuração do Ambiente (.env + Supabase Client)
- [x] Definição do Schema de Banco de Dados (SQL no Supabase)
- [x] Setup de Navegação (Abas separadas para Medicamentos e Saúde)
- [x] Implementação de Login/Cadastro (Natureza Viva style)
- [x] Estrutura Base das Telas (Home e Perfil)
- [x] Aplicação Global do Design System
- [x] Migração para SDK 54 (React 19 / RN 0.81)

---

### 🟢 FASE 02: DIÁRIO DE SAÚDE E SINAIS VITAIS
**Status:** `✅ Concluída (Fundação de Dados)`
- [x] Tela Home com Destaque "Próxima Dose" (Interface E Link com DB)
- [x] Fluxo de Registro de Pressão/Batimentos (Telas + DB)
- [x] Tela de Cadastro Manual de Medicamentos
---

### 🟡 FASE 03: SCANNER DE MEDICAMENTOS (LUPA MÁGICA)
**Status:** `⏳ Aguardando`
### 🟣 FASE 03: LUPA MÁGICA (SCANNER)
**Status:** `✅ Concluída`
- [x] Interface da Lupa Mágica (Viewfinder + Overlay)
- [x] Integração com Expo-Camera (Leitura de Barcode)
- [x] Fluxo de Simulação de Reconhecimento (Alerta -> Cadastro)
- [x] Tela de Perfil Completa (Dados + Logoff)

---

### 🟠 FASE 04: NOTIFICAÇÕES E AGENDA
**Status:** `✅ Concluída`
- [x] Sistema de Agendamento Local (Expo Notifications)
- [x] Agenda do Dia Dinâmica na Home
- [x] Fluxo de "Marcar como Tomado" (Logs)
- [x] Persistência de Histórico no DB

---

### 🔴 FASE 05: RELATÓRIOS E POLIMENTO
**Status:** `✅ Concluída (Em andamento)`
- [x] Geração de PDF (Cartão de Saúde)
- [x] Exportação de dados para Excel (CSV)
- [ ] Revisão de Acessibilidade (WCAG)

---

## Histórico de Sessões

### Sessão 17/02/2026
**Duração:** --
**Trabalho Realizado:**
- Definição da Identidade Visual (Shiva)
- Setup inicial do projeto Expo + Dependências
- Criação do asbuilt.md e Plano de Tarefas (Hades)
- Migração Completa para **Expo SDK 54** (React 19 / RN 0.81)
- **Reboot do Projeto:** Limpeza e recriação total para consistência.
- **Sincronização GitHub:** Todos os arquivos base comissionados e empurrados para `main`.
- **Deploy Vercel:** Configurações de build e rewrites aplicadas (Link oficial ativo).

**Próximos Passos:**
- Fase 05: Relatórios e Polimento
- Implementar Geração de PDF (Cartão de Saúde)
- Revisão de Acessibilidade (WCAG)

---

## Notas Técnicas

### Decisões de Arquitetura
- **Database First:** O design reflete os dados que temos no Supabase.
- **Acessibilidade 101:** Botões de no mínimo 56px de altura, fontes base de 20px.
- **Clean Start:** Optamos por recriar o projeto para garantir compatibilidade total com SDK 54 desde o Dia 1.
- **Dependency Handling:** Abandonada a estratégia de `overrides` em favor de `legacy-peer-deps`. Removido também o diretório fantasma `src/app` e alterado o `output` para `single` no `app.json`, resolvendo o erro de build que buscava por `expo-router` e SSR.

---

**Última Atualização por:** HADES
