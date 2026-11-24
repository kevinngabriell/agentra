import { Box, Grid, VStack, HStack, Text, Heading } from "@chakra-ui/react"
import { LuX, LuCheck } from "react-icons/lu"

// Qualitative comparison only (no invented time-saved or accuracy figures).
const rows = [
  { before: "Tanggal jatuh tempo dicek manual dari berkas", after: "Renewal dikelompokkan menurut kedekatan jatuh tempo" },
  { before: "Pesan renewal diketik satu per satu", after: "Pesan WhatsApp dari template, dikirim dari daftar renewal" },
  { before: "Komisi dicocokkan dari rekening koran dan catatan", after: "Status komisi per polis: pending, diterima, atau selisih" },
  { before: "Porsi koasuransi dihitung di sheet terpisah", after: "Beberapa penanggung dan porsinya tersimpan di polis" },
  { before: "Bagi hasil sub-agen dihitung di akhir bulan", after: "Pembagian komisi sub-agen diatur di aplikasi" },
]

export function ComparisonSection() {
  return (
    <Box as="section" bg="white" px={{ base: 6, md: 12 }} py={{ base: 16, md: 24 }}>
      <VStack maxW="1000px" mx="auto" gap={10}>
        <VStack gap={4} textAlign="center" maxW="620px">
          <Text fontSize="sm" fontWeight="semibold" color="#3B82F6" textTransform="uppercase" letterSpacing="wide">
            Perbandingan
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Spreadsheet vs Agentra untuk agen asuransi umum
          </Heading>
        </VStack>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 4, md: 6 }} w="100%">
          <Box borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={{ base: 6, md: 8 }}>
            <Heading as="h3" fontSize="md" fontWeight="semibold" color="gray.600" mb={5}>Cara lama</Heading>
            <VStack as="ul" align="stretch" gap={4} listStyleType="none" m={0} p={0}>
              {rows.map((r) => (
                <HStack as="li" key={r.before} align="flex-start" gap={3}>
                  <Box color="gray.400" mt="3px" flexShrink={0} aria-hidden="true"><LuX size={18} /></Box>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.6">{r.before}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>
          <Box borderRadius="2xl" border="2px solid" borderColor="#3B82F6" bg="#0D1B3E" p={{ base: 6, md: 8 }}>
            <Heading as="h3" fontSize="md" fontWeight="semibold" color="#93C5FD" mb={5}>Dengan Agentra</Heading>
            <VStack as="ul" align="stretch" gap={4} listStyleType="none" m={0} p={0}>
              {rows.map((r) => (
                <HStack as="li" key={r.after} align="flex-start" gap={3}>
                  <Box color="#60A5FA" mt="3px" flexShrink={0} aria-hidden="true"><LuCheck size={18} /></Box>
                  <Text fontSize="sm" color="gray.100" lineHeight="1.6">{r.after}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        </Grid>
      </VStack>
    </Box>
  )
}
