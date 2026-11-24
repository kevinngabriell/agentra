import Image from "next/image"

// Official Agentra logo (kit in Documents/agentra/logo, copied to public/brand).
// "dark" = navy artwork for light backgrounds, "light" = white artwork for navy backgrounds.
// SVGs are served as-is (unoptimized): next/image would otherwise refuse them.
const SRC = {
  horizontal: {
    dark: "/brand/agentra-logo-horizontal.svg",
    light: "/brand/agentra-logo-horizontal-white.svg",
    ratio: 575.2 / 168,
  },
  mark: {
    dark: "/brand/agentra-mark.svg",
    light: "/brand/agentra-mark-white.svg",
    ratio: 154 / 184,
  },
} as const

export function Logo({
  variant = "horizontal",
  tone = "dark",
  height = 36,
  priority = false,
  alt = "Agentra",
}: {
  variant?: keyof typeof SRC
  tone?: "dark" | "light"
  height?: number
  priority?: boolean
  alt?: string
}) {
  const asset = SRC[variant]
  return (
    <Image
      src={asset[tone]}
      alt={alt}
      width={Math.round(height * asset.ratio)}
      height={height}
      priority={priority}
      unoptimized
      style={{ height, width: "auto", display: "block" }}
    />
  )
}
