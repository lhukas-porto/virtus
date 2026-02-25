# PROJETO VITUS 🩺🌿

**Descrição:** Assistente de saúde mobile focado em idosos, com scanner inteligente de medicamentos, alarmes automatizados e diário de sinais vitais. Design "Natureza Viva" focado em acessibilidade extrema e minimalismo.

**Stack Técnica:** Expo SDK 54, React 19, React Native 0.81, TypeScript, Supabase (Auth + DB), React Navigation.

**Última atualização:** 24/02/2026 23:55
**Status Geral:** ✅ MVP Funcional (Polimento, Web-Ready & Alarmes Flexíveis)

---

## Roadmap de Implementação

### 🔵 FASE 01: FUNDAÇÃO E ESTRUTURA
**Status:** `✅ Concluída`
- [x] Configuração do Ambiente (.env + Supabase Client)
- [x] Definição do Schema de Banco de Dados (Profiles, Medications, Reminders, Logs)
- [x] Setup de Navegação (Tab Navigation Customizada e Responsiva)
- [x] Implementação de Login/Cadastro (Natureza Viva style) com persistência de Perfil

---

### 🟢 FASE 02: DIÁRIO DE SAÚDE E SINAIS VITAIS
**Status:** `✅ Concluída`
- [x] Tela Home Minimalista (Agenda Inteligente)
- [x] Fluxo de Registro de Pressão/Batimentos (Telas + DB)
- [x] Histórico de Saúde integrado com visualização cronológica

---

### 🟡 FASE 03: LUPA MÁGICA (INTELIGÊNCIA VISUAL)
**Status:** `✅ Concluída (Versão 2.1)`
- [x] Scanner de Código de Barras Inteligente (EAN-Search API)
- [x] Reconhecimento Automático de Medicamentos (Nome, Marca, Foto)
- [x] Sistema de Upload de Fotos (Compatível com Mobile e Web)
- [x] Link direto para Bula Digital da ANVISA

---

### 🟠 FASE 04: NOTIFICAÇÕES E ARMARIO DIGITAL
**Status:** `✅ Concluída`
- [x] Sistema de Agendamento Flexível (Horários customizáveis e frequências em horas)
- [x] Próximas 5 Doses visíveis no detalhamento do medicamento
- [x] Fluxo de Exclusão de Séries de Alarmes (Mesma dinâmica para agenda e farmácia)
- [x] Persistência de Histórico de Tomada de Medicamentos

---

### 🔴 FASE 05: COMPATIBILIDADE E RELATÓRIOS
**Status:** `✅ Concluída`
- [x] Geração de PDF (Relatório de Medicamentos)
- [x] Suporte Web Total (Blindagem de notificações, Upload de Blobs, Print Direto)
- [x] Agenda "Clean": Filtro estrito para o dia atual e ocultação inteligente de itens
- [x] Polimento de UX (HitSlops, Animações Spring na barra de tarefas)

---

## Histórico de Sessões Recentes

### Sessão 24/02/2026 - Noite
**Trabalho Realizado:**
- **Compatibilidade Web:**
  - Implementada blindagem completa para `expo-notifications` e `expo-av` no navegador.
  - Ajustado upload de imagens no Perfil e Farmácia para suportar Blobs (via `fetch` e `blob()`).
  - Navegação responsiva com `useWindowDimensions` e animações recalibradas para redimensionamento de janela.
- **Flexibilidade de Alarmes:**
  - Substituídas opções fixas por entrada de texto para **Frequência em Horas** (permite qualquer intervalo, ex: 7 em 7h).
  - Adicionada visualização das **Próximas 5 Doses** dentro da tela de detalhes do medicamento.
  - Implementada exclusão de série de alarmes diretamente pela "Farmácia".
- **Agenda Inteligente:**
  - Filtro estrito de data (`toDateString`) para impedir que alarmes do dia seguinte sumam na agenda de hoje.
  - Lógica de **Reload Seletivo**: O botão de atualizar agora traz de volta apenas os últimos 5 itens ocultos por vez (paginação de histórico).
  - Correção de erro de query SQL (`column profile_id does not exist`) ao filtrar lembretes pela relação com medicamentos.

### Sessão 18/02/2026 - Tarde
**Trabalho Realizado:**
- **Edição de Medicamentos:** Implementada funcionalidade completa de edição de dados cadastrais.
- **Scanner Inteligente 2.0:** Integração com APIs externas e Catálogo Global.
- **UX/UI:** Melhorias no layout de botões e feedback visual de busca.

---

## Notas Técnicas

### Decisões de Arquitetura
- **Plataforma Unificada:** O código agora utiliza guards de `Platform.OS === 'web'` para garantir que funcionalidades nativas não quebrem o acesso via navegador.
- **Estado de Agenda Efêmero:** Itens ocultos na agenda são mantidos em cache local (`hiddenItems`), permitindo foco no que falta tomar sem deletar dados do banco.
- **Tratamento de Datas:** Uso de `ISOStrings` para armazenamento e `LocaleStrings` para apresentação, com normalização de horas para garantir consistência em fusos horários diferentes.
- **Segurança de Dados:** RLS (Row Level Security) configurado no Supabase para isolar medicamentos e logs por usuário.

---

**Última Atualização por:** ANTIGRAVITY (DeepMind Coding Assistant)
