"use client"

import { Sidebar, MobileHeader, MobileBottomNav, TopBar } from "@/components/layout";
import { Box, Button, Card, Checkbox, Field, FileUpload, Flex, Icon, Image, Input, List, NativeSelect, SimpleGrid, Tabs, Text, Textarea } from "@chakra-ui/react";
import { FaInfoCircle, FaArrowRight, FaRegFileImage, FaLock } from "react-icons/fa";
import { LuUpload, LuUser } from "react-icons/lu";
import verifiedImg from "@/assets/verified.png";
import companyImg from "@/assets/company.png";

const lbl = { color: "#5D6D7E", fontSize: "12px", fontWeight: "semibold" } as const;
const clbl = { color: "#1C2833", fontSize: "14px", fontWeight: "medium" } as const;

const PhoneInput = ({ placeholder = "81234567890" }) => (
    <Flex border="1px solid" borderColor="#E2E8F0" borderRadius="md" overflow="hidden">
        <Box px="3" display="flex" alignItems="center" bg="#F8FAFC" color="#94A3B8" fontSize="14px" borderRight="1px solid" borderRightColor="#E2E8F0" whiteSpace="nowrap">+62</Box>
        <Input border="0" borderRadius="0" placeholder={placeholder} />
    </Flex>
);

export default function CustomerDetail() {
    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />
            <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Customer Detail" />
                </Box>

                <Flex gap="32px" p="32px" flexDir="column">
                    <Tabs.Root defaultValue="individual" variant="plain">
                        <Tabs.List bg="#EDEDF0" borderRadius="10px" p="4px" gap="2px" w="max-content">
                            {(["individual", "corporate"] as const).map((v, i) => (
                                <Tabs.Trigger key={v} value={v} px="20px" py="8px" borderRadius="8px" fontSize="14px" fontWeight="medium" color="#64748B" _selected={{ bg: "white", color: "#0F172A", fontWeight: "bold", shadow: "sm" }} transition="all 0.15s">
                                    {["Perorangan", "Perusahaan"][i]}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>

                        {/* ── Individual ── */}
                        <Tabs.Content value="individual">
                            <Flex w="100%" gap="32px">
                                <Flex w="70%">
                                    <Card.Root w="100%" border="1px solid" borderColor="#F1F5F9" borderRadius="12px">
                                        <Card.Body gap="24px" p="32px">
                                            <Flex borderLeft="4px solid" borderColor="#1A3557" pl="12px" alignItems="center">
                                                <Text color="#1A3557" fontSize="18px" fontWeight="semibold">Data Identitas</Text>
                                            </Flex>
                                            <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                <Field.Root>
                                                    <Field.Label {...lbl}>NOMOR INDUK KEPENDUDUKAN (NIK)</Field.Label>
                                                    <Input placeholder="Contoh: 3273012345678901" />
                                                </Field.Root>
                                                <Field.Root>
                                                    <Field.Label {...lbl}>NPWP (OPSIONAL)</Field.Label>
                                                    <Input placeholder="00.000.000.0-000.000" />
                                                </Field.Root>
                                            </SimpleGrid>
                                            <Field.Root>
                                                <Field.Label {...lbl}>NAMA LENGKAP (SESUAI KTP)</Field.Label>
                                                <Input placeholder="Masukkan nama lengkap" />
                                            </Field.Root>
                                            <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                <Field.Root>
                                                    <Field.Label {...lbl}>TANGGAL LAHIR</Field.Label>
                                                    <Input type="date" />
                                                </Field.Root>
                                                <Field.Root>
                                                    <Field.Label {...lbl}>EMAIL</Field.Label>
                                                    <Input placeholder="nama@email.com" />
                                                </Field.Root>
                                            </SimpleGrid>
                                            <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                <Field.Root>
                                                    <Field.Label {...lbl}>NO. TELEPON (HP)</Field.Label>
                                                    <PhoneInput />
                                                </Field.Root>
                                                <Field.Root>
                                                    <Field.Label {...lbl}>NO. WHATSAPP</Field.Label>
                                                    <PhoneInput />
                                                </Field.Root>
                                            </SimpleGrid>
                                            <Field.Root>
                                                <Field.Label {...lbl}>ALAMAT LENGKAP</Field.Label>
                                                <Textarea placeholder="Contoh: Jl. Sudirman No. 123, Kebayoran Baru, Jakarta Selatan" />
                                            </Field.Root>
                                        </Card.Body>
                                    </Card.Root>
                                </Flex>

                                <Flex w="30%" gap="24px" flexDir="column">
                                    {/* Petunjuk Pengisian */}
                                    <Card.Root bgColor="#1A3557" color="white" borderRadius="12px">
                                        <Card.Body gap="16px">
                                            <Flex gap="8px" alignItems="center" fontWeight="semibold" fontSize="16px">
                                                <FaInfoCircle color="#7DD3FC" /> Petunjuk Pengisian
                                            </Flex>
                                            <List.Root gap="12px" ps="4" listStyleType="disc" color="#7DD3FC">
                                                {[
                                                    "Pastikan data NIK telah divalidasi melalui sistem Dukcapil pusat.",
                                                    "Nama lengkap harus sesuai dengan E-KTP tanpa gelar (kecuali profesional).",
                                                    "Nomor WhatsApp aktif diperlukan untuk pengiriman e-Polis secara otomatis.",
                                                ].map((t, i) => <List.Item key={i} fontSize="12px" color="white">{t}</List.Item>)}
                                            </List.Root>
                                        </Card.Body>
                                    </Card.Root>

                                    {/* Verifikasi Dokumen */}
                                    <Card.Root borderRadius="12px">
                                        <Card.Body p="16px">
                                            <Flex flexDir="column" alignItems="center" gap="12px" border="2px dashed" borderColor="#CBD5E1" borderRadius="10px" p="16px">
                                                <Image src={verifiedImg.src} w="72px" />
                                                <Text color="#1A3557" fontSize="15px" fontWeight="semibold" textAlign="center">Verifikasi Dokumen</Text>
                                                <Text color="#64748B" fontSize="12px" textAlign="center">Unggah foto KTP nasabah untuk mempercepat proses verifikasi data secara otomatis melalui OCR</Text>
                                                <Flex w="100%" alignItems="center" justifyContent="center" gap="8px" border="1px solid" borderColor="#CBD5E1" borderRadius="8px" py="10px" color="#94A3B8" fontSize="13px" cursor="pointer" _hover={{ borderColor: "#93C5FD", color: "#60A5FA" }}>
                                                    <FaRegFileImage size={15} /> Unggah Foto KTP
                                                </Flex>
                                            </Flex>
                                        </Card.Body>
                                    </Card.Root>

                                    <Flex flexDir="column" gap="12px">
                                        <Button bgColor="#1A3557" color="white" fontSize="14px" fontWeight="bold" py="16px" borderRadius="10px">
                                            Simpan Data Nasabah <FaArrowRight />
                                        </Button>
                                        <Button bgColor="white" color="#5D6D7E" fontSize="14px" border="1px solid" borderColor="#DDE1E7" py="16px" borderRadius="10px">Batalkan</Button>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Tabs.Content>

                        {/* ── Corporate ── */}
                        <Tabs.Content value="corporate">
                            <Flex gap="32px" flexDir="column">
                                {/* Informasi Perusahaan */}
                                <Card.Root borderRadius="12px" border="1px solid" borderColor="#F1F5F9">
                                    <Card.Body gap="24px" p="32px">
                                        <Flex gap="12px" alignItems="center">
                                            <Image src={companyImg.src} w="40px" h="40px" />
                                            <Flex flexDir="column">
                                                <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Informasi Perusahaan</Text>
                                                <Text color="#5D6D7E" fontSize="12px">Lengkapi detail legalitas dan operasional perusahaan nasabah</Text>
                                            </Flex>
                                        </Flex>
                                        <SimpleGrid columns={{ lg: 3 }} gap="24px">
                                            <Field.Root><Field.Label {...clbl}>Nama Perusahaan</Field.Label><Input placeholder="Contoh: PT Teknologi Maju Jaya" /></Field.Root>
                                            <Field.Root><Field.Label {...clbl}>Nama Legal</Field.Label><Input placeholder="Sesuai Akta Notaris" /></Field.Root>
                                            <Field.Root><Field.Label {...clbl}>NPWP</Field.Label><Input placeholder="00.000.000.0-000.000" /></Field.Root>
                                        </SimpleGrid>
                                        <SimpleGrid columns={{ lg: 3 }} gap="24px">
                                            <Field.Root><Field.Label {...clbl}>NIB</Field.Label><Input placeholder="Nomor Induk Berusaha" /></Field.Root>
                                            <Field.Root>
                                                <Field.Label {...clbl}>Tipe Bisnis</Field.Label>
                                                <NativeSelect.Root>
                                                    <NativeSelect.Field placeholder="Pilih Tipe Bisnis">
                                                        <option>PT</option><option>CV</option><option>Firma</option><option>Koperasi</option>
                                                    </NativeSelect.Field>
                                                    <NativeSelect.Indicator />
                                                </NativeSelect.Root>
                                            </Field.Root>
                                            <Field.Root><Field.Label {...clbl}>Email Kantor</Field.Label><Input placeholder="corporate@company.com" /></Field.Root>
                                        </SimpleGrid>
                                        <SimpleGrid columns={{ md: 2 }} gap="24px">
                                            <Field.Root><Field.Label {...clbl}>No. Telp Kantor</Field.Label><Input placeholder="(021) 1234567" /></Field.Root>
                                            <Field.Root><Field.Label {...clbl}>Alamat Operasional</Field.Label><Input placeholder="Alamat lengkap operasional saat ini..." /></Field.Root>
                                        </SimpleGrid>
                                        <Field.Root>
                                            <Flex justifyContent="space-between" alignItems="center">
                                                <Field.Label {...clbl} mb="0">Alamat Legal (Sesuai Domisili/NPWP)</Field.Label>
                                                <Text color="#3B82F6" fontSize="12px" cursor="pointer">⟳ Samakan dengan Operasional</Text>
                                            </Flex>
                                            <Input placeholder="Alamat sesuai dokumen hukum..." mt="2" />
                                        </Field.Root>
                                    </Card.Body>
                                </Card.Root>

                                <Flex w="100%" gap="32px">
                                    {/* Informasi PIC */}
                                    <Flex w="70%">
                                        <Card.Root w="100%" borderRadius="12px" border="1px solid" borderColor="#F1F5F9">
                                            <Card.Body gap="24px" p="32px">
                                                <Flex gap="12px" alignItems="center">
                                                    <Box p="8px" bg="#EFF6FF" borderRadius="8px" color="#1A3557"><LuUser size={20} /></Box>
                                                    <Flex flexDir="column">
                                                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Informasi PIC</Text>
                                                        <Text color="#5D6D7E" fontSize="12px">Detail orang yang bertanggung jawab (Person In Charge).</Text>
                                                    </Flex>
                                                </Flex>
                                                <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                    <Field.Root><Field.Label {...clbl}>Nama PIC</Field.Label><Input placeholder="Nama Lengkap PIC" /></Field.Root>
                                                    <Field.Root><Field.Label {...clbl}>Jabatan PIC</Field.Label><Input placeholder="Contoh: Direktur Keuangan" /></Field.Root>
                                                </SimpleGrid>
                                                <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                    <Field.Root><Field.Label {...clbl}>No. HP PIC</Field.Label><Input placeholder="0812xxxx" /></Field.Root>
                                                    <Field.Root>
                                                        <Field.Label {...clbl}>No. WA PIC</Field.Label>
                                                        <Flex gap="8px" alignItems="center">
                                                            <Input placeholder="0812xxxx" />
                                                            <Checkbox.Root size="sm" defaultChecked colorPalette="green">
                                                                <Checkbox.HiddenInput />
                                                                <Checkbox.Control />
                                                                <Checkbox.Label fontSize="12px" color="#5D6D7E" whiteSpace="nowrap">Sama</Checkbox.Label>
                                                            </Checkbox.Root>
                                                        </Flex>
                                                    </Field.Root>
                                                </SimpleGrid>
                                            </Card.Body>
                                        </Card.Root>
                                    </Flex>

                                    {/* Right sidebar */}
                                    <Flex w="30%" gap="24px" flexDir="column">
                                        <Card.Root bgColor="#1A3557" color="white" borderRadius="12px">
                                            <Card.Body gap="12px">
                                                <Text fontSize="16px" fontWeight="semibold">Verifikasi Data</Text>
                                                <Text fontSize="12px" color="#BFDBFE">Pastikan seluruh informasi perusahaan dan PIC telah sesuai dengan dokumen legal asli untuk mempercepat proses underwriting.</Text>
                                                <Flex flexDir="column" gap="8px" my="4px">
                                                    {[
                                                        { label: "NPWP tervalidasi oleh sistem", done: true },
                                                        { label: "Dokumen NIB telah diunggah", done: false },
                                                        { label: "Alamat legal telah diverifikasi", done: false },
                                                    ].map((item, i) => (
                                                        <Flex key={i} gap="8px" alignItems="center">
                                                            <Box w="10px" h="10px" borderRadius="full" flexShrink={0} bg={item.done ? "#4ADE80" : "transparent"} border={item.done ? "none" : "2px solid #94A3B8"} />
                                                            <Text fontSize="12px" color={item.done ? "white" : "#94A3B8"}>{item.label}</Text>
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                                <Button bg="white" color="#1A3557" fontSize="14px" fontWeight="semibold" borderRadius="8px">
                                                    Simpan Data Nasabah <FaLock size={12} />
                                                </Button>
                                                <Button bg="transparent" color="#DBEAFE" fontSize="14px" border="1px solid" borderColor="#2F5788" borderRadius="8px">Batalkan</Button>
                                            </Card.Body>
                                        </Card.Root>

                                        <FileUpload.Root maxFiles={5}>
                                            <FileUpload.HiddenInput />
                                            <FileUpload.Dropzone borderRadius="12px">
                                                <Icon size="md" color="fg.muted"><LuUpload /></Icon>
                                                <FileUpload.DropzoneContent>
                                                    <Box fontWeight="bold" fontSize="14px" color="#1C2833">Unggah Dokumen Legal</Box>
                                                    <Box color="#94A3B8" fontSize="12px">PDF, JPG (Maks. 5MB)</Box>
                                                </FileUpload.DropzoneContent>
                                            </FileUpload.Dropzone>
                                            <FileUpload.List />
                                        </FileUpload.Root>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Tabs.Content>
                    </Tabs.Root>
                </Flex>
            </Box>
            <MobileBottomNav />
        </Box>
    );
}
