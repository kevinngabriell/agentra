"use client"

import { Alert, Button, Card, Checkbox, Field, Flex, Image, Input, Link, Text, chakra } from "@chakra-ui/react"
import { PasswordInput } from "../../components/ui/password-input"
import { useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { LoginAgent } from "@/lib/auth/auth"
import { getRememberedEmail, saveBrowserCredential, saveTokens, setRememberedEmail } from "@/lib/auth/session"
import iconImg from "@/assets/icon.svg"

function subscribeToStorage(onChange: () => void) {
    window.addEventListener("storage", onChange)
    return () => window.removeEventListener("storage", onChange)
}

export default function Login() {
    const router = useRouter()

    // Read via useSyncExternalStore so SSR/hydration render the empty form first, then the saved email.
    const rememberedEmail = useSyncExternalStore(subscribeToStorage, getRememberedEmail, () => null)
    const [emailInput, setEmail] = useState<string | null>(null)
    const [rememberInput, setRememberMe] = useState<boolean | null>(null)
    const email = emailInput ?? rememberedEmail ?? ""
    const rememberMe = rememberInput ?? rememberedEmail !== null
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
    const [alert, setAlert] = useState<{ status: "success" | "error"; message: string } | null>(null)

    function clearFieldError(field: "email" | "password") {
        setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
    }

    function validate(): boolean {
        const errs: { email?: string; password?: string } = {}
        if (!email.trim()) {
            errs.email = "Email wajib diisi"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errs.email = "Format email tidak valid"
        }
        if (!password) {
            errs.password = "Password wajib diisi"
        }
        setFieldErrors(errs)
        return Object.keys(errs).length === 0
    }

    async function handleLogin(e: React.SyntheticEvent) {
        e.preventDefault()
        setAlert(null)
        if (!validate()) return

        setLoading(true)
        try {
            const trimmedEmail = email.trim()
            setEmail(trimmedEmail) // pin it, so clearing the remembered email below doesn't blank the field
            const tokens = await LoginAgent({ email: trimmedEmail, password })
            saveTokens(tokens.access_token, tokens.refresh_token, rememberMe)
            setRememberedEmail(rememberMe ? trimmedEmail : null)
            if (rememberMe) void saveBrowserCredential(trimmedEmail, password)
            setAlert({ status: "success", message: "Login berhasil! Mengarahkan ke dashboard..." })
            setTimeout(() => router.push("/agentra/dashboard"), 1500)
        } catch (err: any) {
            setAlert({ status: "error", message: err.message || "Email atau password salah. Silakan coba lagi." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Flex
            backgroundColor="#1A3557"
            p={16}
            gap="31.18px"
            flexDir="column"
            minH="100vh"
            alignItems="center"
            justifyContent="center"
        >
            <Card.Root backgroundColor="#FFFFFF" p="32px" w={{ base: "450px", md: "500px" }}>
                <Card.Body alignItems="center" w="100%">
                    <Flex pb="32px" flexDir="column" alignItems="center" gap="4px">
                        <Image src={iconImg.src} alt="Agentra" w="64px" h="64px" />
                        <Text color="#001F40" fontSize={32} fontWeight="bold">Agentra</Text>
                        <Text color="#5D6D7E" fontSize="14px" textAlign="center">
                            Masuk ke Agentra CRM untuk mengelola polis dan nasabah Anda.
                        </Text>
                    </Flex>

                    {alert && (
                        <Alert.Root
                            status={alert.status}
                            mb="20px"
                            borderRadius="8px"
                            w="100%"
                            backgroundColor={alert.status === "error" ? "#FEE2E2" : "#DCFCE7"}
                            color={alert.status === "error" ? "#991B1B" : "#166534"}
                        >
                            <Alert.Indicator />
                            <Alert.Description fontSize="14px">{alert.message}</Alert.Description>
                        </Alert.Root>
                    )}

                    <chakra.form display="flex" gap="20px" flexDir="column" w="100%" onSubmit={handleLogin} noValidate>
                        <Field.Root invalid={!!fieldErrors.email}>
                            <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                                Email
                            </Field.Label>
                            <Input
                                type="email"
                                name="email"
                                autoComplete="username"
                                placeholder="nama@perusahaan.com"
                                borderColor={fieldErrors.email ? "border.error" : "#DDE1E7"}
                                borderRadius={8}
                                fontSize="14px"
                                color="#1C2833"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); clearFieldError("email") }}
                                disabled={loading}
                            />
                            {fieldErrors.email && (
                                <Field.ErrorText fontSize="12px">{fieldErrors.email}</Field.ErrorText>
                            )}
                        </Field.Root>

                        <Field.Root invalid={!!fieldErrors.password}>
                            <Flex justify="space-between" align="center" w="100%" mb="4px">
                                <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px" mb={0}>
                                    Password
                                </Field.Label>
                                <Link
                                    href="/forgot-password"
                                    style={{ fontSize: "12px", color: "#006397", textDecoration: "none" }}
                                >
                                    Lupa password?
                                </Link>
                            </Flex>
                            <PasswordInput
                                name="password"
                                autoComplete="current-password"
                                placeholder="Masukkan password"
                                size="md"
                                rounded="lg"
                                fontSize="14px"
                                color="#1C2833"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); clearFieldError("password") }}
                                disabled={loading}
                            />
                            {fieldErrors.password && (
                                <Field.ErrorText fontSize="12px">{fieldErrors.password}</Field.ErrorText>
                            )}
                        </Field.Root>

                        <Checkbox.Root
                            checked={rememberMe}
                            onCheckedChange={(v) => setRememberMe(!!v.checked)}
                            disabled={loading}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                            <Checkbox.Label fontSize="13px" color="#5D6D7E">
                                Ingat Saya
                            </Checkbox.Label>
                        </Checkbox.Root>

                        <Button
                            type="submit"
                            backgroundColor="#001F40"
                            color="#FFFFFF"
                            fontSize="16px"
                            borderRadius="8px"
                            loading={loading}
                            loadingText="Memproses..."
                            _hover={{ bg: "#0a2d5a" }}
                            disabled={loading}
                        >
                            Masuk
                        </Button>
                    </chakra.form>

                    <Text color="#AEB6BF" fontSize={12} pt="32px">
                        Agent Portal v2.4.0 — Secured by Movira
                    </Text>
                </Card.Body>

                <Card.Footer p={0} justifyContent="center">
                    <Text color="#5D6D7E" fontSize="14px" fontWeight="semibold">
                        Belum punya akun?{" "}
                        <Link href="/register" style={{ color: "#006397" }}>
                            Daftar Disini
                        </Link>
                    </Text>
                </Card.Footer>
            </Card.Root>

            <Flex flexDir="column" gap="16px" alignItems="center">
                <Text color="#859EC6" fontSize={12} textAlign="center">
                    © 2024 Insurance CRM Indonesia. Seluruh hak cipta dilindungi undang-undang.
                </Text>
                <Flex justifyContent="space-between" width="max-content" gap="16px">
                    <Text color="#859EC6" fontSize={12}>Syarat &amp; Ketentuan</Text>
                    <Text color="#859EC6" fontSize={12}>Kebijakan Privasi</Text>
                    <Text color="#859EC6" fontSize={12}>Bantuan</Text>
                </Flex>
            </Flex>
        </Flex>
    )
}
