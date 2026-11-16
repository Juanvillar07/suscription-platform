import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { AdminStats, AdminSubscription, Paginated, Payment, Plan, Subscription } from '@/lib/types'

export const keys = {
  plans: ['plans'] as const,
  plan: (id: string) => ['plans', id] as const,
  mySubscription: ['subscriptions', 'me'] as const,
  myPayments: ['subscriptions', 'me', 'payments'] as const,
  adminPlans: ['admin', 'plans'] as const,
  adminSubscriptions: (status?: string) => ['admin', 'subscriptions', status ?? 'all'] as const,
  adminPayments: ['admin', 'payments'] as const,
  adminStats: ['admin', 'stats'] as const,
}

// ---------- Público ----------
export const usePlans = () =>
  useQuery({ queryKey: keys.plans, queryFn: async () => (await api.get<Plan[]>('/plans')).data })

export const usePlan = (id: string) =>
  useQuery({ queryKey: keys.plan(id), queryFn: async () => (await api.get<Plan>(`/plans/${id}`)).data })

// ---------- Usuario ----------
/** pollWhilePending: reconsulta cada 3 s mientras el estado sea PENDING (esperando webhook) */
export function useMySubscription(options?: { pollWhilePending?: boolean }) {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.mySubscription,
    // Solo con sesión (evita 401 en páginas públicas mientras se restaura la sesión)
    enabled: !!user,
    queryFn: async () => (await api.get<Subscription | null>('/subscriptions/me')).data ?? null,
    refetchInterval: (q) => (options?.pollWhilePending && q.state.data?.status === 'PENDING' ? 3000 : false),
  })
}

export const useMyPayments = () =>
  useQuery({
    queryKey: keys.myPayments,
    queryFn: async () => (await api.get<Payment[]>('/subscriptions/me/payments')).data,
  })

export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { planId: string; cardTokenId: string; payerEmail: string }) =>
      (await api.post<Subscription>('/subscriptions', body)).data,
    onSuccess: (sub) => qc.setQueryData(keys.mySubscription, sub),
  })
}

export function useSubscriptionAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'pause' | 'resume' | 'cancel' | 'sync' }) =>
      (await api.post<Subscription>(`/subscriptions/${id}/${action}`)).data,
    onSuccess: (sub) => {
      qc.setQueryData(keys.mySubscription, sub)
      void qc.invalidateQueries({ queryKey: keys.myPayments })
    },
  })
}

export const usePremiumContent = () =>
  useQuery({
    queryKey: ['content', 'premium'],
    queryFn: async () =>
      (await api.get<{ title: string; message: string; items: { id: number; title: string; description: string }[] }>(
        '/content/premium',
      )).data,
    retry: false,
  })

// ---------- Admin ----------
export const useAdminPlans = () =>
  useQuery({ queryKey: keys.adminPlans, queryFn: async () => (await api.get<Plan[]>('/admin/plans')).data })

export type PlanInput = Pick<Plan, 'name' | 'slug' | 'price' | 'frequency' | 'frequencyType' | 'features'> & {
  description?: string
  freeTrialDays?: number
}

export function useAdminPlanMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.adminPlans })
    void qc.invalidateQueries({ queryKey: keys.plans })
  }
  return {
    create: useMutation({
      mutationFn: async (body: PlanInput) => (await api.post<Plan>('/admin/plans', body)).data,
      onSuccess: invalidate,
    }),
    toggle: useMutation({
      mutationFn: async (plan: Plan) =>
        (await api.patch<Plan>(`/admin/plans/${plan.id}`, { isActive: !plan.isActive })).data,
      onSuccess: invalidate,
    }),
    sync: useMutation({
      mutationFn: async (id: string) => (await api.post<Plan>(`/admin/plans/${id}/sync-mp`)).data,
      onSuccess: invalidate,
    }),
  }
}

export const useAdminSubscriptions = (status?: string) =>
  useQuery({
    queryKey: keys.adminSubscriptions(status),
    queryFn: async () =>
      (await api.get<Paginated<AdminSubscription>>('/admin/subscriptions', { params: { status, pageSize: 50 } }))
        .data,
  })

export const useAdminPayments = () =>
  useQuery({ queryKey: keys.adminPayments, queryFn: async () => (await api.get<Payment[]>('/admin/payments')).data })

export const useAdminStats = () =>
  useQuery({ queryKey: keys.adminStats, queryFn: async () => (await api.get<AdminStats>('/admin/stats')).data })
