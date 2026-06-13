const BASE_URL = process.env.NEXT_PUBLIC_API_URL

async function req<T>(
    method: string,
    path: string,
    token: string,
    body?: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data as T
}

export interface ApiSubscription {
    subscription_id: string
    plan_name: string
    billing_cycle: string
    status: string
    next_billing_date: string
    usage: {
        policies: number
        max_policies: number
    }
}

export async function getCurrentSubscription(token: string): Promise<ApiSubscription> {
    return req<ApiSubscription>('GET', '/subscription/current', token)
}

export async function changePlan(
    token: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'yearly',
): Promise<void> {
    await req<unknown>('PUT', '/subscription/change-plan', token, {
        new_plan_id: newPlanId,
        billing_cycle: billingCycle,
    })
}
