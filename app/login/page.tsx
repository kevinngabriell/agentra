"use client"

import { Button, Card, Checkbox, Field, Flex, Image, Input, InputGroup, Link, Text } from "@chakra-ui/react";
import { PasswordInput } from "../../components/ui/password-input";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login(){
    const [agreed, setAgreed] = useState(false);
    const router = useRouter();
      
      const handleLogin = () => {
        router.push('/agentra/dashboard');
      };

    return(
        <Flex backgroundColor={"#1A3557"} p={16} gap={"31.18px"} flexDir={"column"} minH={"100vh"} alignItems={"center"} justifyContent={"center"}>
            <Card.Root backgroundColor={"#FFFFFF"} p={"32px"} w={{base: "450px", md: "500px"}}>
                <Card.Body alignItems={"center"} w={"100%"}>
                    <Flex pb={"32px"} flexDir={"column"} alignItems={"center"}>
                        <Image src={"../assets/icon.svg"}/>
                        <Text color={"#001F40"} fontSize={32} fontWeight={"bold"}>Agentra</Text>
                        <Text color={"#5D6D7E"} fontSize={"14px"} textAlign={"center"}>Masuk ke Agentra CRM untuk mengelola polis dan nasabah Anda.</Text>
                    </Flex>
                    <Flex gap={"24px"} flexDir={"column"} w={"100%"}>
                        <Field.Root>
                            <Field.Label color={"#1C2833"} fontWeight={"semibold"} fontSize={"16px"}>Email</Field.Label>
                            <Input type="email" placeholder="nama@perusahaan.com" borderColor={"#DDE1E7"} borderRadius={8}/>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label color={"#1C2833"} fontWeight={"semibold"} fontSize={"16px"}>Password</Field.Label>
                            <InputGroup>
                                <PasswordInput placeholder="testststs" size="md" rounded="lg" />
                            </InputGroup>
                        </Field.Root>

                        <Checkbox.Root checked={agreed} onCheckedChange={v => setAgreed(!!v.checked)}>
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                            <Checkbox.Label fontSize="13px" color={"#5D6D7E"}>
                                Ingat Saya
                            </Checkbox.Label>
                        </Checkbox.Root>
                
                        <Button onClick={handleLogin} backgroundColor={"#001F40"} color={"#FFFFFF"} fontSize={"16px"} borderRadius={"8px"}>Masuk</Button>
                    </Flex>
                    

                    <Text color={"#AEB6BF"} fontSize={12} pt={"32px"}>Agent Portal v2.4.0 — Secured by Movira</Text>
                </Card.Body>
                <Card.Footer p={0} justifyContent={"center"}>
                    <Text color={"#5D6D7E"} fontSize={"14px"} fontWeight={"semibold"}>Belum punya akun ? {" "}
                        <Link href="/register" style={{ color: "#006397", fontWeight: "semibold" }}>Daftar Disini</Link>
                    </Text>
                </Card.Footer>
            </Card.Root>
            <Flex flexDir={"column"} gap={"16px"} alignItems={"center"}>
                <Text color={"#859EC6"} fontSize={12} textAlign={"center"}>© 2024 Insurance CRM Indonesia. Seluruh hak cipta dilindungi undang-undang.</Text>
                <Flex justifyContent={"space-between"} width={"max-content"} gap={"16px"}>
                    <Text color={"#859EC6"} fontSize={12}>Syarat & Ketentuan</Text>
                    <Text color={"#859EC6"} fontSize={12}>Kebijakan Privasi</Text>
                    <Text color={"#859EC6"} fontSize={12}>Bantuan</Text>
                </Flex>
            </Flex>
        </Flex>
    );
}