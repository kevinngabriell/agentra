import { apiFetch, apiPath, withQuery } from "./client"

export type NotificationType =
    | 'expiring_today' | 'expiring_week' | 'policy_lapsed'
    | 'premium_overdue' | 'commission_received' | 'claim_status'

export interface AppNotification {
    notification_id: string
    type: NotificationType
    title: string
    body: string | null
    /** App path of the record the notification is about. */
    link: string | null
    read_at: string | null
    created_at: string
}

export interface NotificationFeed {
    items: AppNotification[]
    unread_count: number
}

export async function getNotifications(token: string, limit = 20, signal?: AbortSignal): Promise<NotificationFeed> {
    return apiFetch<NotificationFeed>(withQuery('/notifications', new URLSearchParams({ limit: String(limit) })), { token, signal })
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
    await apiFetch(apiPath`/notifications/${id}/read`, { method: 'POST', token })
}

export async function markAllNotificationsRead(token: string): Promise<void> {
    await apiFetch('/notifications/read-all', { method: 'POST', token })
}
