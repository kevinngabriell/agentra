import { Box, VStack, Text, Heading } from "@chakra-ui/react"
import { LuChevronDown } from "react-icons/lu"
import Link from "next/link"

// Single source for the visible FAQ and the FAQPage JSON-LD (StructuredData.tsx imports it),
// so the structured data always matches what the page shows. Plain strings only.
// Do not put prices here: plans come from the API and are shown in the pricing section.
export const FAQ_ITEMS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "Apakah ada CRM untuk agen asuransi umum di Indonesia?",
    answer:
      "Ada. Agentra adalah CRM berbasis web untuk agen asuransi umum independen di Indonesia. Anda dapat mencatat nasabah perorangan (NIK) dan badan usaha (NPWP), polis beserta item pertanggungan dan koasuransinya, memantau renewal, dan melacak komisi. Agentra tidak ditujukan untuk asuransi jiwa.",
  },
  {
    question: "Apakah Agentra bisa mengirim pengingat renewal lewat WhatsApp?",
    answer:
      "Bisa. Dari daftar renewal, Anda dapat mengirim pesan WhatsApp ke nasabah dengan template yang bisa diubah. Anda juga dapat mengaktifkan ringkasan harian dan bulanan yang dikirim ke WhatsApp Anda, serta mengatur batas hari pengingat renewal.",
  },
  {
    question: "Jenis polis asuransi apa saja yang bisa dicatat di Agentra?",
    answer:
      "Polis asuransi umum, yaitu kebakaran, kendaraan (mobil dan motor), perjalanan, cargo, kecelakaan, AEP, dan jenis lainnya. Setiap polis bisa memiliki item pertanggungan dan beberapa penanggung untuk koasuransi.",
  },
  {
    question: "Bagaimana pelacakan komisi di Agentra bekerja?",
    answer:
      "Setiap polis menghasilkan catatan komisi dengan status pending, diterima, atau selisih. Saat komisi dari perusahaan asuransi masuk, Anda mencatat jumlah yang diterima sehingga selisih dari komisi yang diharapkan terlihat. Komisi juga bisa dibagi ke sub-agen sesuai pembagian yang Anda atur.",
  },
  {
    question: "Bagaimana cara mendaftar, dan apakah ada paket gratis?",
    answer:
      "Pendaftaran dilakukan lewat halaman Daftar dalam tiga langkah: akun, profil, dan pilihan paket. Paket yang tersedia beserta harganya ditampilkan di bagian Harga pada halaman ini; paket tanpa biaya akan tertera sebagai Gratis jika tersedia.",
  },
  {
    question: "Apakah Agentra cocok untuk agen asuransi jiwa?",
    answer:
      "Tidak. Agentra dirancang untuk agen asuransi umum (kebakaran, kendaraan, cargo, perjalanan, kecelakaan, AEP), dengan polis tahunan yang perlu diperpanjang dan koasuransi. Alur dan istilah asuransi jiwa tidak didukung.",
  },
  {
    question: "Apakah Agentra bisa dipakai dari HP?",
    answer:
      "Agentra berbasis web, jadi bisa dibuka lewat browser di laptop maupun HP tanpa instalasi. Tampilannya menyesuaikan ukuran layar.",
  },
  {
    question: "Siapa yang membuat Agentra?",
    answer:
      "Agentra dibuat oleh Movira, software house di Tangerang. Saat ini Agentra dipakai oleh seorang agen asuransi umum. Pertanyaan bisa dikirim ke kevin@getmovira.com atau WhatsApp +62 811-4411-307.",
  },
]

export function FaqSection() {
  return (
    <Box
      as="section"
      id="faq"
      bg="white"
      px={{ base: 6, md: 12 }}
      py={{ base: 16, md: 24 }}
    >
      <VStack maxW="1000px" mx="auto" gap={12}>
        <VStack gap={4} textAlign="center" maxW="600px">
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color="#3B82F6"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Tanya Jawab
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Pertanyaan tentang CRM untuk Agen Asuransi Umum
          </Heading>
        </VStack>

        <VStack w="100%" gap={3} align="stretch">
          {FAQ_ITEMS.map((item) => (
            <Box
              as="details"
              key={item.question}
              bg="gray.50"
              borderRadius="xl"
              border="1px solid"
              borderColor="gray.100"
              css={{ "&[open] summary svg": { transform: "rotate(180deg)" } }}
            >
              <Box
                as="summary"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={4}
                px={6}
                py={4}
                minH="56px"
                cursor="pointer"
                listStyleType="none"
                css={{ "&::-webkit-details-marker": { display: "none" } }}
              >
                <Heading as="h3" fontSize="md" fontWeight="semibold" color="#0D1B3E">
                  {item.question}
                </Heading>
                <Box color="gray.500" flexShrink={0} aria-hidden="true">
                  <LuChevronDown size={20} style={{ transition: "transform 0.2s" }} />
                </Box>
              </Box>
              <Text px={6} pb={5} fontSize="sm" color="gray.600" lineHeight="1.75">
                {item.answer}
              </Text>
            </Box>
          ))}
        </VStack>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Butuh jawaban lain? Lihat{" "}
          <Link href="/help">
            <Text as="span" color="#3B82F6" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              Pusat Bantuan
            </Text>
          </Link>{" "}
          atau{" "}
          <Link href="/contact">
            <Text as="span" color="#3B82F6" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              hubungi kami
            </Text>
          </Link>
          .
        </Text>
      </VStack>
    </Box>
  )
}
