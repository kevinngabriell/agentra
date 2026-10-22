"use client"

import { useState } from "react"
import { Alert, Box, Button, Text } from "@chakra-ui/react"
import { FiCheck, FiCopy } from "react-icons/fi"

interface ErrorAlertProps {
  status: "success" | "error"
  message: string
  /** API `error.request_id`; shown with a copy button so users can quote it to support. */
  requestId?: string
}

export function ErrorAlert({ status, message, requestId }: ErrorAlertProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(requestId ?? "")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure context); the ID stays selectable on screen.
    }
  }

  return (
    <Alert.Root status={status} mb="16px" borderRadius="8px" alignItems="flex-start">
      <Alert.Indicator />
      <Box flex="1" minW={0}>
        <Alert.Description fontSize="16px">{message}</Alert.Description>
        {requestId && (
          <Box display="flex" alignItems="center" gap="8px" mt="6px" flexWrap="wrap">
            <Text fontSize="16px" opacity={0.8}>ID Error:</Text>
            <Text fontSize="16px" fontFamily="mono" wordBreak="break-all" userSelect="all">{requestId}</Text>
            <Button size="2xs" variant="outline" onClick={copy} aria-label="Salin ID error">
              {copied ? <FiCheck /> : <FiCopy />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
          </Box>
        )}
      </Box>
    </Alert.Root>
  )
}
