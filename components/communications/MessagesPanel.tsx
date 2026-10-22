"use client"

import { useState } from "react"
import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { FaWhatsapp } from "react-icons/fa"
import { LuMessageSquare } from "react-icons/lu"
import type { MessageTemplateType } from "@/lib/api/communications"
import { MessageLog } from "./MessageLog"
import { SendMessageDialog } from "./SendMessageDialog"

function Shell({ id, title, subtitle, actions, children }: { id: string; title: string; subtitle: string; actions: React.ReactNode; children: React.ReactNode }) {
    return (
        <Box id={id} bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden" scrollMarginTop="80px">
            <Flex justify="space-between" align="center" px="24px" pt="20px" pb="16px" gap="12px" flexWrap="wrap">
                <Flex gap="10px" align="center">
                    <Box p="8px" bg="#F0FDF4" borderRadius="8px" color="#16A34A"><LuMessageSquare size={18} /></Box>
                    <Flex flexDir="column">
                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{title}</Text>
                        <Text color="#5D6D7E" fontSize="16px">{subtitle}</Text>
                    </Flex>
                </Flex>
                <Flex gap="8px" flexWrap="wrap">{actions}</Flex>
            </Flex>
            <Box px="24px" pb="20px">{children}</Box>
        </Box>
    )
}

/** "Pesan WhatsApp" card on the customer detail page: send a message and see everything sent to the customer. */
export function CustomerMessagesPanel({ customer }: { customer: { id: string; name: string } }) {
    const [composing, setComposing] = useState(false)
    const [refresh, setRefresh] = useState(0)
    return (
        <Shell id="pesan" title="Pesan WhatsApp" subtitle="Semua pesan yang dikirim ke nasabah ini"
            actions={<Button size="sm" bg="#25D366" color="white" fontSize="16px" gap="6px" onClick={() => setComposing(true)}><FaWhatsapp size={14} /> Kirim Pesan</Button>}>
            <MessageLog filter={{ customer_id: customer.id }} refreshKey={refresh} />
            {composing && <SendMessageDialog customer={customer} templateType="custom" onClose={() => setComposing(false)} onSent={() => { setComposing(false); setRefresh((k) => k + 1) }} />}
        </Shell>
    )
}

/** "Pesan WhatsApp" card on the policy detail page: send the invoice or a payment reminder and see what was sent for the policy. */
export function PolicyMessagesPanel({ policy, customer, canSend, onChanged }: {
    policy: { id: string; number: string }
    customer: { id: string; name: string }
    /** False when the customer has no WhatsApp number. */
    canSend: boolean
    onChanged?: () => void
}) {
    const [composing, setComposing] = useState<MessageTemplateType | null>(null)
    const [refresh, setRefresh] = useState(0)
    return (
        <Shell id="pesan" title="Pesan WhatsApp" subtitle={canSend ? "Kirim tagihan atau pengingat, dan lihat pesan yang sudah terkirim" : "Nasabah belum punya nomor WhatsApp"}
            actions={
                <>
                    <Button size="sm" variant="outline" fontSize="16px" disabled={!canSend} onClick={() => setComposing("invoice")}>Kirim Invoice</Button>
                    <Button size="sm" bg="#25D366" color="white" fontSize="16px" gap="6px" disabled={!canSend} onClick={() => setComposing("payment_reminder")}><FaWhatsapp size={14} /> Kirim Pengingat</Button>
                </>
            }>
            <MessageLog filter={{ policy_id: policy.id }} refreshKey={refresh} />
            {composing && (
                <SendMessageDialog customer={customer} policy={policy} templateType={composing} onClose={() => setComposing(null)}
                    onSent={() => { setComposing(null); setRefresh((k) => k + 1); onChanged?.() }} />
            )}
        </Shell>
    )
}
