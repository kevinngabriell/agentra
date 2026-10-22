"use client"

import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"

const KEY = "agentra_guide_done"
const STEPS = [
  { title: "Selamat datang di Agentra", body: "Agentra membantu Anda mencatat nasabah, polis, dan mengingatkan kapan polis harus diperpanjang. Panduan ini hanya 4 langkah." },
  { title: "1. Catat nasabah", body: "Buka menu Nasabah di sebelah kiri (atau tombol Nasabah di bawah pada HP), lalu tekan Tambah Nasabah dan isi datanya." },
  { title: "2. Catat polis", body: "Buka menu Polis, tekan Tambah Polis, lalu ikuti langkah-langkahnya. Kolom bertanda * wajib diisi." },
  { title: "3. Perpanjangan polis", body: "Buka menu Perpanjangan Polis untuk melihat polis yang akan habis. Tekan WhatsApp untuk menghubungi nasabah." },
  { title: "Butuh bantuan?", body: "Tekan tombol hijau Butuh Bantuan di pojok kanan bawah kapan saja. Langkah lengkap setiap pekerjaan ada di halaman Bantuan (agentra.id/help)." },
]

function readDone() {
  try { return localStorage.getItem(KEY) === "1" } catch { return true }
}

// Shown once, on the dashboard only; skippable. Stored per-browser so it never nags.
export function WelcomeGuide() {
  const pathname = usePathname()
  const done = useSyncExternalStore(() => () => {}, readDone, () => true)
  const [closed, setClosed] = useState(false)
  const [step, setStep] = useState(0)

  if (done || closed || pathname !== "/agentra/dashboard") return null

  function finish() {
    try { localStorage.setItem(KEY, "1") } catch { /* private mode: it just shows again next visit */ }
    setClosed(true)
  }

  const last = step === STEPS.length - 1
  const s = STEPS[step]

  return (
    <Flex position="fixed" inset={0} zIndex={50} bg="rgba(15,23,42,0.55)" align="center" justify="center" p="16px" role="dialog" aria-modal="true" aria-label="Panduan singkat">
      <Box bg="white" borderRadius="16px" p="24px" maxW="480px" w="100%">
        <Text fontSize="14px" color="#475569" mb="4px">Langkah {step + 1} dari {STEPS.length}</Text>
        <Text as="h2" fontSize="24px" fontWeight="bold" color="#0F172A" mb="8px">{s.title}</Text>
        <Text fontSize="18px" color="#1E293B" lineHeight="1.6">{s.body}</Text>
        <Flex mt="24px" gap="12px" justify="space-between" wrap="wrap">
          <Button variant="ghost" minH="48px" fontSize="16px" color="#475569" onClick={finish}>Lewati</Button>
          <Flex gap="8px">
            {step > 0 && <Button variant="outline" minH="48px" fontSize="16px" onClick={() => setStep(step - 1)}>Kembali</Button>}
            <Button minH="48px" fontSize="16px" bg="#1D4ED8" color="white" onClick={() => (last ? finish() : setStep(step + 1))}>
              {last ? "Mulai Pakai" : "Lanjut"}
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Flex>
  )
}
