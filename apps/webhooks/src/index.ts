import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env";
import { checkPixStatus, createPixCheckout } from "./integrations/abacate-pay";
import { markOrderPaid } from "./services/order-processor";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

app.post("/payments/pix", async (request, reply) => {
  const body = request.body as {
    amount: number;
    description: string;
    customer?: {
      name: string;
      email: string;
      taxId: string;
      cellphone: string;
    };
    metadata?: Record<string, string>;
  };

  const payload = await createPixCheckout(env.ABACATEPAY_API_KEY, {
    amount: body.amount,
    description: body.description,
    expiresIn: 1800,
    customer: body.customer,
    metadata: body.metadata,
  });

  return reply.send(payload);
});

app.get("/payments/pix/:transactionId", async (request, reply) => {
  const params = request.params as { transactionId: string };
  const payload = await checkPixStatus(env.ABACATEPAY_API_KEY, params.transactionId);
  return reply.send(payload);
});

app.post("/webhooks/abacatepay", async (request, reply) => {
  const secret = request.headers["x-webhook-secret"];

  if (secret !== env.ABACATEPAY_WEBHOOK_SECRET) {
    return reply.status(401).send({ error: "invalid webhook secret" });
  }

  const body = request.body as {
    event?: string;
    data?: {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };

  if (body.event === "billing.paid" && body.data?.id) {
    const orderId = await markOrderPaid(body.data.id);
    request.log.info({ orderId }, "Pedido atualizado apos pagamento PIX");
  }

  return reply.status(202).send({ received: true });
});

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
