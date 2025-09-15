import React from "react"

interface IconProps {
  className?: string
  style?: React.CSSProperties
}

export const Shield = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 22h20L12 2z"></path>
  </svg>
)

export const Camera = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="13" width="18" height="8"></rect>
    <line x1="3" y1="13" x2="3" y2="17"></line>
    <line x1="21" y1="13" x2="21" y2="17"></line>
    <path d="M13 17h3a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h3"></path>
    <line x1="10" y1="9" x2="10" y2="9.01"></line>
    <line x1="14" y1="9" x2="14" y2="9.01"></line>
  </svg>
)

export const TrendingUp = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 6 23 12 17 12"></polyline>
    <polyline points="1 18 1 12 7 12"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
    <polyline points="7 18 1 18 1 12"></polyline>
    <line x1="17" y1="6" x2="23" y2="12"></line>
    <line x1="7" y1="18" x2="1" y2="12"></line>
  </svg>
)

export const Lock = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
)

export const Clock = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)

export const Users = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2"></path>
  </svg>
)

export const Heart = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
)

export const MapPin = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
)

export const BookOpen = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H2a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z"></path>
    <path d="M18 2h.01"></path>
    <path d="M18 22h.01"></path>
  </svg>
)

export const CheckCircle = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 9"></polyline>
  </svg>
)

export const ChevronLeft = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
)

export const ChevronRight = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
)

export const Home = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
)

export const BarChart3 = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    <path d="M12 22v-5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z"></path>
    <path d="M2 12h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"></path>
    <path d="M22 12h-5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2z"></path>
  </svg>
)

export const Sprout = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="8" y1="12" x2="12" y2="12"></line>
    <line x1="16" y1="12" x2="12" y2="12"></line>
    <line x1="12" y1="12" x2="12" y2="16"></line>
    <line x1="12" y1="12" x2="16" y2="12"></line>
    <line x1="12" y1="12" x2="12" y2="8"></line>
    <line x1="12" y1="12" x2="8" y2="12"></line>
  </svg>
)

export const User = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

