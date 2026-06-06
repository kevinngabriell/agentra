"use client"

import { useState, useRef, useEffect } from "react"
import { Alert, Box, Button, Card, Field, Flex, Image, Input, Text } from "@chakra-ui/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiLock, FiMessageCircle } from "react-icons/fi"
import { PasswordInput, PasswordStrengthMeter } from "@/components/ui/password-input"
import { ForgotPassword, ResetPassword } from "@/lib/auth/auth"

type Step = 1 | 2 | 3

function StepDots({ current }: { current: Step }) {
    return (
        <Flex gap="6px" justify="center" mb="28px">
            {([1, 2, 3] as Step[]).map((s) => (
                <Box
                    key={s}
                    w="28px"
                    h="4px"
                    borderRadius="2px"
                    bg={s < current ? "#0D1B3E" : s === current ? "#3B82F6" : "#D1D5DB"}
                    transition="background 0.3s"
                />
            ))}
        </Flex>
    )
}

function calcStrength(pwd: string): number {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
}

export default function ForgotPasswordPage() {
    const router = useRouter()

    const [step, setStep] = useState<Step>(1)
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState(Array<string>(6).fill(""))
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [canResend, setCanResend] = useState(false)
    const [alert, setAlert] = useState<{ status: "success" | "error"; message: string } | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const otpRefs = useRef<(HTMLInputElement | null)[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

    function startCountdown() {
        if (timerRef.current) clearInterval(timerRef.current)
        setCountdown(60)
        setCanResend(false)
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!)
                    setCanResend(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    // ── Step 1 ───────────────────────────────────────────────────────────────
    function validateEmail(): boolean {
        if (!email.trim()) { setFieldErrors({ email: "Email wajib diisi" }); return false }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setFieldErrors({ email: "Format email tidak valid" }); return false
        }
        setFieldErrors({})
        return true
    }

    async function handleSendOtp() {
        setAlert(null)
        if (!validateEmail()) return
        setLoading(true)
        try {
            await ForgotPassword(email.trim())
            setOtp(Array(6).fill(""))
            startCountdown()
            setStep(2)
            setTimeout(() => otpRefs.current[0]?.focus(), 120)
        } catch (err: any) {
            setAlert({ status: "error", message: err.message || "Gagal mengirim kode OTP." })
        } finally {
            setLoading(false)
        }
    }

    async function handleResend() {
        setAlert(null)
        setLoading(true)
        try {
            await ForgotPassword(email.trim())
            setOtp(Array(6).fill(""))
            startCountdown()
            setTimeout(() => otpRefs.current[0]?.focus(), 120)
        } catch (err: any) {
            setAlert({ status: "error", message: err.message || "Gagal mengirim ulang kode OTP." })
        } finally {
            setLoading(false)
        }
    }

    // ── Step 2 ───────────────────────────────────────────────────────────────
    function handleOtpChange(index: number, value: string) {
        if (!/^\d*$/.test(value)) return
        const next = [...otp]
        next[index] = value.slice(-1)
        setOtp(next)
        if (value && index < 5) otpRefs.current[index + 1]?.focus()
    }

    function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const next = [...otp]; next[index - 1] = ""; setOtp(next)
            otpRefs.current[index - 1]?.focus()
        }
    }

    function handleOtpPaste(e: React.ClipboardEvent) {
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
        if (!text) return
        e.preventDefault()
        const next = [...text.split(""), ...Array(6 - text.length).fill("")]
        setOtp(next)
        otpRefs.current[Math.min(text.length, 5)]?.focus()
    }

    function handleVerifyOtp() {
        if (otp.join("").length < 6) {
            setAlert({ status: "error", message: "Masukkan 6 digit kode OTP." }); return
        }
        setAlert(null)
        setNewPassword("")
        setConfirmPassword("")
        setFieldErrors({})
        setStep(3)
    }

    // ── Step 3 ───────────────────────────────────────────────────────────────
    function validatePasswords(): boolean {
        const errs: Record<string, string> = {}
        if (!newPassword) { errs.newPassword = "Password wajib diisi" }
        else if (newPassword.length < 8) { errs.newPassword = "Password minimal 8 karakter" }
        if (!confirmPassword) { errs.confirmPassword = "Konfirmasi password wajib diisi" }
        else if (newPassword !== confirmPassword) { errs.confirmPassword = "Konfirmasi password tidak cocok" }
        setFieldErrors(errs)
        return Object.keys(errs).length === 0
    }

    async function handleResetPassword() {
        setAlert(null)
        if (!validatePasswords()) return
        setLoading(true)
        try {
            await ResetPassword({ token: otp.join(""), password: newPassword, password_confirmation: confirmPassword })
            setAlert({ status: "success", message: "Password berhasil diubah! Mengarahkan ke halaman login..." })
            setTimeout(() => router.push("/login"), 2000)
        } catch (err: any) {
            setAlert({ status: "error", message: err.message || "Gagal mengatur ulang password." })
        } finally {
            setLoading(false)
        }
    }

    function goBackToStart() {
        setStep(1)
        setOtp(Array(6).fill(""))
        setAlert(null)
        setFieldErrors({})
    }

    const otpComplete = otp.every((d) => d !== "")
    const strength = calcStrength(newPassword)

    return (
        <Flex
            backgroundColor="#1A3557"
            flexDir="column"
            minH="100vh"
            alignItems="center"
            justifyContent="center"
            p={16}
            gap="24px"
        >
            <Card.Root backgroundColor="#FFFFFF" p="32px" w={{ base: "420px", md: "460px" }}>
                <Card.Body alignItems="center" w="100%" p={0}>
                    <StepDots current={step} />

                    {/* ── STEP 1: Email ───────────────────────────────────── */}
                    {step === 1 && (
                        <>
                            <Flex flexDir="column" alignItems="center" mb="28px" gap="6px">
                                <Image src="../assets/icon.svg" alt="Agentra" w="44px" h="44px" mb="2px" />
                                <Text color="#001F40" fontSize="22px" fontWeight="bold" lineHeight="1">Agentra</Text>
                                <Text color="#001F40" fontSize="19px" fontWeight="bold" mt="8px">Lupa Password?</Text>
                                <Text color="#5D6D7E" fontSize="13px" textAlign="center" lineHeight="1.6">
                                    Masukkan email akun Anda. Kami akan mengirim kode OTP ke nomor WhatsApp Anda yang terdaftar.
                                </Text>
                            </Flex>

                            {alert && (
                                <Alert.Root status={alert.status} mb="16px" borderRadius="8px" w="100%">
                                    <Alert.Indicator />
                                    <Alert.Description fontSize="13px">{alert.message}</Alert.Description>
                                </Alert.Root>
                            )}

                            <Flex flexDir="column" gap="16px" w="100%">
                                <Field.Root invalid={!!fieldErrors.email}>
                                    <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">Email</Field.Label>
                                    <Input
                                        type="email"
                                        placeholder="nama@perusahaan.com"
                                        fontSize="14px"
                                        borderColor="#DDE1E7"
                                        borderRadius="8px"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setFieldErrors({}) }}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                                        disabled={loading}
                                    />
                                    <Field.HelperText fontSize="12px" color="#5D6D7E">
                                        Gunakan email yang terdaftar di Agentra.
                                    </Field.HelperText>
                                    {fieldErrors.email && <Field.ErrorText fontSize="12px">{fieldErrors.email}</Field.ErrorText>}
                                </Field.Root>

                                <Button
                                    onClick={handleSendOtp}
                                    backgroundColor="#001F40"
                                    color="white"
                                    fontSize="15px"
                                    borderRadius="8px"
                                    loading={loading}
                                    loadingText="Mengirim..."
                                    _hover={{ bg: "#0a2d5a" }}
                                    disabled={loading}
                                >
                                    Kirim Kode OTP
                                </Button>

                                <Flex justify="center">
                                    <Link href="/login">
                                        <Text fontSize="13px" color="#006397">← Kembali ke Masuk</Text>
                                    </Link>
                                </Flex>
                            </Flex>

                            <Text color="#AEB6BF" fontSize="11px" pt="24px">Agent Portal v2.4.0 — Secured by Movira</Text>
                        </>
                    )}

                    {/* ── STEP 2: OTP ─────────────────────────────────────── */}
                    {step === 2 && (
                        <>
                            <Flex flexDir="column" alignItems="center" mb="24px" gap="8px">
                                <Flex w="56px" h="56px" borderRadius="full" bg="#ECFDF5" align="center" justify="center" mb="4px">
                                    <FiMessageCircle size={26} color="#10B981" />
                                </Flex>
                                <Text color="#001F40" fontSize="19px" fontWeight="bold">Verifikasi WhatsApp</Text>
                                <Text color="#5D6D7E" fontSize="13px" textAlign="center" lineHeight="1.6">
                                    Masukkan 6 digit kode OTP yang kami kirim via WhatsApp ke nomor terkait{" "}
                                    <Text as="span" fontWeight="bold" color="#1C2833">{email}</Text>.
                                </Text>
                                <Box px="14px" py="5px" bg="#F0FDF4" borderRadius="full" border="1px solid" borderColor="#D1FAE5">
                                    <Text fontSize="12px" color="#065F46" fontWeight="medium">Dikirim via WhatsApp</Text>
                                </Box>
                            </Flex>

                            {alert && (
                                <Alert.Root status={alert.status} mb="16px" borderRadius="8px" w="100%">
                                    <Alert.Indicator />
                                    <Alert.Description fontSize="13px">{alert.message}</Alert.Description>
                                </Alert.Root>
                            )}

                            <Flex gap="10px" mb="12px" onPaste={handleOtpPaste} justify="center">
                                {otp.map((digit, i) => (
                                    <Input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el }}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        maxLength={1}
                                        textAlign="center"
                                        fontSize="22px"
                                        fontWeight="bold"
                                        w="48px"
                                        h="56px"
                                        p={0}
                                        borderRadius="10px"
                                        borderColor={digit ? "#0D1B3E" : "#DDE1E7"}
                                        borderWidth="2px"
                                        color="#0D1B3E"
                                        _focus={{ borderColor: "#3B82F6", boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" }}
                                        disabled={loading}
                                        inputMode="numeric"
                                    />
                                ))}
                            </Flex>

                            <Text fontSize="12px" color="#5D6D7E" mb="20px" textAlign="center">
                                Kode berlaku selama 1 jam. Jangan bagikan kepada siapapun.
                            </Text>

                            <Button
                                w="100%"
                                onClick={handleVerifyOtp}
                                backgroundColor={otpComplete ? "#001F40" : "#D1D5DB"}
                                color={otpComplete ? "white" : "#9CA3AF"}
                                fontSize="15px"
                                borderRadius="8px"
                                disabled={!otpComplete || loading}
                                _hover={{ bg: otpComplete ? "#0a2d5a" : "#D1D5DB" }}
                                mb="16px"
                            >
                                Verifikasi Kode
                            </Button>

                            <Text fontSize="13px" color="#5D6D7E" textAlign="center" mb="8px">
                                Tidak menerima kode?{" "}
                                {canResend ? (
                                    <Text
                                        as="span"
                                        color="#006397"
                                        fontWeight="semibold"
                                        cursor="pointer"
                                        onClick={!loading ? handleResend : undefined}
                                        opacity={loading ? 0.5 : 1}
                                    >
                                        {loading ? "Mengirim..." : "Kirim ulang"}
                                    </Text>
                                ) : (
                                    <Text as="span">
                                        Kirim ulang dalam <Text as="span" fontWeight="bold" color="#001F40">{countdown}s</Text>
                                    </Text>
                                )}
                            </Text>

                            <Flex justify="center" mt="4px">
                                <Text fontSize="13px" color="#006397" cursor="pointer" onClick={goBackToStart}>
                                    ← Gunakan email lain
                                </Text>
                            </Flex>

                            <Text color="#AEB6BF" fontSize="11px" pt="20px">Agent Portal v2.4.0 — Secured by Movira</Text>
                        </>
                    )}

                    {/* ── STEP 3: New Password ─────────────────────────────── */}
                    {step === 3 && (
                        <>
                            <Flex flexDir="column" alignItems="center" mb="24px" gap="8px">
                                <Flex w="56px" h="56px" borderRadius="full" bg="#EFF6FF" align="center" justify="center" mb="4px">
                                    <FiLock size={24} color="#3B82F6" />
                                </Flex>
                                <Text color="#001F40" fontSize="19px" fontWeight="bold">Atur Ulang Password</Text>
                                <Text color="#5D6D7E" fontSize="13px" textAlign="center" lineHeight="1.6">
                                    Kode terverifikasi. Buat password baru untuk{" "}
                                    <Text as="span" fontWeight="bold" color="#1C2833">{email}</Text>.
                                    {" "}Minimal 8 karakter.
                                </Text>
                            </Flex>

                            {alert && (
                                <Alert.Root status={alert.status} mb="16px" borderRadius="8px" w="100%">
                                    <Alert.Indicator />
                                    <Alert.Description fontSize="13px">{alert.message}</Alert.Description>
                                </Alert.Root>
                            )}

                            <Flex flexDir="column" gap="16px" w="100%">
                                <Field.Root invalid={!!fieldErrors.newPassword}>
                                    <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">Password Baru</Field.Label>
                                    <PasswordInput
                                        placeholder="Minimal 8 karakter"
                                        fontSize="14px"
                                        rounded="lg"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value)
                                            if (fieldErrors.newPassword) setFieldErrors((p) => { const n = { ...p }; delete n.newPassword; return n })
                                        }}
                                        disabled={loading}
                                    />
                                    {newPassword.length > 0 && (
                                        <PasswordStrengthMeter value={strength} max={4} w="100%" mt="6px" />
                                    )}
                                    {fieldErrors.newPassword && <Field.ErrorText fontSize="12px">{fieldErrors.newPassword}</Field.ErrorText>}
                                </Field.Root>

                                <Field.Root invalid={!!fieldErrors.confirmPassword}>
                                    <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">Konfirmasi Password</Field.Label>
                                    <PasswordInput
                                        placeholder="Ulangi password baru"
                                        fontSize="14px"
                                        rounded="lg"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value)
                                            if (fieldErrors.confirmPassword) setFieldErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n })
                                        }}
                                        disabled={loading}
                                    />
                                    <Field.HelperText fontSize="12px" color="#5D6D7E">Ketik ulang untuk konfirmasi.</Field.HelperText>
                                    {fieldErrors.confirmPassword && <Field.ErrorText fontSize="12px">{fieldErrors.confirmPassword}</Field.ErrorText>}
                                </Field.Root>

                                <Button
                                    onClick={handleResetPassword}
                                    backgroundColor={newPassword && confirmPassword ? "#001F40" : "#D1D5DB"}
                                    color={newPassword && confirmPassword ? "white" : "#9CA3AF"}
                                    fontSize="15px"
                                    borderRadius="8px"
                                    loading={loading}
                                    loadingText="Menyimpan..."
                                    disabled={!newPassword || !confirmPassword || loading}
                                    _hover={{ bg: newPassword && confirmPassword ? "#0a2d5a" : "#D1D5DB" }}
                                >
                                    Simpan Password Baru
                                </Button>

                                <Flex justify="center">
                                    <Text fontSize="13px" color="#006397" cursor="pointer" onClick={goBackToStart}>
                                        Kode kedaluwarsa? Minta kode baru
                                    </Text>
                                </Flex>
                            </Flex>

                            <Text color="#AEB6BF" fontSize="11px" pt="20px">Agent Portal v2.4.0 — Secured by Movira</Text>
                        </>
                    )}
                </Card.Body>

                <Card.Footer p={0} pt="20px" justifyContent="center">
                    {step === 1 ? (
                        <Text color="#5D6D7E" fontSize="13px">
                            Sudah ingat password?{" "}
                            <Link href="/login">
                                <Text as="span" color="#006397" fontWeight="semibold">Masuk di sini</Text>
                            </Link>
                        </Text>
                    ) : (
                        <Text color="#5D6D7E" fontSize="13px">
                            Butuh bantuan?{" "}
                            <Link href="/contact">
                                <Text as="span" color="#006397" fontWeight="semibold">Hubungi dukungan</Text>
                            </Link>
                        </Text>
                    )}
                </Card.Footer>
            </Card.Root>

            <Flex flexDir="column" gap="12px" alignItems="center">
                <Text color="#859EC6" fontSize="11px" textAlign="center">
                    © 2024 Insurance CRM Indonesia. Seluruh hak cipta dilindungi undang-undang.
                </Text>
                <Flex gap="16px">
                    <Text color="#859EC6" fontSize="11px">Syarat &amp; Ketentuan</Text>
                    <Text color="#859EC6" fontSize="11px">Kebijakan Privasi</Text>
                    <Text color="#859EC6" fontSize="11px">Bantuan</Text>
                </Flex>
            </Flex>
        </Flex>
    )
}
