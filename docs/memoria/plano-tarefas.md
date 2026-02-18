# PLANO DE TAREFAS - VITUS 💜🌿

**Criado por:** Hades
**Fase Atual:** 01 - Fundação

---

## 🔵 FASE 01: FUNDAÇÃO E ESTRUTURA

### Tarefa 1.1: Conexão Vital (Supabase Setup)
**Objetivo:** Estabelecer a ponte entre o app e nosso banco de dados.

**Ações:**
1. Criar arquivo `.env` na raiz (Instruir Lucas a preencher).
2. Criar `src/services/supabase.ts` para inicializar o cliente.
3. Criar arquivo `supabase_schema.sql` com as tabelas base (profiles, medications, logs).

**Critérios de Aceite:**
- ✅ O cliente do Supabase inicializa sem erros.
- ✅ O arquivo .env está no .gitignore.

---

### Tarefa 1.2: O Mapa da Jornada (Navegação)
**Objetivo:** Configurar como o usuário se move no app.

**Ações:**
1. Criar `src/navigation/index.tsx`.
2. Configurar `AuthStack` (Login/Cadastro).
3. Configurar `AppTabs` (Home, Scanner, Perfil).

**Critérios de Aceite:**
- ✅ Troca entre Telas funciona.
- ✅ Estilo visual segue o `theme.ts` (Creme Suave).

---

### Tarefa 1.3: Identidade do Médico da Família (Auth)
**Objetivo:** Criar as portas de entrada do app.

**Ações:**
1. Criar `src/screens/LoginScreen.tsx`.
2. Criar `src/screens/RegisterScreen.tsx`.
3. Aplicar fontes `Merriweather` (Heading) e `Open Sans` (Body).

**Critérios de Aceite:**
- ✅ Input de texto com contraste alto.
- ✅ Botões seguindo o componente padrão.

---

## Receitas HADES
- **Supabase Auth:** Usar `supabase.auth.signInWithPassword`.
- **Estilo:** Sempre embrulhar em `SafeAreaView`.

---
**Atualizado por:** HADES
