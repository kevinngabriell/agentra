"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { Badge, Box, Button, Dialog, Flex, IconButton, Input, Skeleton, Text } from "@chakra-ui/react"
import { LuCalendarClock, LuCreditCard, LuFileText, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu"
import { FaWhatsapp } from "react-icons/fa"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { updatePaymentStatus } from "@/lib/api/policies"
import {
    PAYMENT_URGENCY_COLORS, PAYMENT_URGENCY_LABELS, getPolicyPayments, payInstallment, savePolicyPayments,
    type PolicyPayments,
} from "@/lib/api/payments"
import { fmtIDR, localISODate, whatsappUrl } from "@/lib/format"
import { CLAIM_INPUT, CLAIM_LABEL, MoneyInput } from "@/components/claims/fields"
import { paymentReminderText } from "./reminder"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"

export interface PaymentsPanelProps {
    policy: { id: string; number: string; cancelled?: boolean }
    customer: { name: string; whatsapp?: string | null }
    /** Called after any change so the page can refresh its own policy copy and timeline. */
    onChanged?: () => void
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function Shell({ title, saving, error, submitLabel, onClose, onSubmit, children }: {
    title: string; saving: boolean; error: string | null; submitLabel: string
    onClose: () => void; onSubmit: () => void; children: ReactNode
}) {
    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} scrollBehavior="inside" onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW="480px" w="92vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{title}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="12px">
                            {children}
                            {error && <Text color="#DC2626" fontSize="14px">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button variant="outline" size="sm" fontSize="15px" disabled={saving} onClick={onClose}>Batal</Button>
                        <Button size="sm" bg="#1A3557" color="white" fontSize="15px" _hover={{ bg: "#162C47" }} loading={saving} onClick={onSubmit}>{submitLabel}</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="4px">
            <Text {...CLAIM_LABEL}>{label}</Text>
            {children}
        </Flex>
    )
}

type DialogState =
    | { kind: "pay"; installmentId: string | null; seq?: number; amount: number }
    | { kind: "due" }
    | { kind: "schedule" }
    | null

/** "Pembayaran Premi" card: due date, payment record (date + transfer reference), instalment schedule, invoice and reminder. */
export function PaymentsPanel({ policy, customer, onChanged }: PaymentsPanelProps) {
    const [data, setData] = useState<PolicyPayments | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<DialogState>(null)

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getPolicyPayments(token, policy.id)
            .then((d) => { setData(d); setError(null) })
            .catch((err: unknown) => setError(errorMessage(err, "Data pembayaran belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [policy.id])

    useEffect(() => { load() }, [load])

    function changed() {
        setDialog(null)
        load()
        onChanged?.()
    }

    const unpaid = data?.payment_status === "unpaid" && !policy.cancelled
    const hasSchedule = (data?.installments.length ?? 0) > 0
    const urgency = unpaid ? data?.urgency ?? null : null
    const waUrl = customer.whatsapp && data && unpaid
        ? (() => {
            const base = whatsappUrl(customer.whatsapp)
            const next = data.installments.find((i) => !i.is_paid)
            const text = paymentReminderText({
                customerName: customer.name, policyNumber: policy.number,
                amount: next?.amount ?? data.expected_amount, dueDate: next?.due_date ?? data.effective_due_date,
            })
            return base ? `${base}?text=${encodeURIComponent(text)}` : null
        })()
        : null

    return (
        <Box id="pembayaran" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden" scrollMarginTop="80px">
            <Flex justify="space-between" align="center" px="24px" pt="20px" pb="16px" gap="12px" flexWrap="wrap">
                <Flex gap="10px" align="center">
                    <Box p="8px" bg="#ECFEFF" borderRadius="8px" color="#0891B2"><LuCreditCard size={18} /></Box>
                    <Flex flexDir="column">
                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Pembayaran Premi</Text>
                        <Text color="#5D6D7E" fontSize="14px">{data ? fmtIDR(data.expected_amount) + " ditagihkan ke customer" : "Memuat..."}</Text>
                    </Flex>
                </Flex>
                <Flex gap="8px" flexWrap="wrap">
                    <Button asChild size="sm" variant="outline" fontSize="15px" gap="6px">
                        <Link href={`/agentra/policies/${encodeURIComponent(policy.id)}/invoice`} target="_blank"><LuFileText size={14} /> Invoice</Link>
                    </Button>
                    {waUrl && (
                        <Button asChild size="sm" variant="outline" fontSize="15px" gap="6px">
                            <a href={waUrl} target="_blank" rel="noopener noreferrer"><FaWhatsapp color="#25D366" size={14} /> Ingatkan</a>
                        </Button>
                    )}
                    {unpaid && !hasSchedule && data && (
                        <Button size="sm" bg="#1A3557" color="white" fontSize="15px" gap="6px" _hover={{ bg: "#162C47" }}
                            onClick={() => setDialog({ kind: "pay", installmentId: null, amount: data.expected_amount })}>
                            <LuCreditCard size={14} /> Catat Pembayaran
                        </Button>
                    )}
                </Flex>
            </Flex>

            {error && <Text px="24px" pb="20px" fontSize="15px" color="#DC2626">{error}</Text>}
            {!error && !data && <Box px="24px" pb="20px"><Skeleton h="56px" borderRadius="8px" /></Box>}

            {data && (
                <Flex flexDir="column" gap="14px" px="24px" pb="20px">
                    <Flex gap="10px" flexWrap="wrap">
                        <Flex flexDir="column" flex="1" minW="150px" px="12px" py="10px" borderRadius="10px" bg="#F8FAFC">
                            <Text color="#64748B" fontSize="14px">Jatuh Tempo{data.is_default_due_date ? " (otomatis 30 hari)" : ""}</Text>
                            <Flex align="center" gap="6px">
                                <Text color="#1C2833" fontSize="16px" fontWeight="bold">{fmtDate(data.effective_due_date)}</Text>
                                {!policy.cancelled && !hasSchedule && (
                                    <IconButton aria-label="Ubah jatuh tempo" size="2xs" variant="ghost" onClick={() => setDialog({ kind: "due" })}><LuPencil /></IconButton>
                                )}
                            </Flex>
                        </Flex>
                        <Flex flexDir="column" flex="1" minW="150px" px="12px" py="10px" borderRadius="10px" bg={urgency ? PAYMENT_URGENCY_COLORS[urgency].bg : "#F0FDF4"}>
                            <Text color={urgency ? PAYMENT_URGENCY_COLORS[urgency].color : "#16A34A"} fontSize="14px">Status</Text>
                            <Text color={urgency ? PAYMENT_URGENCY_COLORS[urgency].color : "#16A34A"} fontSize="16px" fontWeight="bold">
                                {unpaid
                                    ? (urgency ? PAYMENT_URGENCY_LABELS[urgency] : "Belum dibayar")
                                    : data.payment_status === "confirmed" ? "Dikonfirmasi insurer" : data.payment_status === "paid" ? "Sudah dibayar" : "Belum dibayar"}
                            </Text>
                            {unpaid && data.days_until_due !== null && (
                                <Text color={urgency ? PAYMENT_URGENCY_COLORS[urgency].color : "#64748B"} fontSize="14px">
                                    {data.days_until_due >= 0 ? `${data.days_until_due} hari lagi` : `Terlambat ${Math.abs(data.days_until_due)} hari`}
                                </Text>
                            )}
                        </Flex>
                        {data.payment_date && (
                            <Flex flexDir="column" flex="1" minW="150px" px="12px" py="10px" borderRadius="10px" bg="#F8FAFC">
                                <Text color="#64748B" fontSize="14px">Dibayar pada</Text>
                                <Text color="#1C2833" fontSize="16px" fontWeight="bold">{fmtDate(data.payment_date)}</Text>
                                {data.payment_reference && <Text color="#64748B" fontSize="14px">Ref: {data.payment_reference}</Text>}
                            </Flex>
                        )}
                    </Flex>

                    {urgency === "cancellation_risk" && (
                        <Text color="#DC2626" fontSize="14px" fontWeight="medium">
                            Premi sudah lewat jatuh tempo lebih dari 14 hari. Polis berisiko dibatalkan insurer karena premi belum dibayar.
                        </Text>
                    )}

                    <Flex justify="space-between" align="center">
                        <Flex align="center" gap="6px" color="#1C2833" fontSize="15px" fontWeight="semibold"><LuCalendarClock size={14} /> Jadwal Cicilan</Flex>
                        {!policy.cancelled && data.payment_status === "unpaid" && !data.installments.some((i) => i.is_paid) && (
                            <Button size="xs" variant="outline" fontSize="14px" gap="4px" onClick={() => setDialog({ kind: "schedule" })}>
                                {hasSchedule ? <><LuPencil size={12} /> Ubah</> : <><LuPlus size={12} /> Atur Cicilan</>}
                            </Button>
                        )}
                    </Flex>
                    {!hasSchedule && <Text color="#64748B" fontSize="15px">Dibayar sekaligus. Atur cicilan jika premi dibayar bertahap.</Text>}
                    {data.installments.map((i) => (
                        <Flex key={i.installment_id} align="center" justify="space-between" gap="10px" flexWrap="wrap" px="12px" py="8px" borderRadius="8px" border="1px solid" borderColor="#F1F5F9">
                            <Flex flexDir="column">
                                <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Cicilan {i.seq} · {fmtIDR(i.amount)}</Text>
                                <Text color="#64748B" fontSize="14px">
                                    Jatuh tempo {fmtDate(i.due_date)}
                                    {i.paid_date ? ` · dibayar ${fmtDate(i.paid_date)}${i.payment_reference ? ` (ref ${i.payment_reference})` : ""}` : ""}
                                </Text>
                            </Flex>
                            {i.is_paid ? (
                                <Badge bg="#DCFCE7" color="#16A34A" px="10px" py="2px" borderRadius="full" fontSize="14px">Lunas</Badge>
                            ) : (
                                <Flex align="center" gap="8px">
                                    {i.urgency && i.urgency !== "upcoming" && (
                                        <Badge bg={PAYMENT_URGENCY_COLORS[i.urgency].bg} color={PAYMENT_URGENCY_COLORS[i.urgency].color} px="10px" py="2px" borderRadius="full" fontSize="14px">
                                            {PAYMENT_URGENCY_LABELS[i.urgency]}
                                        </Badge>
                                    )}
                                    {!policy.cancelled && (
                                        <Button size="xs" variant="outline" fontSize="14px"
                                            onClick={() => setDialog({ kind: "pay", installmentId: i.installment_id, seq: i.seq, amount: i.amount })}>
                                            Catat Bayar
                                        </Button>
                                    )}
                                </Flex>
                            )}
                        </Flex>
                    ))}
                </Flex>
            )}

            {dialog?.kind === "pay" && (
                <PayDialog policyId={policy.id} installmentId={dialog.installmentId} seq={dialog.seq} amount={dialog.amount} onClose={() => setDialog(null)} onDone={changed} />
            )}
            {dialog?.kind === "due" && data && (
                <DueDateDialog policyId={policy.id} current={data.payment_due_date ?? data.effective_due_date} onClose={() => setDialog(null)} onDone={changed} />
            )}
            {dialog?.kind === "schedule" && data && (
                <ScheduleDialog policyId={policy.id} total={data.expected_amount} firstDue={data.effective_due_date}
                    existing={data.installments.map((i) => ({ due_date: i.due_date, amount: String(i.amount) }))}
                    onClose={() => setDialog(null)} onDone={changed} />
            )}
        </Box>
    )
}

function PayDialog({ policyId, installmentId, seq, amount, onClose, onDone }: {
    policyId: string; installmentId: string | null; seq?: number; amount: number; onClose: () => void; onDone: () => void
}) {
    const [date, setDate] = useState(localISODate())
    const [reference, setReference] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        setSaving(true)
        setError(null)
        try {
            const details = { payment_date: date, payment_reference: reference.trim() || undefined }
            if (installmentId) await payInstallment(token, policyId, installmentId, details)
            else await updatePaymentStatus(token, policyId, "paid", details)
            onDone()
        } catch (err: unknown) {
            setError(errorMessage(err, "Gagal mencatat pembayaran"))
            setSaving(false)
        }
    }

    return (
        <Shell title={seq ? `Catat Pembayaran Cicilan ${seq}` : "Catat Pembayaran Premi"} saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={submit}>
            <Text color="#64748B" fontSize="15px">Jumlah: <b>{fmtIDR(amount)}</b></Text>
            <Field label="Tanggal pembayaran">
                <Input {...CLAIM_INPUT} type="date" max={localISODate()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="No. referensi transfer">
                <Input {...CLAIM_INPUT} maxLength={100} placeholder="Opsional" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
        </Shell>
    )
}

function DueDateDialog({ policyId, current, onClose, onDone }: { policyId: string; current: string; onClose: () => void; onDone: () => void }) {
    const [date, setDate] = useState(current)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit(value: string | null) {
        const token = getAccessToken()
        if (!token) return
        setSaving(true)
        setError(null)
        try {
            await savePolicyPayments(token, policyId, { payment_due_date: value })
            onDone()
        } catch (err: unknown) {
            setError(errorMessage(err, "Gagal menyimpan jatuh tempo"))
            setSaving(false)
        }
    }

    return (
        <Shell title="Ubah Jatuh Tempo Premi" saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={() => submit(date || null)}>
            <Field label="Jatuh tempo">
                <Input {...CLAIM_INPUT} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Button size="xs" variant="ghost" alignSelf="flex-start" fontSize="14px" disabled={saving} onClick={() => submit(null)}>
                Kembalikan ke otomatis (30 hari sejak mulai)
            </Button>
        </Shell>
    )
}

function ScheduleDialog({ policyId, total, firstDue, existing, onClose, onDone }: {
    policyId: string; total: number; firstDue: string; existing: { due_date: string; amount: string }[]
    onClose: () => void; onDone: () => void
}) {
    const [rows, setRows] = useState<{ due_date: string; amount: string }[]>(
        existing.length ? existing : [{ due_date: firstDue, amount: "" }, { due_date: "", amount: "" }],
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const sum = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

    function splitEvenly() {
        const base = Math.floor(total / rows.length)
        setRows(rows.map((r, i) => ({ ...r, amount: String(i === rows.length - 1 ? total - base * (rows.length - 1) : base) })))
    }

    function update(i: number, patch: Partial<{ due_date: string; amount: string }>) {
        setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
    }

    async function submit(clear: boolean) {
        const token = getAccessToken()
        if (!token) return
        if (!clear) {
            if (rows.some((r) => !r.due_date || !Number(r.amount))) { setError("Isi tanggal dan jumlah setiap cicilan"); return }
            if (sum !== total) { setError(`Total cicilan ${fmtIDR(sum)} harus sama dengan ${fmtIDR(total)}`); return }
        }
        setSaving(true)
        setError(null)
        try {
            await savePolicyPayments(token, policyId, {
                installments: clear ? [] : rows.map((r) => ({ due_date: r.due_date, amount: Number(r.amount) })),
            })
            onDone()
        } catch (err: unknown) {
            setError(errorMessage(err, "Gagal menyimpan jadwal cicilan"))
            setSaving(false)
        }
    }

    return (
        <Shell title="Atur Jadwal Cicilan" saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={() => submit(false)}>
            <Text color="#64748B" fontSize="14px">Total yang harus dicicil: <b>{fmtIDR(total)}</b></Text>
            {rows.map((r, i) => (
                <Flex key={i} gap="8px" align="flex-end">
                    <Field label={`Cicilan ${i + 1} · jatuh tempo`}>
                        <Input {...CLAIM_INPUT} type="date" value={r.due_date} onChange={(e) => update(i, { due_date: e.target.value })} />
                    </Field>
                    <Field label="Jumlah">
                        <MoneyInput value={r.amount} onChange={(v) => update(i, { amount: v })} />
                    </Field>
                    {rows.length > 2 && (
                        <IconButton aria-label="Hapus cicilan" size="sm" variant="ghost" color="#DC2626" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}><LuTrash2 /></IconButton>
                    )}
                </Flex>
            ))}
            <Flex gap="8px" flexWrap="wrap">
                {rows.length < 12 && <Button size="xs" variant="outline" fontSize="14px" onClick={() => setRows([...rows, { due_date: "", amount: "" }])}><LuPlus size={12} /> Tambah cicilan</Button>}
                <Button size="xs" variant="outline" fontSize="14px" onClick={splitEvenly}>Bagi rata</Button>
                {existing.length > 0 && <Button size="xs" variant="ghost" color="#DC2626" fontSize="14px" disabled={saving} onClick={() => submit(true)}>Hapus jadwal</Button>}
            </Flex>
            <Text fontSize="14px" color={sum === total ? "#16A34A" : "#B45309"}>Terisi {fmtIDR(sum)} dari {fmtIDR(total)}</Text>
        </Shell>
    )
}
