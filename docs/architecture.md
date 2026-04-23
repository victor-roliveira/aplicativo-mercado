# Arquitetura

## Visao geral

O projeto foi estruturado como monorepo para isolar responsabilidades sem perder compartilhamento de contratos:

- `apps/mobile`: experiencia do cliente, entregador e admin.
- `apps/webhooks`: camada de integracao externa e processamento assincrono.
- `packages/shared`: tipos de dominio e contratos.
- `supabase`: banco, RLS, funcoes SQL e automacoes de dados.

## Modelagem de dominio

Entidades principais:

- `profiles`: usuario autenticado com role (`CUSTOMER`, `COURIER`, `ADMIN`, `DEVELOPER`).
- `products`, `categories`, `product_images`: catalogo.
- `carts`, `cart_items`: carrinho aberto por usuario.
- `orders`, `order_items`: snapshot imutavel do checkout.
- `payments`: pagamento local e referencias do gateway PIX.
- `notifications`: eventos para informar cliente sobre pagamento, estoque ou entrega.
- `inventory_movements`: trilha de movimentacao para auditoria e reprocessamento.
- `audit_logs`: governanca operacional.

## Seguranca

- Autenticacao delegada ao Supabase Auth.
- RLS em todas as tabelas sensiveis.
- `DEVELOPER` e o unico papel capaz de promover usuarios a `ADMIN`.
- `ADMIN` pode promover usuarios a `COURIER` e operar catalogo/pedidos.
- Entregador so acessa pedidos com `assigned_courier_id = auth.uid()`.
- Codigo de entrega fica apenas no pedido do cliente e e validado por funcao server-side.
- Checkout e atualizacao de status criticos sao feitos por funcoes `security definer`.

## Tempo real e filas

- Atualizacoes de pedido podem usar `postgres_changes` do Supabase para telas em tempo real.
- O servico Node.js recebe webhooks de pagamento e faz conciliacao com a base.
- Para escalar alem de webhooks simples, a recomendacao e adicionar:
  - fila para conciliacao de pagamentos
  - fila para notificacoes push
  - fila para reconciliacao de estoque
- O modelo `inventory_movements` permite replay e investigacao quando houver divergencia.

## Fluxo de checkout

1. Cliente autentica e mantem um carrinho aberto.
2. Cliente escolhe entrega ou retirada.
3. `checkout_cart` valida estoque no banco.
4. Funcao gera `orders`, `order_items`, baixa estoque e cria `payments`.
5. Se o pagamento for PIX, o Node.js cria o QR Code na AbacatePay.
6. Ao receber webhook de pagamento aprovado, o servico atualiza o pedido para `PROCESSING`.
7. Admin atribui entregador e evolui o pedido para `OUT_FOR_DELIVERY`.
8. Entregador valida os 4 ultimos digitos do CPF e conclui a entrega.

## Integracao PIX

Baseado na documentacao oficial da AbacatePay v2:

- Criacao do checkout transparente: `POST /v2/transparents/create`
- Consulta do status: `GET /v2/transparents/check?id=<transactionId>`

O servico de webhooks foi preparado para persistir `provider_reference`, `pix_qr_code` e `pix_qr_code_base64` na tabela `payments`.
