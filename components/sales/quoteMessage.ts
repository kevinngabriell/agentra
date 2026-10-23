import type { ApiQuoteDetail } from "@/lib/api/quotes"
import { fmtIDR } from "@/lib/format"
import { fmtDate, productLabel } from "./constants"

/** WhatsApp text summarising a quote: one line per insurer so the customer can compare at a glance. */
export function quoteMessageText(q: ApiQuoteDetail): string {
    const lines = q.options.map(o => `• ${o.insurer_short_name || o.insurer_name || "Asuransi"}: ${fmtIDR(o.total_amount)}`)
    const valid = q.valid_until ? `\n\nPenawaran berlaku sampai ${fmtDate(q.valid_until)}.` : ""
    return `Yth. ${q.prospect_name},\n\nBerikut penawaran ${productLabel(q.product_type)} (${q.quote_number}) dengan nilai pertanggungan ${fmtIDR(q.sum_insured)}:\n\n` +
        `${lines.join("\n")}${valid}\n\nSilakan hubungi kami bila ingin melanjutkan atau membandingkan lebih lanjut. Terima kasih.`
}
