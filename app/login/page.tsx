"use client"

import { Alert, Button, Card, Checkbox, Field, Flex, Image, Input, Link, Text } from "@chakra-ui/react"
import { PasswordInput } from "../../components/ui/password-input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginAgent } from "@/lib/auth/auth"
import { saveTokens } from "@/lib/auth/session"

export default function Login() {
    const router = useRouter()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
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

    async function handleLogin() {
        setAlert(null)
        if (!validate()) return

        setLoading(true)
        try {
            const tokens = await LoginAgent({ email: email.trim(), password })
            saveTokens(tokens.access_token, tokens.refresh_token, rememberMe)
            setAlert({ status: "success", message: "Login berhasil! Mengarahkan ke dashboard..." })
            setTimeout(() => router.push("/agentra/dashboard"), 1500)
        } catch (err: any) {
            setAlert({ status: "error", message: err.message || "Email atau password salah. Silakan coba lagi." })
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") handleLogin()
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
                        <Image src="../assets/icon.svg" alt="Agentra" />
                        <Text color="#001F40" fontSize={32} fontWeight="bold">Agentra</Text>
                        <Text color="#5D6D7E" fontSize="14px" textAlign="center">
                            Masuk ke Agentra CRM untuk mengelola polis dan nasabah Anda.
                        </Text>
                    </Flex>

                    {alert && (
                        <Alert.Root status={alert.status} mb="20px" borderRadius="8px" w="100%">
                            <Alert.Indicator />
                            <Alert.Description fontSize="14px">{alert.message}</Alert.Description>
                        </Alert.Root>
                    )}

                    <Flex gap="20px" flexDir="column" w="100%" onKeyDown={handleKeyDown}>
                        <Field.Root invalid={!!fieldErrors.email}>
                            <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                                Email
                            </Field.Label>
                            <Input
                                type="email"
                                placeholder="nama@perusahaan.com"
                                borderColor="#DDE1E7"
                                borderRadius={8}
                                fontSize="14px"
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
                                placeholder="Masukkan password"
                                size="md"
                                rounded="lg"
                                fontSize="14px"
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
                            onClick={handleLogin}
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
                    </Flex>

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
