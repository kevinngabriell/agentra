import { getAccessToken, clearTokens } from "./session"
import { Logout } from "./auth"
import { clearProfileCache } from "@/lib/api/user"

// Ends the session locally first (so a slow or failing API can never keep the user
// signed in), then asks the API to revoke the tokens on a best-effort basis.
export async function logout(): Promise<void> {
    const at = getAccessToken()
    clearTokens()
    clearProfileCache()
    if (!at) return
    try {
        await Logout(at)
    } catch (err) {
        console.error("Logout API call failed; the token may remain valid server-side until it expires", err)
    }
}
