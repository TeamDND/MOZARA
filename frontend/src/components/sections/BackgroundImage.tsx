import type React from "react"

interface BackgroundImageProps {
  parallaxOffset: number
}

export default function BackgroundImage({ parallaxOffset }: BackgroundImageProps) {
  return (
    <div
      className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/hair-care-1.jpg')",
        transform: `translateY(${parallaxOffset}px)`,
        zIndex: -1,
        backgroundAttachment: 'fixed'
      }}
    />
  )
}
