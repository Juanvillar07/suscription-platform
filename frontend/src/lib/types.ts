export type Role = 'USER' | 'ADMIN'
export type SubscriptionStatus = 'PENDING' | 'AUTHORIZED' | 'PAUSED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED'
export type FrequencyType = 'DAYS' | 'MONTHS'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  features: string[]
  price: number
  currency: string
  frequency: number
  frequencyType: FrequencyType
  freeTrialDays: number | null
  mpPreapprovalPlanId: string | null
  isActive: boolean
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  mpPreapprovalId: string | null
  status: SubscriptionStatus
  payerEmail: string
  startDate: string | null
  nextPaymentDate: string | null
  cancelledAt: string | null
  createdAt: string
  plan: Plan
}

export interface Payment {
  id: string
  subscriptionId: string
  mpPaymentId: string | null
  amount: number
  currency: string
  status: PaymentStatus
  statusDetail: string | null
  paidAt: string | null
  createdAt: string
  subscription?: {
    id: string
    plan?: { name: string }
    user?: { email: string; name: string }
  }
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export interface AdminStats {
  activeSubscriptions: number
  pausedSubscriptions: number
  cancelledSubscriptions: number
  mrr: number
  paymentsThisMonth: number
  revenueThisMonth: number
  currency: string
}

export interface AdminSubscription extends Omit<Subscription, 'plan'> {
  plan: Pick<Plan, 'id' | 'name' | 'price'>
  user: Pick<User, 'id' | 'name' | 'email'>
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
