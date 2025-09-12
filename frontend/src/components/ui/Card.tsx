import React from "react"

interface CardProps {
  className?: string
  children: React.ReactNode
}

export const Card = ({ className = "", children }: CardProps) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>
)

export const CardHeader = ({ className = "", children }: CardProps) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
)

export const CardTitle = ({ className = "", children }: CardProps) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
)

export const CardDescription = ({ className = "", children }: CardProps) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
)

