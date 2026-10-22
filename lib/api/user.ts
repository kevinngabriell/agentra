import { apiFetch, apiFetchOr } from "./client"

export interface UserProfile {
    user_id: string
    username: string
    first_name: string
    email: string
    phone_number: string
    language: string
    app_role_id: string
    account_status: string
}

// TopBar mounts on every page (there is no shared /agentra layout), so the profile is
// cached for the session instead of re-fetching /users/me on every navigation.
let profileCache: Promise<UserProfile> | null = null

export function clearProfileCache() {
    profileCache = null
}

export async function getMyProfile(token: string): Promise<UserProfile> {
    if (!profileCache) {
        profileCache = apiFetch<UserProfile>('/users/me', { token })
        profileCache.catch(() => { profileCache = null })
    }
    return profileCache
}

export interface UpdateProfilePayload {
    first_name?: string
    phone_number?: string
    language?: string
}

export async function updateProfile(token: string, data: UpdateProfilePayload): Promise<UserProfile> {
    const updated = await apiFetch<UserProfile>('/users/me', { method: 'PUT', token, body: data })
    if (updated) profileCache = Promise.resolve(updated)
    else clearProfileCache()
    return updated
}

export async function changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    await apiFetch<unknown>('/users/me/password', {
        method: 'PUT',
        token,
        body: { current_password: currentPassword, new_password: newPassword },
    })
}

export interface NotificationSettingsPayload {
    daily_digest_enabled?: boolean
    daily_digest_time?: string
    daily_days_of_week?: string
    monthly_digest_enabled?: boolean
    monthly_digest_day?: number
    monthly_digest_time?: string
    whatsapp_target_number?: string
    renewal_reminder_enabled?: boolean
    renewal_reminder_days?: number
    renewal_wa_message_template?: string
}

export interface NotificationSettings {
    setting_id: string
    company_id: string
    user_id: string
    daily_digest_enabled: boolean
    daily_digest_time: string | null
    daily_days_of_week: string | null
    monthly_digest_enabled: boolean
    monthly_digest_day: number | null
    monthly_digest_time: string | null
    whatsapp_target_number: string | null
    renewal_reminder_enabled?: boolean
    renewal_reminder_days: number
    renewal_wa_message_template: string | null
    updated_by?: string
    updated_at?: string
}

export async function updateNotificationSettings(
    token: string,
    data: NotificationSettingsPayload,
): Promise<void> {
    await apiFetch<unknown>('/users/me/notification-settings', { method: 'PUT', token, body: data })
}

// 404 = the user never saved notification settings yet.
export async function getNotificationSettings(token: string): Promise<NotificationSettings | null> {
    return apiFetchOr<NotificationSettings | null>('/users/me/notification-settings', { token }, null)
}
