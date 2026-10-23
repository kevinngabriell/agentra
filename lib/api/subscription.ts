import { apiFetch } from "./client"

export type PlanTier = 'starter' | 'pro' | 'team'

export interface ApiPendingPayment {
    payment_id: string
    order_id: string
    service_id: string
    amount: number
    status: string
    payment_link_url: string | null
    expires_at: string | null
}

export interface ApiSubscription {
    subscription_id: string
    plan: { plan_id: string; name: string; price_idr: number }
    billing_cycle: string
    status: string
    payment_status: string
    current_period_start: string
    current_period_end: string
    next_billing_date: string
    /** What the company can use right now: a paid plan that is unpaid or lapsed falls back to Starter. */
    effective: {
        tier: PlanTier
        plan_name: string
        subscribed_tier: PlanTier
        in_effect: boolean
        /** null = unlimited */
        policy_limit: number | null
        features: string[]
    }
    pending_payment: ApiPendingPayment | null
    usage: { active_policy_count: number }
}

export interface ApiCheckout {
    payment_id: string
    order_id: string
    service_id: string
    service_name: string
    amount: number
    status: string
    payment_link_url: string
    expires_at: string
}

export interface ApiSubscriptionPayment {
    payment_id: string
    order_id: string
    service_id: string
    amount: number
    status: 'pending' | 'completed' | 'failed' | 'expired'
    payment_link_url: string | null
    is_activated: boolean
}

export async function getCurrentSubscription(token: string): Promise<ApiSubscription> {
    return apiFetch<ApiSubscription>('/subscription/current', { token })
}

/** Starts a SumoPod (QRIS) payment for a paid plan; the plan activates when the payment webhook arrives. */
export async function checkoutPlan(token: string, serviceId: string): Promise<ApiCheckout> {
    return apiFetch<ApiCheckout>('/subscription/checkout', { method: 'POST', token, body: { service_id: serviceId } })
}

export async function getSubscriptionPayment(token: string, paymentId: string): Promise<ApiSubscriptionPayment> {
    return apiFetch<ApiSubscriptionPayment>(`/subscription/payments/${encodeURIComponent(paymentId)}`, { token })
}

/** Moves the company down to a free plan. Paid plans are bought through checkoutPlan. */
export async function changePlan(
    token: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'yearly',
): Promise<void> {
    await apiFetch<unknown>('/subscription/change-plan', {
        method: 'PUT',
        token,
        body: { new_plan_id: newPlanId, billing_cycle: billingCycle },
    })
}
