import type { ReactNode, SVGProps } from 'react'

type SketchIconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

interface BaseSketchIconProps extends SketchIconProps {
  children: ReactNode
}

function BaseSketchIcon({ size = 18, className = '', children, ...props }: BaseSketchIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`icon-sketch ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function LeaderboardSketchIcon({ size = 18, className, ...props }: SketchIconProps) {
  return (
    <BaseSketchIcon size={size} className={className} {...props}>
      <path d="M6 20h12" />
      <path d="M7 10h3v8H7z" />
      <path d="M11 6h3v12h-3z" />
      <path d="M15 12h3v6h-3z" />
      <path d="M8.5 4.8c1.2 0 2.2-.8 2.5-2 .3 1.2 1.3 2 2.5 2" />
      <path d="M8.3 3.8h5.4" />
    </BaseSketchIcon>
  )
}

export function BackupSketchIcon({ size = 18, className, ...props }: SketchIconProps) {
  return (
    <BaseSketchIcon size={size} className={className} {...props}>
      <path d="M5 9.5V5h14v14H5z" />
      <path d="M9 5v4h6V5" />
      <path d="M8 16.5h8" />
      <path d="M12 11v6" />
      <path d="M9.8 14.7 12 17l2.2-2.3" />
    </BaseSketchIcon>
  )
}
