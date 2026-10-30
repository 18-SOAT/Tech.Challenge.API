import { type Api, request } from './api.js';
import {
  PHONE,
  uniqueCpf,
  uniqueEmail,
  uniqueName,
  uniquePlate,
  uniqueSku,
} from './data.js';

// Construtores de recursos via HTTP, sempre pelo ADMIN. Cada chamada cria dados
// novos; um status inesperado derruba o cenário com a mensagem da API.
async function created<T = any>(
  api: Api,
  method: string,
  path: string,
  token: string,
  body: unknown,
  expected = 201,
): Promise<T> {
  const response = await request<T>(api, method, path, { token, body });
  if (response.status !== expected) {
    throw new Error(
      `${method} ${path} → ${response.status} (esperado ${expected}): ${response.body?.message}`,
    );
  }
  return response.body.data;
}

export const createCustomer = (api: Api, admin: string) =>
  created<{ id: string; document: string; email: string }>(
    api,
    'POST',
    '/customers',
    admin,
    {
      name: uniqueName('Cliente'),
      document: uniqueCpf(),
      email: uniqueEmail('balcao'),
      phone: PHONE,
    },
  );

export const createVehicle = (api: Api, admin: string, customerId: string) =>
  created<{ id: string; plate: string }>(api, 'POST', '/vehicles', admin, {
    customerId,
    plate: uniquePlate(),
    brand: 'Fiat',
    model: 'Uno',
    year: 2015,
  });

export const createService = (api: Api, admin: string) =>
  created<{ id: string }>(api, 'POST', '/services', admin, {
    name: uniqueName('Serviço'),
    price: 100,
    estimatedDurationMinutes: 30,
  });

export async function createProduct(
  api: Api,
  admin: string,
  { stock = 0 }: { stock?: number } = {},
) {
  const product = await created<{ id: string }>(
    api,
    'POST',
    '/products',
    admin,
    { sku: uniqueSku(), name: uniqueName('Peça'), type: 'PART', price: 50 },
  );
  if (stock > 0) {
    await created(api, 'POST', `/products/${product.id}/stock/entries`, admin, {
      quantity: stock,
    });
  }
  return product;
}

export interface OpenedOrder {
  vehicleId: string;
  plate: string;
  serviceId: string;
  orderId: string;
  serviceOrderId: string;
  serviceItemId: string;
}

// Ordem aberta para o cliente informado (por documento), com um veículo novo dele
// e um serviço novo: a OS nasce em IN_DIAGNOSIS com um item.
export async function openOrder(
  api: Api,
  admin: string,
  customer: { customerId: string; document: string },
): Promise<OpenedOrder> {
  const vehicle = await createVehicle(api, admin, customer.customerId);
  const service = await createService(api, admin);
  const data = await created(api, 'POST', '/orders', admin, {
    document: customer.document,
    plate: vehicle.plate,
    services: [{ serviceId: service.id, quantity: 1 }],
  });
  return {
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    serviceId: service.id,
    orderId: data.order.id,
    serviceOrderId: data.serviceOrder.id,
    serviceItemId: data.serviceOrder.services[0].id,
  };
}

export async function assign(
  api: Api,
  admin: string,
  serviceOrderId: string,
  mechanicId: string,
): Promise<void> {
  await created(
    api,
    'PATCH',
    `/service-orders/${serviceOrderId}/assignee`,
    admin,
    { mechanicId },
    200,
  );
}

// OS atribuída, com diagnóstico concluído: AWAITING_APPROVAL, orçamento enviado.
export async function orderAwaitingApproval(
  api: Api,
  admin: string,
  customer: { customerId: string; document: string },
  mechanicId: string,
): Promise<OpenedOrder> {
  const order = await openOrder(api, admin, customer);
  await assign(api, admin, order.serviceOrderId, mechanicId);
  await created(
    api,
    'POST',
    `/service-orders/${order.serviceOrderId}/complete-diagnosis`,
    admin,
    undefined,
    200,
  );
  return order;
}

// OS aprovada pelo ADMIN (registrando a decisão do cliente): IN_EXECUTION.
export async function orderInExecution(
  api: Api,
  admin: string,
  customer: { customerId: string; document: string },
  mechanicId: string,
): Promise<OpenedOrder> {
  const order = await orderAwaitingApproval(api, admin, customer, mechanicId);
  await created(
    api,
    'POST',
    `/service-orders/${order.serviceOrderId}/approve`,
    admin,
    undefined,
    200,
  );
  return order;
}

// Ordem pronta para entrega: a única OS foi rejeitada (estado terminal).
export async function orderReadyToDeliver(
  api: Api,
  admin: string,
  customer: { customerId: string; document: string },
  mechanicId: string,
): Promise<OpenedOrder> {
  const order = await orderAwaitingApproval(api, admin, customer, mechanicId);
  await created(
    api,
    'POST',
    `/service-orders/${order.serviceOrderId}/reject`,
    admin,
    undefined,
    200,
  );
  return order;
}

export async function finishOrder(
  api: Api,
  token: string,
  serviceOrderId: string,
): Promise<void> {
  await created(
    api,
    'POST',
    `/service-orders/${serviceOrderId}/finish`,
    token,
    undefined,
    200,
  );
}

export async function deliverOrder(
  api: Api,
  admin: string,
  orderId: string,
): Promise<void> {
  await created(
    api,
    'POST',
    `/orders/${orderId}/deliver`,
    admin,
    undefined,
    200,
  );
}

// OS em AWAITING_APPROVAL com um produto além do serviço: base dos cenários de
// estoque na aprovação. `stock` é o saldo do produto; `quantity`, o que a OS pede.
export async function quoteWithProduct(
  api: Api,
  admin: string,
  customer: { customerId: string; document: string },
  mechanicId: string,
  { stock, quantity }: { stock: number; quantity: number },
): Promise<OpenedOrder & { productId: string }> {
  const order = await openOrder(api, admin, customer);
  await assign(api, admin, order.serviceOrderId, mechanicId);
  const product = await createProduct(api, admin, { stock });
  await created(
    api,
    'POST',
    `/service-orders/${order.serviceOrderId}/products`,
    admin,
    { productId: product.id, quantity },
  );
  await created(
    api,
    'POST',
    `/service-orders/${order.serviceOrderId}/complete-diagnosis`,
    admin,
    undefined,
    200,
  );
  return { ...order, productId: product.id };
}
