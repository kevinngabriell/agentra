"use client"

import { useCallback, useEffect, useState } from "react"
import { Box, Button, Flex, Input, Skeleton, Text } from "@chakra-ui/react"
import { LuPencil, LuPlus, LuTrash2, LuUpload } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    BAND_KEY_HINTS, TARIFF_TYPE_LABELS, deleteOccupation, deleteTariffBand, getOccupations, getTariffBands, importOccupations,
    saveOccupation, saveTariffBand,
    type Occupation, type TariffBand, type TariffType,
} from "@/lib/api/tariffs"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT } from "@/components/claims/fields"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { csvRecords, readFileText } from "@/lib/csv"

const CARD = { bg: "white", borderRadius: "16px", border: "1px solid", borderColor: "#CBD5E1", p: "24px" } as const

function OccupationDialog({ editing, onClose, onSaved }: { editing: Occupation | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ code: editing?.code ?? "", description: editing?.description ?? "", tariff_class: editing?.tariff_class ?? "", notes: editing?.notes ?? "" })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!f.code.trim() || !f.description.trim()) { setError("Kode dan deskripsi wajib diisi"); return }
        setSaving(true); setError(null)
        try { await saveOccupation(token, editing?.occupation_id ?? null, { code: f.code.trim(), description: f.description.trim(), tariff_class: f.tariff_class.trim() || null, notes: f.notes.trim() || null }); onSaved() }
        catch (err) { setError(errorMessage(err, "Belum bisa disimpan")); setSaving(false) }
    }
    return (
        <FormDialog title={editing ? `Ubah okupasi ${editing.code}` : "Tambah kode okupasi"} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Kode"><Input {...CLAIM_INPUT} maxLength={40} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></FormField>
                <FormField label="Kelas tarif" hint="Opsional: rentang tarif bisa diisi per kelas, bukan per kode"><Input {...CLAIM_INPUT} maxLength={40} value={f.tariff_class} onChange={(e) => setF({ ...f, tariff_class: e.target.value })} /></FormField>
            </FormRow>
            <FormField label="Deskripsi"><Input {...CLAIM_INPUT} maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></FormField>
            <FormField label="Catatan"><Input {...CLAIM_INPUT} maxLength={300} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></FormField>
        </FormDialog>
    )
}

function BandDialog({ editing, onClose, onSaved }: { editing: TariffBand | null; onClose: () => void; onSaved: () => void }) {
    const s = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v))
    const [f, setF] = useState({ type: (editing?.tariff_type ?? "property") as TariffType, key: editing?.band_key ?? "", description: editing?.description ?? "",
        min: s(editing?.rate_min), max: s(editing?.rate_max), discount: s(editing?.discount_max_percent) })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")))
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!f.key.trim()) { setError("Kunci rentang wajib diisi"); return }
        setSaving(true); setError(null)
        try {
            await saveTariffBand(token, editing?.band_id ?? null, { tariff_type: f.type, band_key: f.key.trim(), description: f.description.trim() || null,
                rate_min: n(f.min), rate_max: n(f.max), discount_max_percent: n(f.discount) })
            onSaved()
        } catch (err) { setError(errorMessage(err, "Belum bisa disimpan")); setSaving(false) }
    }
    return (
        <FormDialog title={editing ? "Ubah rentang tarif" : "Tambah rentang tarif"} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormField label="Jenis tarif"><SearchSelect value={f.type} onChange={(v) => setF({ ...f, type: v as TariffType })}
                options={(Object.entries(TARIFF_TYPE_LABELS) as [TariffType, string][]).map(([value, label]) => ({ value, label }))} /></FormField>
            <FormField label="Kunci" hint={`Format: ${BAND_KEY_HINTS[f.type]}`}><Input {...CLAIM_INPUT} maxLength={100} value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></FormField>
            <FormRow>
                <FormField label="Rate minimum (‰)"><Input {...CLAIM_INPUT} inputMode="decimal" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>
                <FormField label="Rate maksimum (‰)"><Input {...CLAIM_INPUT} inputMode="decimal" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>
            </FormRow>
            {f.type === "motor" && <Text fontSize="16px" color="#475569">Tarif kendaraan ditulis dalam ‰ (2,5% = 25‰).</Text>}
            <FormRow>
                <FormField label="Diskon maksimum (%)"><Input {...CLAIM_INPUT} inputMode="decimal" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>
                <FormField label="Keterangan"><Input {...CLAIM_INPUT} maxLength={300} placeholder="Sumber: surat edaran OJK" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></FormField>
            </FormRow>
        </FormDialog>
    )
}

/** Settings → Tarif & Okupasi: the company's occupation codes and the regulator tariff bands used for rate warnings. */
export function TariffsTab() {
    const [occ, setOcc] = useState<Occupation[] | null>(null)
    const [bands, setBands] = useState<TariffBand[] | null>(null)
    const [search, setSearch] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [dialog, setDialog] = useState<null | { occ: Occupation | null } | { band: TariffBand | null }>(null)
    const { confirm, dialog: confirmDialog } = useConfirm()

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getOccupations(token).then(setOcc).catch((err) => setError(errorMessage(err, "Daftar jenis usaha belum bisa dibuka")))
        getTariffBands(token).then(setBands).catch((err) => setError(errorMessage(err, "Daftar tarif belum bisa dibuka")))
    }, [])
    useEffect(() => { load() }, [load])
    const saved = () => { setDialog(null); load() }

    async function importCsv(file: File | undefined) {
        const token = getAccessToken()
        if (!file || !token) return
        const rows = csvRecords(await readFileText(file), {
            code: ["kode", "code", "kode okupasi"], description: ["deskripsi", "description", "okupasi", "nama"],
            tariff_class: ["kelas", "kelas tarif", "tariff_class", "class"], notes: ["catatan", "notes"],
        }).filter((r) => r.code && r.description)
        if (!rows.length) { setError("CSV tidak berisi kolom Kode dan Deskripsi"); return }
        try {
            const res = await importOccupations(token, rows.map((r) => ({ code: r.code, description: r.description, tariff_class: r.tariff_class || null, notes: r.notes || null })))
            setNotice(`${res.imported} kode okupasi diimpor.`); load()
        } catch (err) { setError(errorMessage(err, "File belum bisa dimasukkan")) }
    }

    async function removeOcc(o: Occupation) {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: `Hapus ${o.code}?`, danger: true, confirmLabel: "Hapus" }))) return
        try { await deleteOccupation(token, o.occupation_id); load() } catch (err) { setError(errorMessage(err, "Belum bisa dihapus")) }
    }
    async function removeBand(b: TariffBand) {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: `Hapus ${b.band_key}?`, danger: true, confirmLabel: "Hapus" }))) return
        try { await deleteTariffBand(token, b.band_id); load() } catch (err) { setError(errorMessage(err, "Belum bisa dihapus")) }
    }

    const q = search.trim().toLowerCase()
    const shownOcc = (occ ?? []).filter((o) => !q || `${o.code} ${o.description} ${o.tariff_class ?? ""}`.toLowerCase().includes(q))

    return (
        <Flex flexDir="column" gap="20px">
            <Text fontSize="17px" color="#1F2937" maxW="820px" lineHeight="1.5">
                Isi daftar tarif dari surat edaran resmi yang berlaku. Agentra tidak membawa angka tarif sendiri, jadi peringatan &ldquo;tarif terlalu rendah / terlalu tinggi&rdquo; hanya seakurat daftar yang Anda isi di sini.
            </Text>
            {error && <Text color="#B91C1C" fontSize="17px" role="alert">{error}</Text>}
            {notice && <Text color="#166534" fontSize="17px">{notice}</Text>}

            <Box {...CARD}>
                <Flex justify="space-between" align="center" mb="12px" gap="8px" flexWrap="wrap">
                    <Text as="h2" fontSize="20px" fontWeight="bold" color="#0D1B3E">Daftar Jenis Usaha / Pekerjaan ({occ?.length ?? 0})</Text>
                    <Flex gap="8px">
                        <Button as="label" variant="outline" h="48px" px="16px" fontSize="17px" cursor="pointer" color="#111827" borderColor="#94A3B8" gap="6px">
                            <LuUpload size={18} /> Impor dari file CSV
                            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = "" }} />
                        </Button>
                        <Button h="48px" px="16px" fontSize="17px" bg="#0D1B3E" color="white" gap="6px" onClick={() => setDialog({ occ: null })}><LuPlus size={18} /> Tambah</Button>
                    </Flex>
                </Flex>
                <Input {...CLAIM_INPUT} mb="8px" placeholder="Ketik untuk mencari kode atau nama" value={search} onChange={(e) => setSearch(e.target.value)} />
                {!occ ? <Skeleton h="60px" /> : shownOcc.length === 0 ? <Text fontSize="16px" color="#475569">Belum ada data. Anda bisa mengisinya satu per satu dengan tombol Tambah, atau memasukkan banyak sekaligus dari file CSV (kolom: Kode, Deskripsi, Kelas).</Text> : (
                    <Box maxH="360px" overflowY="auto">
                        {shownOcc.map((o) => (
                            <Flex key={o.occupation_id} justify="space-between" align="center" py="12px" borderTop="1px solid #E2E8F0" fontSize="17px" gap="12px">
                                <Text><Text as="span" fontWeight="semibold">{o.code}</Text> · {o.description}{o.tariff_class ? ` · kelas ${o.tariff_class}` : ""}</Text>
                                <Flex>
                                    <Button variant="ghost" h="44px" px="12px" fontSize="16px" color="#111827" gap="6px" onClick={() => setDialog({ occ: o })}><LuPencil size={18} /> Ubah</Button>
                                    <Button variant="ghost" h="44px" px="12px" fontSize="16px" color="#B91C1C" gap="6px" onClick={() => removeOcc(o)}><LuTrash2 size={18} /> Hapus</Button>
                                </Flex>
                            </Flex>
                        ))}
                    </Box>
                )}
            </Box>

            <Box {...CARD}>
                <Flex justify="space-between" align="center" mb="12px">
                    <Text as="h2" fontSize="20px" fontWeight="bold" color="#0D1B3E">Daftar Batas Tarif ({bands?.length ?? 0})</Text>
                    <Button h="48px" px="16px" fontSize="17px" bg="#0D1B3E" color="white" gap="6px" onClick={() => setDialog({ band: null })}><LuPlus size={18} /> Tambah</Button>
                </Flex>
                {!bands ? <Skeleton h="60px" /> : bands.length === 0 ? <Text fontSize="16px" color="#475569">Belum ada data. Tekan Tambah untuk mengisi.</Text> : bands.map((b) => (
                    <Flex key={b.band_id} justify="space-between" align="center" py="12px" borderTop="1px solid #E2E8F0" fontSize="17px" gap="12px">
                        <Box>
                            <Text><Text as="span" fontWeight="semibold">{b.band_key}</Text> · {TARIFF_TYPE_LABELS[b.tariff_type]}</Text>
                            <Text color="#475569" fontSize="16px">{b.rate_min ?? "?"}–{b.rate_max ?? "?"}‰{b.discount_max_percent !== null ? ` · diskon maks. ${b.discount_max_percent}%` : ""}{b.description ? ` · ${b.description}` : ""}</Text>
                        </Box>
                        <Flex>
                            <Button variant="ghost" h="44px" px="12px" fontSize="16px" color="#111827" gap="6px" onClick={() => setDialog({ band: b })}><LuPencil size={18} /> Ubah</Button>
                            <Button variant="ghost" h="44px" px="12px" fontSize="16px" color="#B91C1C" gap="6px" onClick={() => removeBand(b)}><LuTrash2 size={18} /> Hapus</Button>
                        </Flex>
                    </Flex>
                ))}
                <Text mt="8px" fontSize="16px" color="#475569">Kategori kendaraan dihitung dari nilai: 1 ≤ 125 jt, 2 ≤ 200 jt, 3 ≤ 400 jt, 4 ≤ 800 jt, 5 di atasnya.</Text>
            </Box>

            {dialog && "occ" in dialog && <OccupationDialog editing={dialog.occ} onClose={() => setDialog(null)} onSaved={saved} />}
            {dialog && "band" in dialog && <BandDialog editing={dialog.band} onClose={() => setDialog(null)} onSaved={saved} />}
            {confirmDialog}
        </Flex>
    )
}

