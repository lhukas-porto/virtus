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

## 🎨 DESIGN SYSTEM (SHIVA) - VERSÃO 2.0: NATUREZA VIVA VIBRANTE

### Conceito: "Vitalidade Terrestre" 🌿 + "Precisão Acolhedora" 🩺
Uma evolução da identidade visual inspirada na força das cores da terra e da flora densa. O novo ícone (Coração com ECG e Sino sobre fundo Esmeralda e Terracota) é a âncora desta nova fase.

*   **Paleta de Cores:**
    *   **Primária:** Verde Esmeralda Profundo (`#06815B`) - Vitalidade renovada, frescor, profundidade e saúde ativa.
    *   **Accent/Alerta:** Terracota Original (`#C2563D`) - Conexão com a terra, calor humano, destaque orgânico e sério.
    *   **Fundo:** Soft Mint / Gelo Verde (`#F0F4F2`) - Modernidade, redução de fadiga ocular, frescor clínico mas amigável.
    *   **Texto:** Deep Slate / Cinza Grafite (`#1F2937`) - Máxima elegância e contraste para leitura sem esforço.

*   **Tipografia:**
    *   **Títulos:** *Playfair Display* (Serifada) - Traz sofisticação e a confiança de um profissional de saúde clássico.
    *   **Corpo:** *Outfit* (Geometric Sans) - Formas modernas, limpas e altamente acessíveis.
    *   **Tamanho Base:** 20px (Foco em idosos).

*   **Interação e Formas:**
    *   **Ícone de App:** Um coração branco com linha de batimentos e um pequeno sino (notificação), centralizado em um círculo terracota sobre um fundo verde esmeralda.
    *   **Botões:** Bordas generosas, cores sólidas e vibrantes.
    *   **Cards:** Elevação sutil em superfícies brancas puras contrastando com o fundo menta.