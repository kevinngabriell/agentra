import { Box, VStack, Grid, Text, Heading } from "@chakra-ui/react"
import { LuCalendarX2, LuScale, LuLayers } from "react-icons/lu"

// Pain points of a general-insurance agent with many policies and several insurers.
// Phrased as situations, not statistics: no numbers are claimed.
const problems = [
  {
    icon: LuCalendarX2,
    title: "Renewal yang terlewat",
    description:
      "Tanggal jatuh tempo tersebar di puluhan berkas dan sheet. Satu polis kelewat berarti nasabah pindah agen atau polis lapse.",
  },
  {
    icon: LuScale,
    title: "Komisi yang tidak cocok",
    description:
      "Komisi dari tiap perusahaan asuransi datang di waktu dan jumlah berbeda. Tanpa catatan per polis, selisih sulit dilacak.",
  },
  {
    icon: LuLayers,
    title: "Koasuransi dan sub-agen yang rumit",
    description:
      "Porsi beberapa penanggung dan pembagian komisi sub-agen dihitung manual, lalu dicatat ulang di tempat lain.",
  },
]

export function ProblemSection() {
  return (
    <Box as="section" bg="white" px={{ base: 6, md: 12 }} py={{ base: 16, md: 24 }}>
      <VStack maxW="1200px" mx="auto" gap={12}>
        <VStack gap={4} textAlign="center" maxW="640px">
          <Text fontSize="sm" fontWeight="semibold" color="#3B82F6" textTransform="uppercase" letterSpacing="wide">
            Masalahnya
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Mengelola portofolio polis dengan Excel dan buku catatan
          </Heading>
          <Text fontSize="md" color="gray.500" lineHeight="1.75">
            Semakin banyak nasabah dan perusahaan asuransi, semakin besar risiko ada yang terlewat.
            Agentra mengambil alih pekerjaan mengingat dan mencocokkan itu.
          </Text>
        </VStack>

        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} w="100%">
          {problems.map(({ icon: Icon, title, description }) => (
            <Box key={title} borderRadius="2xl" p={8} border="1px solid" borderColor="gray.200" bg="white">
              <VStack align="flex-start" gap={4}>
                <Box color="#0D1B3E" aria-hidden="true"><Icon size={28} /></Box>
                <Heading as="h3" fontSize="lg" fontWeight="semibold" color="#0D1B3E">{title}</Heading>
                <Text fontSize="sm" color="gray.600" lineHeight="1.75">{description}</Text>
              </VStack>
            </Box>
          ))}
        </Grid>
      </VStack>
    </Box>
  )
}
