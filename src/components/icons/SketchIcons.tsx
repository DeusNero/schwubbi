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

export function TrailCatSketchIcon({ size = 18, className, ...props }: SketchIconProps) {
  return (
    <BaseSketchIcon size={size} className={className} {...props}>
      <path d="M7 18.8c-2.3-1.2-3.5-3.6-3-6.2.5-2.7 2.9-4.7 5.8-4.9 2.8-.2 5.5 1.6 6.3 4.3.8 2.8-.3 5.7-2.8 7.2" />
      <path d="M7.8 8.3 6.6 5.7 9.4 7" />
      <path d="M14.8 8.5 16.4 6 17.5 8.7" />
      <path d="M8.8 12.8h.01" />
      <path d="M14.5 12.7h.01" />
      <path d="M10 15.5c1.1.9 2.7.9 3.7 0" />
      <path d="M12 13.8v1.1" />
      <path d="M5.2 11.5h-.8" />
      <path d="M19.2 11.9h.8" />
    </BaseSketchIcon>
  )
}

export function TrailHappyCatSketchIcon({ size = 18, className, ...props }: SketchIconProps) {
  return (
    <BaseSketchIcon size={size} className={className} {...props}>
      <path d="M7.1 18.5c-2-1.1-3.3-3.3-3.1-5.8.3-3 2.8-5.5 5.8-5.8 3.7-.3 6.8 2.5 6.8 6.1 0 2.4-1.3 4.5-3.3 5.6" />
      <path d="M8.1 8.4 6.9 5.6 9.7 6.8" />
      <path d="M14.4 8.4 15.8 5.8 17 8.5" />
      <path d="M8.9 12.4c.4-.8 1.3-1.3 2.2-1.3.9 0 1.8.5 2.2 1.3" />
      <path d="M9.1 14.8c.8.6 1.9.9 3 .9s2.1-.3 2.9-.9" />
      <path d="M12 11.3v.8" />
    </BaseSketchIcon>
  )
}

export function TrailHeartSketchIcon({ size = 18, className, ...props }: SketchIconProps) {
  return (
    <BaseSketchIcon size={size} className={className} {...props}>
      <path d="M12 20.1 4.7 12.9C3 11.2 3 8.3 4.8 6.6c1.6-1.5 4.2-1.4 5.7.2l1.5 1.6 1.4-1.6c1.5-1.6 4.1-1.7 5.7-.2 1.8 1.7 1.8 4.6.1 6.3z" />
      <path d="M7.4 8.6c.7-.7 1.8-.7 2.4 0" />
      <path d="M14.1 8.6c.7-.7 1.8-.7 2.4 0" />
    </BaseSketchIcon>
  )
}
