const ABACATE_BASE_URL = "https://api.abacatepay.com/v2";

export type PixCheckoutPayload = {
  amount: number;
  description: string;
  expiresIn: number;
  customer?: {
    name: string;
    email: string;
    taxId: string;
    cellphone: string;
  };
  metadata?: Record<string, string>;
};

export async function createPixCheckout(
  apiKey: string,
  payload: PixCheckoutPayload,
) {
  const response = await fetch(`${ABACATE_BASE_URL}/transparents/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "PIX",
      data: payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`AbacatePay create checkout failed with ${response.status}`);
  }

  return response.json();
}

export async function checkPixStatus(apiKey: string, transactionId: string) {
  const url = new URL(`${ABACATE_BASE_URL}/transparents/check`);
  url.searchParams.set("id", transactionId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`AbacatePay check status failed with ${response.status}`);
  }

  return response.json();
}
