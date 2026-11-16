/**
 * Cliente HTTP mínimo para la API de Mercado Pago.
 * No depende de Nest para poder reutilizarlo desde el seed de Prisma.
 */

const MP_API = 'https://api.mercadopago.com';

export type MpFrequencyType = 'days' | 'months';
export type MpPreapprovalStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';

export interface MpAutoRecurring {
  frequency: number;
  frequency_type: MpFrequencyType;
  transaction_amount: number;
  currency_id: string;
  free_trial?: { frequency: number; frequency_type: MpFrequencyType };
  start_date?: string;
  end_date?: string;
}

export interface MpPreapprovalPlan {
  id: string;
  reason: string;
  status: string;
  init_point?: string;
  auto_recurring: MpAutoRecurring;
  back_url: string;
}

export interface MpPreapproval {
  id: string;
  preapproval_plan_id?: string;
  status: MpPreapprovalStatus;
  reason: string;
  payer_id?: number;
  payer_email?: string;
  external_reference?: string;
  init_point?: string;
  date_created?: string;
  last_modified?: string;
  next_payment_date?: string;
  auto_recurring?: MpAutoRecurring;
}

export interface MpAuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id: string;
  status: string; // scheduled | processed | recycling | cancelled
  date_created?: string;
  debit_date?: string;
  payment?: { id: number | string; status: string; status_detail?: string };
}

export interface MpPayment {
  id: number | string;
  status: string; // approved | pending | in_process | rejected | refunded | cancelled | charged_back
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  date_approved?: string | null;
  date_created?: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown>;
  point_of_interaction?: {
    transaction_data?: { subscription_id?: string };
  };
}

export class MercadoPagoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const msg =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Mercado Pago respondió ${status}`;
    super(msg);
  }
}

export class MercadoPagoClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.accessToken) {
      throw new MercadoPagoApiError(500, { message: 'MP_ACCESS_TOKEN no está configurado' });
    }
    const res = await fetch(`${MP_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) throw new MercadoPagoApiError(res.status, json);
    return json as T;
  }

  // ---------- Planes (preapproval_plan) ----------
  createPlan(body: {
    reason: string;
    auto_recurring: MpAutoRecurring;
    back_url: string;
  }) {
    return this.request<MpPreapprovalPlan>('POST', '/preapproval_plan', body);
  }

  updatePlan(id: string, body: Partial<{ reason: string; auto_recurring: Partial<MpAutoRecurring>; back_url: string; status: string }>) {
    return this.request<MpPreapprovalPlan>('PUT', `/preapproval_plan/${id}`, body);
  }

  getPlan(id: string) {
    return this.request<MpPreapprovalPlan>('GET', `/preapproval_plan/${id}`);
  }

  // ---------- Suscripciones (preapproval) ----------
  createPreapproval(body: {
    preapproval_plan_id: string;
    reason?: string;
    external_reference: string;
    payer_email: string;
    card_token_id: string;
    back_url: string;
    status: 'authorized' | 'pending';
  }) {
    return this.request<MpPreapproval>('POST', '/preapproval', body);
  }

  getPreapproval(id: string) {
    return this.request<MpPreapproval>('GET', `/preapproval/${id}`);
  }

  updatePreapproval(id: string, body: { status?: MpPreapprovalStatus; card_token_id?: string }) {
    return this.request<MpPreapproval>('PUT', `/preapproval/${id}`, body);
  }

  // ---------- Cobros ----------
  getAuthorizedPayment(id: string) {
    return this.request<MpAuthorizedPayment>('GET', `/authorized_payments/${id}`);
  }

  getPayment(id: string) {
    return this.request<MpPayment>('GET', `/v1/payments/${id}`);
  }
}
