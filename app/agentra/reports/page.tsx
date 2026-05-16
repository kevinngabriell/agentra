import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout";
import { Box } from "@chakra-ui/react";

export default function Reports(){
    return(
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar/>
            <MobileHeader/>
            
            <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Reports" />
                </Box>
            
                            
            </Box>
            
            <MobileBottomNav/>
        </Box>
    );
}