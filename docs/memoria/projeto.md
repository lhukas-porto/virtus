# PROJETO VITUS 💜

**Tipo:** Mobile App (React Native/Expo)
**Público:** Idosos e pessoas com uso contínuo de medicação (Foco em Acessibilidade).

## 🎯 VISÃO GERAL
O Vitus é um assistente de saúde para facilitar a adesão ao tratamento medicamentoso e o monitoramento de sinais vitais.

### Estrutura de Telas (MVP):

1.  **Splash Screen (Boas-vindas):**
    *   Logo pulsando com frases diárias de incentivo ("Hoje é um bom dia para se cuidar").
    *   Carregamento rápido.

2.  **Home (Painel de Controle):**
    *   👋 **Saudação Personalizada:** "Bom dia, [Nome]!" com fonte serifada (autoridade acolhedora).
    *   💊 **Destaque Gigante (Próxima Dose):** Card elevado com foto do remédio, nome e horário.
    *   🏆 **Minhas Vitórias:** Pequeno contador de dias seguidos tomando a medicação corretamente (gamificação leve).
    *   🚨 **Botão de Emergência/Ajuda:** Acesso rápido para ligar para cuidador/familiar configurado.
    *   📅 **Agenda Rápida:** Botão para ver a lista completa do dia.

3.  **Scanner de Remédio (A Lupa Mágica):**
    *   Câmera aberta com mira clara e alto contraste.
    *   Instrução em texto grande: "Aponte para o código de barras da caixa".
    *   Feedback sonoro e tátil ao reconhecer.

4.  **Confirmação Visual (O Momento da Verdade):**
    *   📸 **Foto Grande:** Imagem clara da caixa do remédio e do comprimido (se disponível).
    *   📝 **Nome e Dose:** Texto em tamanho 24px+ (Legibilidade máxima).
    *   ✅ **Botão de Ação:** "CONFIRMAR E TOMAR" (Verde Musgo vibrante).
    *   ❌ **Botão de Correção:** "Não é esse" (Texto simples).

5.  **Diário Transparente (Histórico):**
    *   Lista simples: Hora | Remédio | Status (Tomado/Pulado).
    *   Indicadores visuais claros (Check verde, X vermelho).

## 🎨 DESIGN SYSTEM (SHIVA)

### Conceito: "Natureza Viva" 🌿 + "Médico da Família" 🩺
Uma identidade que equilibra a vitalidade e energia da natureza com a autoridade e confiança de um profissional de saúde.

*   **Paleta de Cores:**
    *   **Primária:** Verde Musgo Vibrante (`#3E8E41`) - Vitalidade, crescimento, saúde ativa.
    *   **Accent:** Laranja Queimado (`#E67E22`) - Energia, calor, destaque importante.
    *   **Fundo:** Creme Suave (`#FEF9E7`) - Conforto visual, redução de brilho excessivo (melhor que branco puro).
    *   **Texto:** Azul Petróleo Escuro (`#2C3E50`) - Contraste alto, legibilidade superior ao preto puro.

*   **Tipografia:**
    *   **Títulos:** *Merriweather* (Serifada) - Traz a autoridade e seriedade de um jornal ou laudo médico.
    *   **Corpo:** *Open Sans* (Sans-serif) - Clareza humanista, formas abertas e legíveis.
    *   **Tamanho Base:** 20px (Acima do padrão de mercado para máxima acessibilidade).

*   **Interação e Formas:**
    *   **Botões:** Robustos, com sombras suaves (`0px 6px 12px`) para dar sensação de "clique tátil".
    *   **Cards:** Bordas arredondadas (16px) amigáveis, com elevação sutil para hierarquia.
    *   **Feedback:** Uso intensivo de ícones preenchidos e cores semáforas claras (Sucesso Verde, Alerta Laranja, Erro Vermelho).