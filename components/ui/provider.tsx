"use client"

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      {/* The whole UI is styled with fixed light-theme hex colours, so following the OS
          dark mode would render dark Chakra surfaces under light-theme text. Keep it light
          until the components are moved to semantic tokens. */}
      <ColorModeProvider forcedTheme="light" {...props} />
    </ChakraProvider>
  )
}
