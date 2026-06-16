const BASE_URL = process.env.NEXT_PUBLIC_API_URL

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

async function apiReq<T>(
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

export async function getMyProfile(token: string): Promise<UserProfile> {
    return apiReq<UserProfile>('GET', '/users/me', token)
}

export interface UpdateProfilePayload {
    first_name?: string
    phone_number?: string
    language?: string
}

export async function updateProfile(token: string, data: UpdateProfilePayload): Promise<UserProfile> {
    return apiReq<UserProfile>('PUT', '/users/me', token, data as unknown as Record<string, unknown>)
}

export async function changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    await apiReq<unknown>('PUT', '/users/me/password', token, {
        current_password: currentPassword,
        new_password: newPassword,
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
}

export async function updateNotificationSettings(
    token: string,
    data: NotificationSettingsPayload,
): Promise<void> {
    await apiReq<unknown>('PUT', '/users/me/notification-settings', token, data as unknown as Record<string, unknown>)
}
