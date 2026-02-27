# Estratégia de Monetização: Vitus (Mode: Trial to Premium)

Para o lançamento do Vitus na Google Play/App Store, a estratégia mais eficaz para retenção e conversão de idosos/cuidadores é o modelo **Trial de 7 dias com In-App Purchase (IAP)**.

## 🛠️ Arquitetura Técnica (Como implementar)

### 1. Registro da Data de Início
No primeiro login do usuário, devemos salvar no Supabase (`profiles`):
- `trial_started_at`: TIMESTAMP (Data da criação da conta).
- `is_premium`: BOOLEAN (Default: FALSE).

### 2. Guardião de Acesso (Trial Guard)
No arquivo `App.tsx` ou no `AuthProvider`, implementamos uma verificação:
- Se `is_premium` for FALSE:
  - Calcular: `DIAS_PASSADOS = (Data Atual - trial_started_at)`.
  - Se `DIAS_PASSADOS > 7`: 
    - Redirecionar o usuário para uma **"Tela de Bloqueio/Assinatura"**.
    - Impedir o acesso à Agenda e ao Scanner.

### 3. Integração de Pagamento (RevenueCat)
Para facilitar a vida e evitar falhas de integração nativa, use o **RevenueCat**.
- Ele gerencia os recibos da Apple e Google automaticamente.
- Fornece um SDK simples: `Purchases.purchasePackage(package)`.
- Uma vez confirmado o pagamento, mude `is_premium` para TRUE no banco de dados.

## 💰 Opções de Preço Sugeridas
1. **Assinatura Mensal (R$ 9,90/mês)**: Para quem quer testar por pouco tempo.
2. **Assinatura Semestral (R$ 49,90)**: Melhor custo-benefício (pago de uma vez).
3. **Compra Única / Lifetime (R$ 149,90)**: Compra "para sempre", ideal para o público idoso que prefere não ter cobranças recorrentes.

## 📅 Chronograma para Lançamento

1.  **Semana 1 (Finalização)**: Implementar as tabelas de controle de trial e a tela de Paywall (bonita e acolhedora).
2.  **Semana 2 (Dev Build)**: Migrar de Expo Go para **EAS Build** (necessário para pagamentos e alarmes nativos).
3.  **Semana 3 (Review)**: Submeter para Google Play Console (Review leva de 3 a 7 dias).

---
*Assinado: SHIVA (Visão de Produto)*
