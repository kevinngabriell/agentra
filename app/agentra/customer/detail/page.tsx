"use client"

import { useState } from "react"
import { Sidebar, TopBar, MobileHeader, MobileBottomNav } from "@/components/layout"
import {
  Box, Button, Flex, Grid, Input, Text, Textarea,
} from "@chakra-ui/react"
import {
  FiShield, FiUpload, FiArrowRight, FiBriefcase, FiUser, FiInfo, FiCheck,
} from "react-icons/fi"

// ─── Phone Input ──────────────────────────────────────────────────────────────

function PhoneInput({ placeholder }: { placeholder: string }) {
  return (
    <Flex border="1px solid" borderColor="#DDE1E7" borderRadius="10px" overflow="hidden" bg="white" _focusWithin={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}>
      <Flex align="center" px="12px" bg="#F8FAFC" borderRight="1px solid" borderColor="#DDE1E7" flexShrink={0}>
        <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">+62</Text>
      </Flex>
      <Input
        border="none"
        borderRadius="0"
        h="44px"
        fontSize="14px"
        placeholder={placeholder}
        _placeholder={{ color: "#B0BAC8" }}
        _focus={{ boxShadow: "none" }}
      />
    </Flex>
  )
}

// ─── Field Label ─────────────────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <Flex align="center" gap="6px" mb="6px">
      <Text fontSize="12px" fontWeight="semibold" color="#5D6D7E" letterSpacing="0.04em" textTransform="uppercase">
        {children}
      </Text>
      {optional && (
        <Text fontSize="11px" color="#B0BAC8">(Opsional)</Text>
      )}
    </Flex>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Box bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="14px" overflow="hidden">
      <Flex align="center" gap="10px" px="24px" py="16px" borderLeft="4px solid" borderColor="#006397" borderBottom="1px solid" borderBottomColor="#DDE1E7">
        {icon && <Box color="#006397">{icon}</Box>}
        <Text fontSize="17px" fontWeight="semibold" color="#001F40">{title}</Text>
      </Flex>
      <Box p="24px">{children}</Box>
    </Box>
  )
}

// ─── Perorangan Form ──────────────────────────────────────────────────────────

function PeroranganForm() {
  return (
    <SectionCard title="Data Identitas">
      <Flex flexDir="column" gap="20px">
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="20px">
          <Box>
            <Label>Nomor Induk Kependudukan (NIK)</Label>
            <Input
              h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" placeholder="Contoh: 3273012345678901"
              _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
            />
          </Box>
          <Box>
            <Label optional>NPWP</Label>
            <Input
              h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" placeholder="00.000.000.0-000.000"
              _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
            />
          </Box>
        </Grid>

        <Box>
          <Label>Nama Lengkap (Sesuai KTP)</Label>
          <Input
            h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
            fontSize="14px" placeholder="Masukkan nama lengkap"
            _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
          />
        </Box>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="20px">
          <Box>
            <Label>Tanggal Lahir</Label>
            <Input
              type="date" h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" color="#B0BAC8"
              _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
            />
          </Box>
          <Box>
            <Label>Email</Label>
            <Input
              type="email" h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" placeholder="nama@email.com"
              _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
            />
          </Box>
        </Grid>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="20px">
          <Box>
            <Label>No. Telepon (HP)</Label>
            <PhoneInput placeholder="81234567890" />
          </Box>
          <Box>
            <Label>No. WhatsApp</Label>
            <PhoneInput placeholder="81234567890" />
          </Box>
        </Grid>

        <Box>
          <Label>Alamat Lengkap</Label>
          <Textarea
            bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
            fontSize="14px" rows={4}
            placeholder="Contoh: Jl. Sudirman No. 123, Kebayoran Baru, Jakarta Selatan"
            _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
            resize="none"
          />
        </Box>
      </Flex>
    </SectionCard>
  )
}

// ─── Perorangan Sidebar ───────────────────────────────────────────────────────

function PeroranganSidebar() {
  return (
    <Flex flexDir="column" gap="16px">
      {/* Guidance */}
      <Box bg="#001F40" borderRadius="14px" p="20px">
        <Flex align="center" gap="8px" mb="12px">
          <Box color="#60A5FA"><FiInfo size={16} /></Box>
          <Text fontSize="14px" fontWeight="semibold" color="white">Petunjuk Pengisian</Text>
        </Flex>
        <Flex flexDir="column" gap="8px">
          {[
            "Pastikan data NIK telah divalidasi melalui sistem Dukcapil pusat.",
            "Nama lengkap harus sesuai dengan E-KTP tanpa gelar (kecuali profesional).",
            "Nomor WhatsApp aktif diperlukan untuk pengiriman e-Polis secara otomatis.",
          ].map((tip, i) => (
            <Flex key={i} align="flex-start" gap="8px">
              <Box w="5px" h="5px" borderRadius="full" bg="#60A5FA" mt="7px" flexShrink={0} />
              <Text fontSize="13px" color="#CBD5E1" lineHeight="1.5">{tip}</Text>
            </Flex>
          ))}
        </Flex>
      </Box>

      {/* Document verification */}
      <Box bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="14px" p="20px">
        <Flex align="center" justify="center" mb="12px">
          <Box color="#B0BAC8"><FiShield size={32} /></Box>
        </Flex>
        <Text fontSize="14px" fontWeight="semibold" color="#1C2833" textAlign="center" mb="4px">
          Verifikasi Dokumen
        </Text>
        <Text fontSize="12px" color="#8B9BB4" textAlign="center" mb="16px" lineHeight="1.5">
          Unggah foto KTP nasabah untuk mempercepat proses verifikasi data secara otomatis melalui OCR.
        </Text>
        <Button
          w="full" h="44px" bg="white" border="2px dashed" borderColor="#DDE1E7"
          borderRadius="10px" fontSize="13px" color="#5D6D7E" fontWeight="medium"
          _hover={{ borderColor: "#006397", color: "#006397", bg: "#F0F7FF" }}
        >
          <Flex align="center" gap="8px">
            <FiUpload size={15} />
            Unggah Foto KTP
          </Flex>
        </Button>
      </Box>

      {/* Actions */}
      <Button
        h="48px" bg="#001F40" color="white" borderRadius="12px"
        fontSize="14px" fontWeight="semibold"
        _hover={{ bg: "#0a3060" }}
      >
        <Flex align="center" gap="8px">
          Simpan Data Nasabah
          <FiArrowRight size={16} />
        </Flex>
      </Button>
      <Button
        h="44px" bg="white" color="#5D6D7E" borderRadius="12px"
        border="1px solid" borderColor="#DDE1E7"
        fontSize="14px" fontWeight="medium"
        _hover={{ bg: "#F8FAFC" }}
      >
        Batalkan
      </Button>
    </Flex>
  )
}

// ─── Perusahaan Form ──────────────────────────────────────────────────────────

function PerusahaanForm() {
  const [sameAddress, setSameAddress] = useState(false)
  const [sameWA, setSameWA] = useState(false)

  const tipeOptions = [
    "Pilih Tipe Bisnis", "PT (Perseroan Terbatas)", "CV (Commanditaire Vennootschap)",
    "Firma", "Koperasi", "Yayasan", "Perorangan (UMKM)",
  ]

  return (
    <Flex flexDir="column" gap="20px">
      {/* Company Info */}
      <SectionCard icon={<FiBriefcase size={18} />} title="Informasi Perusahaan">
        <Flex flexDir="column" gap="20px">
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="20px">
            <Box>
              <Label>Nama Perusahaan</Label>
              <Input
                h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="Contoh: PT Teknologi Maju Jaya"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
            <Box>
              <Label>Nama Legal</Label>
              <Input
                h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="Sesuai Akta Notaris"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
            <Box>
              <Label>NPWP</Label>
              <Input
                h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="01.065.065.0-045.060"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
          </Grid>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="20px">
            <Box>
              <Label>NB</Label>
              <Input
                h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="Nomor Induk Berusaha"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
            <Box>
              <Label>Tipe Bisnis</Label>
              <Box
                as="select"
                h="44px" w="full" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" color="#5D6D7E" px="12px"
                style={{ outline: "none" }}
              >
                {tipeOptions.map((o) => (
                  <option key={o} value={o === "Pilih Tipe Bisnis" ? "" : o}>{o}</option>
                ))}
              </Box>
            </Box>
            <Box>
              <Label>Email Kantor</Label>
              <Input
                type="email" h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="corporate@company.com"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
          </Grid>

          <Box>
            <Label>No. Telp Kantor</Label>
            <Input
              h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" placeholder="021-1234567"
              _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
            />
          </Box>

          <Box>
            <Label>Alamat Operasional</Label>
            <Textarea
              bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" rows={3}
              placeholder="Alamat lengkap operasional saat ini..."
              _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              resize="none"
            />
          </Box>

          <Box>
            <Flex justify="space-between" align="center" mb="6px">
              <Label>Alamat Legal (Domisili/NPWP)</Label>
              <Text
                fontSize="12px" color="#006397" cursor="pointer" fontWeight="medium"
                _hover={{ textDecor: "underline" }}
                onClick={() => setSameAddress(!sameAddress)}
              >
                Samakan dengan Operasional
              </Text>
            </Flex>
            <Textarea
              bg={sameAddress ? "#F8FAFC" : "white"} border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
              fontSize="14px" rows={3}
              placeholder="Alamat sesuai dokumen hukum..."
              _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              resize="none"
            />
          </Box>
        </Flex>
      </SectionCard>

      {/* PIC Info */}
      <SectionCard icon={<FiUser size={18} />} title="Informasi PIC">
        <Text fontSize="13px" color="#8B9BB4" mb="20px">
          Detail orang yang bertanggung jawab atas Person in Charge/el.
        </Text>
        <Flex flexDir="column" gap="20px">
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="20px">
            <Box>
              <Label>Nama PIC</Label>
              <Input
                h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="Nama Lengkap PIC"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
            <Box>
              <Label>Jabatan PIC</Label>
              <Input
                h="44px" bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="10px"
                fontSize="14px" placeholder="Contoh: Direktur Keuangan"
                _placeholder={{ color: "#B0BAC8" }} _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>
          </Grid>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="20px">
            <Box>
              <Label>No. HP PIC</Label>
              <PhoneInput placeholder="08xxxxxxxx" />
            </Box>
            <Box>
              <Flex justify="space-between" align="center" mb="6px">
                <Label>No. WA PIC</Label>
                <Flex
                  align="center" gap="6px" cursor="pointer"
                  onClick={() => setSameWA(!sameWA)}
                >
                  <Flex
                    w="16px" h="16px" borderRadius="4px" border="2px solid"
                    borderColor={sameWA ? "#006397" : "#DDE1E7"}
                    bg={sameWA ? "#006397" : "white"}
                    align="center" justify="center" flexShrink={0}
                  >
                    {sameWA && <FiCheck size={10} color="white" />}
                  </Flex>
                  <Text fontSize="12px" color="#5D6D7E">Sama</Text>
                </Flex>
              </Flex>
              <PhoneInput placeholder="08xxxxxxxx" />
            </Box>
          </Grid>
        </Flex>
      </SectionCard>
    </Flex>
  )
}

// ─── Perusahaan Sidebar ───────────────────────────────────────────────────────

function PerusahaanSidebar() {
  const checks = [
    "NIP/NPWP telah diverifikasi",
    "Dokumen akta terisi",
    "Alamat legal sesuai dokumen resmi",
  ]

  return (
    <Flex flexDir="column" gap="16px">
      {/* Verification checklist */}
      <Box bg="#001F40" borderRadius="14px" p="20px">
        <Text fontSize="14px" fontWeight="semibold" color="white" mb="8px">Verifikasi Data</Text>
        <Text fontSize="12px" color="#CBD5E1" mb="16px" lineHeight="1.5">
          Pastikan informasi perusahaan berikut sudah terisi sebelum verifikasi. Kami akan menghubungi Anda dalam 1x24 jam setelah data terverifikasi.
        </Text>
        <Flex flexDir="column" gap="10px">
          {checks.map((c, i) => (
            <Flex key={i} align="center" gap="10px">
              <Flex
                w="18px" h="18px" borderRadius="full" border="2px solid"
                borderColor="#475569" align="center" justify="center" flexShrink={0}
              />
              <Text fontSize="13px" color="#CBD5E1">{c}</Text>
            </Flex>
          ))}
        </Flex>
      </Box>

      {/* Legal doc upload */}
      <Box bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="14px" p="20px">
        <Flex align="center" justify="center" mb="12px">
          <Box color="#B0BAC8"><FiUpload size={28} /></Box>
        </Flex>
        <Text fontSize="13px" fontWeight="semibold" color="#1C2833" textAlign="center" mb="4px">
          Unggah Dokumen Legal
        </Text>
        <Text fontSize="12px" color="#8B9BB4" textAlign="center" mb="14px" lineHeight="1.5">
          Akta pendirian, NPWP perusahaan, dan dokumen legalitas lainnya.
        </Text>
        <Button
          w="full" h="44px" bg="white" border="2px dashed" borderColor="#DDE1E7"
          borderRadius="10px" fontSize="13px" color="#5D6D7E" fontWeight="medium"
          _hover={{ borderColor: "#006397", color: "#006397", bg: "#F0F7FF" }}
        >
          <Flex align="center" gap="8px">
            <FiUpload size={14} />
            Pilih Dokumen
          </Flex>
        </Button>
      </Box>

      {/* Actions */}
      <Button
        h="48px" bg="#001F40" color="white" borderRadius="12px"
        fontSize="14px" fontWeight="semibold"
        _hover={{ bg: "#0a3060" }}
      >
        <Flex align="center" gap="8px">
          Simpan Data Nasabah
          <FiArrowRight size={16} />
        </Flex>
      </Button>
      <Button
        h="44px" bg="white" color="#5D6D7E" borderRadius="12px"
        border="1px solid" borderColor="#DDE1E7"
        fontSize="14px" fontWeight="medium"
        _hover={{ bg: "#F8FAFC" }}
      >
        Batalkan
      </Button>

      {/* Notice */}
      <Box bg="#FFFBEB" border="1px solid" borderColor="#FDE68A" borderRadius="10px" p="12px">
        <Text fontSize="12px" color="#92400E" lineHeight="1.5">
          <Text as="span" fontWeight="semibold">Perhatian:</Text> Agen Perusahaan hanya bisa mendapatkan 1 kode agen utama yang berlaku seumur hidup. Pastikan data sudah benar sebelum menyimpan.
        </Text>
      </Box>
    </Flex>
  )
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      h="40px" px="28px"
      bg={active ? "white" : "transparent"}
      color={active ? "#001F40" : "#8B9BB4"}
      fontWeight={active ? "semibold" : "medium"}
      fontSize="14px"
      borderRadius="8px"
      boxShadow={active ? "0 1px 4px rgba(0,0,0,0.10)" : "none"}
      _hover={{ color: "#001F40" }}
    >
      {label}
    </Button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const [tab, setTab] = useState<"perorangan" | "perusahaan">("perorangan")

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}><TopBar /></Box>

        <Flex p="24px" gap="24px" flexDir="column">

          {/* Page header */}
          <Box>
            <Text fontSize="24px" fontWeight="bold" color="#001F40">Daftarkan Nasabah Baru</Text>
            <Text fontSize="14px" color="#5D6D7E" mt="4px">
              Isi formulir berikut untuk menambahkan data nasabah ke dalam sistem.
            </Text>
          </Box>

          {/* Tab switcher */}
          <Flex>
            <Flex bg="#E9EDF2" borderRadius="10px" p="4px" gap="2px">
              <TabBtn label="Perorangan" active={tab === "perorangan"} onClick={() => setTab("perorangan")} />
              <TabBtn label="Perusahaan" active={tab === "perusahaan"} onClick={() => setTab("perusahaan")} />
            </Flex>
          </Flex>

          {/* Content grid */}
          <Grid templateColumns={{ base: "1fr", lg: "1fr 300px" }} gap="24px" alignItems="flex-start">
            {/* Left: form */}
            <Box>
              {tab === "perorangan" ? <PeroranganForm /> : <PerusahaanForm />}
            </Box>

            {/* Right: sidebar */}
            <Box>
              {tab === "perorangan" ? <PeroranganSidebar /> : <PerusahaanSidebar />}
            </Box>
          </Grid>

        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
