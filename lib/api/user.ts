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

export async function getMyProfile(token: string): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Failed to fetch profile')
        err.status = res.status
        throw err
    }
    return json.data as UserProfile
}
