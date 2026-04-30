import { MobileBottomNav, MobileHeader, Sidebar, TopBar } from "@/components/layout";
import { Box, Text } from "@chakra-ui/react";

export default function Customer(){
    return(
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "200px" }}>
                <TopBar />
                <Text>Customer</Text>
            </Box>

            
            <MobileBottomNav />
        </Box>
    );
}