# Aplicativo Mercado

Base monorepo para um app de supermercado com React Native, Supabase e processamento em tempo real via Node.js.

## Estrutura

- `apps/mobile`: aplicativo React Native com Expo, React Native Paper, Moti e arquitetura por features.
- `apps/webhooks`: servico Node.js para webhooks, sincronizacao de pagamentos PIX e eventos operacionais.
- `packages/shared`: contratos, modelos de dominio e utilitarios compartilhados.
- `supabase`: migracoes SQL, funcoes de seguranca e regras de acesso.
- `docs`: documentacao de arquitetura e decisoes tecnicas.

## Decisoes principais

- `React Native + Expo`: acelera iteracao sem sacrificar capacidade de crescer.
- `React Native Paper`: UI consistente, acessivel e madura.
- `Moti + Reanimated`: animacoes performaticas para catologo, carrinho e status do pedido.
- `Supabase`: autenticacao, banco relacional, realtime e RLS centralizados.
- `Node.js + Fastify`: webhooks de pagamento e tarefas operacionais com baixa latencia.

## Fluxos cobertos

- Catalogo com estoque e indisponibilidade refletidos no frontend.
- Carrinho, checkout, meios de pagamento e confirmacao PIX.
- Atualizacao em tempo real de pedidos para cliente, entregador e admin.
- RBAC com politicas restritivas para cliente, entregador e administrador.
- Validacao de codigo de entrega antes de concluir o pedido.

## Proximos passos para rodar

1. Criar os projetos Supabase e AbacatePay.
2. Preencher as variaveis de ambiente em `apps/mobile/.env.example` e `apps/webhooks/.env.example`.
3. Instalar dependencias com `npm install`.
4. Aplicar a migracao SQL no Supabase.
5. Subir o app mobile com `npm run mobile` e os webhooks com `npm run webhooks`.

## SQLs apos a primeira migracao

Se a migracao inicial ja foi aplicada pelo SQL Editor, execute tambem:

1. `supabase/migrations/202604220001_harden_checkout.sql`: reforca a funcao de checkout com validacao de dono do carrinho e lock de estoque.
2. `supabase/seed.sql`: cria categorias e produtos iniciais para o catalogo real.

## Referencias externas usadas

- AbacatePay v2 `POST /v2/transparents/create` para checkout transparente PIX.
- AbacatePay v2 `GET /v2/transparents/check` para conciliacao de status.

Mais detalhes em `docs/architecture.md`.
