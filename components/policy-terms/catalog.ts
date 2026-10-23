import { fmtIDR } from "@/lib/format"
import type { PolicyTerm, TermType } from "@/lib/api/policy-terms"

/** A standard clause or extension the agent can pick instead of typing it. */
export interface CatalogEntry {
    code: string
    type: Exclude<TermType, 'deductible'>
    label: string
    /** Short plain-language meaning, shown under the picker and used to prefill the wording. */
    hint: string
}

export const TERM_CATALOG: CatalogEntry[] = [
    // Extensions
    { code: 'ext_flood',      type: 'extension', label: 'Banjir (Flood)',                        hint: 'Kerugian akibat banjir, angin topan, badai, dan kerusakan akibat air.' },
    { code: 'ext_eqvet',      type: 'extension', label: 'Gempa Bumi & Tsunami (EQVET)',          hint: 'Kerugian akibat gempa bumi, letusan gunung berapi, dan tsunami.' },
    { code: 'ext_rsmdcc',     type: 'extension', label: 'Huru-hara (RSMDCC)',                    hint: 'Kerusuhan, pemogokan, perbuatan jahat, dan huru-hara.' },
    { code: 'ext_terrorism',  type: 'extension', label: 'Terorisme & Sabotase',                  hint: 'Kerugian akibat tindakan terorisme dan sabotase.' },
    { code: 'ext_theft',      type: 'extension', label: 'Pencurian dengan Kekerasan (Theft)',    hint: 'Pencurian yang didahului atau disertai kekerasan atau pembongkaran paksa.' },
    { code: 'ext_bi',         type: 'extension', label: 'Gangguan Usaha (Business Interruption)', hint: 'Kehilangan laba kotor dan biaya tetap selama usaha terhenti akibat risiko yang dijamin.' },
    { code: 'ext_tpl',        type: 'extension', label: 'Tanggung Gugat Hukum Pihak Ketiga (TPL)', hint: 'Tanggung jawab hukum atas kerugian atau cedera pihak ketiga.' },
    { code: 'ext_debris',     type: 'extension', label: 'Biaya Pembersihan Puing',               hint: 'Biaya membersihkan puing setelah kerugian yang dijamin.' },
    { code: 'ext_pa_driver',  type: 'extension', label: 'Kecelakaan Diri Pengemudi (PA Driver)', hint: 'Santunan kecelakaan diri untuk pengemudi.' },
    { code: 'ext_pa_passenger', type: 'extension', label: 'Kecelakaan Diri Penumpang (PA Passenger)', hint: 'Santunan kecelakaan diri untuk penumpang.' },
    { code: 'ext_war',        type: 'extension', label: 'Perang & Huru-hara Laut (War & SRCC)',  hint: 'Perluasan perang dan huru-hara untuk pengiriman barang.' },
    // Clauses
    { code: 'cl_bank',        type: 'clause',    label: 'Klausula Bank (Banker’s Clause)',       hint: 'Ganti rugi dibayarkan kepada bank sebagai pemegang hak tanggungan.' },
    { code: 'cl_loss_payee',  type: 'clause',    label: 'Loss Payee',                            hint: 'Ganti rugi dibayarkan kepada pihak yang ditunjuk, misalnya perusahaan pembiayaan.' },
    { code: 'cl_average',     type: 'clause',    label: 'Klausula Average (Pro Rata)',           hint: 'Bila nilai pertanggungan di bawah nilai sebenarnya, ganti rugi dikurangi secara proporsional.' },
    { code: 'cl_firefighting', type: 'clause',   label: 'Klausula Biaya Pemadam Kebakaran',      hint: 'Biaya pemadaman dan penyelamatan barang ikut dijamin.' },
    { code: 'cl_subrogation', type: 'clause',    label: 'Klausula Subrogasi',                    hint: 'Penanggung berhak menuntut pihak yang menyebabkan kerugian setelah membayar klaim.' },
    { code: 'cl_cancellation', type: 'clause',   label: 'Klausula Pembatalan (30 hari)',         hint: 'Polis dapat dibatalkan dengan pemberitahuan tertulis 30 hari sebelumnya.' },
    { code: 'cl_ppw',         type: 'clause',    label: 'Premium Payment Warranty (PPW)',        hint: 'Jaminan berlaku hanya jika premi dibayar dalam batas waktu yang ditentukan.' },
    { code: 'cl_workshop',    type: 'clause',    label: 'Bengkel Resmi (Authorized Workshop)',   hint: 'Perbaikan kendaraan dilakukan di bengkel resmi atau bengkel rekanan.' },
    { code: 'cl_icc_a',       type: 'clause',    label: 'Institute Cargo Clauses (A)',           hint: 'Jaminan all risks untuk pengiriman barang.' },
    { code: 'cl_icc_b',       type: 'clause',    label: 'Institute Cargo Clauses (B)',           hint: 'Jaminan named perils tingkat menengah untuk pengiriman barang.' },
    { code: 'cl_icc_c',       type: 'clause',    label: 'Institute Cargo Clauses (C)',           hint: 'Jaminan named perils paling terbatas untuk pengiriman barang.' },
    { code: 'cl_strikes',     type: 'clause',    label: 'Institute Strikes Clauses',             hint: 'Jaminan pemogokan dan huru-hara pada pengiriman barang.' },
]

export const CATALOG_BY_CODE = new Map(TERM_CATALOG.map(e => [e.code, e]))

export function catalogFor(type: Exclude<TermType, 'deductible'>): CatalogEntry[] {
    return TERM_CATALOG.filter(e => e.type === type)
}

/** One line stating a deductible, e.g. "10% dari nilai klaim, minimum Rp 500.000". */
export function deductibleText(t: Pick<PolicyTerm, 'deductible_type' | 'deductible_amount' | 'deductible_percent'>): string {
    if (t.deductible_type === 'fixed') return t.deductible_amount === null ? '' : fmtIDR(t.deductible_amount)
    if (t.deductible_percent === null) return ''
    const base = t.deductible_type === 'percent_claim' ? 'dari nilai klaim' : 'dari nilai pertanggungan'
    const min = t.deductible_amount ? `, minimum ${fmtIDR(t.deductible_amount)}` : ''
    return `${t.deductible_percent}% ${base}${min}`
}
