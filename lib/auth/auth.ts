export interface RegisterAgentPayload {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    whatsapp_number: string;
    business_name: string;
    city: string;
    plan: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export async function RegisterAgent(input: RegisterAgentPayload): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const appId = process.env.NEXT_PUBLIC_APP_ID;
    const appRoleId = process.env.NEXT_PUBLIC_APP_ROLE_ID;

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: input.name,
            email: input.email,
            password: input.password,
            password_confirmation: input.password_confirmation,
            phone: input.phone,
            whatsapp_number: input.whatsapp_number,
            business_name: input.business_name,
            city: input.city,
            plan: input.plan,
            app_id: appId,
            app_role_id: appRoleId,
        })
    });

    const json = await res.json();

    if (!res.ok) {
        const err: any = new Error(json.status_message || json.message || 'Pendaftaran gagal');
        err.errors = json.errors || {};
        err.status = res.status;
        throw err;
    }

    return json;
}

export async function ForgotPassword(email: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const json = await res.json();

    if (!res.ok) {
        throw new Error(json.status_message || json.message || 'Gagal mengirim kode OTP');
    }
}

export interface ResetPasswordPayload {
    token: string;
    password: string;
    password_confirmation: string;
}

export async function ResetPassword(input: ResetPasswordPayload): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    const json = await res.json();

    if (!res.ok) {
        throw new Error(json.status_message || json.message || 'Gagal mengatur ulang password');
    }
}

export async function RefreshToken(refreshToken: string): Promise<AuthTokens> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL

    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
    })

    const json = await res.json()

    if (!res.ok) {
        throw new Error(json.status_message || json.message || 'Token refresh failed')
    }

    return json.data
}

export async function Logout(accessToken?: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
    await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    }).catch(() => {})
}

export async function LoginAgent(input: LoginPayload): Promise<AuthTokens> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.email, password: input.password }),
    });

    const json = await res.json();

    if (!res.ok) {
        const err: any = new Error(json.status_message || json.message || 'Email atau password salah');
        err.status = res.status;
        throw err;
    }

    return json.data;
}
