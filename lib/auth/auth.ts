export interface RegisterAgentPayload {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    whatsapp_number: string;
    business_name: string;
    city?: string;
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

type ApiAuthError = Error & { status: number; errors?: Record<string, string>; requestId?: string };

// Auth endpoints are called without a token, so they don't go through lib/api/client.
// They still must not call res.json() blindly: a 502 HTML page would throw a SyntaxError
// with no status and hide the real failure.
async function readJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text().catch(() => '');
    if (!text) return {};
    try {
        const parsed: unknown = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}): Promise<{ res: Response; json: Record<string, unknown> }> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    let res: Response;
    try {
        res = await fetch(`${baseUrl}/api/v1${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw authError('Koneksi terputus. Periksa internet Anda.', 0);
    }
    return { res, json: await readJson(res) };
}

function authError(message: string, status: number): ApiAuthError {
    const err = new Error(message) as ApiAuthError;
    err.status = status;
    return err;
}

// Current envelope: { success: false, error: { code, message, request_id } }; older endpoints used status_message/message.
function backendError(json: Record<string, unknown>): { message?: string; requestId?: string } {
    const env = json.error as { message?: unknown; request_id?: unknown } | null | undefined;
    const m = (typeof env?.message === 'string' && env.message) || json.status_message || json.message;
    return {
        message: typeof m === 'string' && m ? m : undefined,
        requestId: typeof env?.request_id === 'string' && env.request_id ? env.request_id : undefined,
    };
}

function backendMessage(json: Record<string, unknown>): string | undefined {
    return backendError(json).message;
}

const RATE_LIMITED = 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.';
const SERVICE_DOWN = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';

export async function RegisterAgent(input: RegisterAgentPayload): Promise<Record<string, unknown>> {
    const appId = process.env.NEXT_PUBLIC_APP_ID;
    // NOTE: app_role_id is public build-time config, not a secret. The API must ignore/override
    // it for self-registration (see CODE_REVIEW.md, C-03); sending it is kept for compatibility.
    const appRoleId = process.env.NEXT_PUBLIC_APP_ROLE_ID;

    const { res, json } = await post('/auth/register', {
        name: input.name,
        email: input.email,
        password: input.password,
        password_confirmation: input.password_confirmation,
        phone: input.phone,
        whatsapp_number: input.whatsapp_number,
        business_name: input.business_name,
        city: input.city ?? '',
        plan: input.plan,
        app_id: appId,
        app_role_id: appRoleId,
    });

    if (!res.ok) {
        const message = res.status === 429 ? RATE_LIMITED
            : res.status >= 500 ? SERVICE_DOWN
            : backendMessage(json) ?? 'Pendaftaran gagal';
        const err = authError(message, res.status);
        err.requestId = backendError(json).requestId;
        const errors = json.errors;
        err.errors = errors && typeof errors === 'object' ? (errors as Record<string, string>) : {};
        throw err;
    }

    return json;
}

// The response deliberately does not reveal whether the email is registered: a 404
// ("email not found") resolves like a success so the form can't be used to enumerate accounts.
export async function ForgotPassword(email: string): Promise<void> {
    const { res } = await post('/auth/forgot-password', { email });
    if (res.ok || res.status === 404) return;
    if (res.status === 429) throw authError(RATE_LIMITED, 429);
    if (res.status >= 500) throw authError(SERVICE_DOWN, res.status);
    throw authError('Gagal mengirim kode OTP. Periksa email Anda lalu coba lagi.', res.status);
}

export interface ResetPasswordPayload {
    token: string;
    password: string;
    password_confirmation: string;
}

export async function ResetPassword(input: ResetPasswordPayload): Promise<void> {
    const { res } = await post('/auth/reset-password', input);
    if (res.ok) return;
    if (res.status === 429) throw authError(RATE_LIMITED, 429);
    if (res.status >= 500) throw authError(SERVICE_DOWN, res.status);
    throw authError('Kode OTP salah atau sudah kedaluwarsa.', res.status);
}

export async function RefreshToken(refreshToken: string): Promise<AuthTokens> {
    const { res, json } = await post('/auth/refresh', { refresh_token: refreshToken });
    const data = json.data as AuthTokens | undefined;
    if (!res.ok || !data?.access_token) {
        throw authError(backendMessage(json) ?? 'Token refresh failed', res.ok ? 401 : res.status);
    }
    return data;
}

// Best-effort server-side revocation. Throws on network failure so callers can log it,
// but callers must clear local tokens regardless.
export async function Logout(accessToken?: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    });
}

export async function LoginAgent(input: LoginPayload): Promise<AuthTokens> {
    const { res, json } = await post('/auth/login', { email: input.email, password: input.password });
    const data = json.data as AuthTokens | undefined;

    if (!res.ok || !data?.access_token) {
        // Generic message on purpose: the backend's text can distinguish "unknown email"
        // from "wrong password", which would let the form enumerate accounts.
        const message = res.status === 429 ? RATE_LIMITED
            : res.status >= 500 ? SERVICE_DOWN
            : res.status === 403 ? (backendMessage(json) ?? 'Akun Anda tidak dapat masuk saat ini. Hubungi dukungan.')
            : 'Email atau password salah. Silakan coba lagi.';
        throw authError(message, res.ok ? 500 : res.status);
    }

    return data;
}
