const AT_KEY = 'agentra_at'
const RT_KEY = 'agentra_rt'
const REMEMBER_EMAIL_KEY = 'agentra_remember_email'

export function saveTokens(accessToken: string, refreshToken: string, persist: boolean) {
    if (typeof window === 'undefined') return
    const storage = persist ? localStorage : sessionStorage
    storage.setItem(AT_KEY, accessToken)
    storage.setItem(RT_KEY, refreshToken)
}

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AT_KEY) ?? sessionStorage.getItem(AT_KEY)
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(RT_KEY) ?? sessionStorage.getItem(RT_KEY)
}

export function clearTokens() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(AT_KEY)
    localStorage.removeItem(RT_KEY)
    sessionStorage.removeItem(AT_KEY)
    sessionStorage.removeItem(RT_KEY)
}

export function isTokenExpired(token: string): boolean {
    try {
        const payloadB64 = token.split('.')[1]
        const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
        const payload = JSON.parse(atob(padded))
        return payload.exp * 1000 < Date.now()
    } catch {
        return true
    }
}

export function wasPersisted(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(AT_KEY) !== null
}

// "Ingat Saya" only remembers the email. The password is never written to web storage;
// it is left to the browser's password manager (see saveBrowserCredential).
export function getRememberedEmail(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REMEMBER_EMAIL_KEY)
}

export function setRememberedEmail(email: string | null) {
    if (typeof window === 'undefined') return
    if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBER_EMAIL_KEY)
}

// Asks the browser to store the credential where it supports the Credential Management API
// (Chromium). Elsewhere the browser's own "save password" prompt handles it via the login <form>.
export async function saveBrowserCredential(email: string, password: string) {
    if (typeof window === 'undefined') return
    const PasswordCredential = (window as unknown as {
        PasswordCredential?: new (data: { id: string; password: string }) => Credential
    }).PasswordCredential
    if (!PasswordCredential) return
    try {
        await navigator.credentials.store(new PasswordCredential({ id: email, password }))
    } catch {
        // Best effort only; login must not fail because the browser refused to store it.
    }
}
