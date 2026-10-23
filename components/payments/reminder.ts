import { fmtIDR } from "@/lib/format"

/** WhatsApp text asking a customer to pay an outstanding premium. */
export function paymentReminderText(p: { customerName: string; policyNumber: string; amount: number; dueDate: string }): string {
    const due = new Date(p.dueDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    return `Yth. ${p.customerName},\n\nKami mengingatkan bahwa premi polis ${p.policyNumber} sebesar ${fmtIDR(p.amount)} jatuh tempo pada ${due}. ` +
        `Mohon segera melakukan pembayaran agar perlindungan polis tetap berlaku.\n\nAbaikan pesan ini jika Anda sudah membayar. Terima kasih.`
}
