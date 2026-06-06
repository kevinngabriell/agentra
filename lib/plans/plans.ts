export interface Plan {
  plan_id: string
  name: string
  tagline: string
  price_idr: number
  billing_cycle: string
  is_available: boolean
  features: Array<{ label: string; sort_order: number }>
}

export async function getPlans(): Promise<Plan[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  const appId = process.env.NEXT_PUBLIC_APP_ID
  const params = appId ? `?app_id=${encodeURIComponent(appId)}` : ""

  const res = await fetch(`${baseUrl}/api/v1/plans${params}`)
  if (!res.ok) return []

  const json = await res.json()
  return (json.data ?? []).filter((p: Plan) => p.is_available !== false)
}

export function formatPlanPrice(priceIdr: number): string {
  if (!priceIdr) return "Gratis"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceIdr)
}

export function formatBillingCycle(billingCycle: string): string {
  if (billingCycle === "monthly") return "/bulan"
  if (billingCycle === "yearly") return "/tahun"
  return ""
}
