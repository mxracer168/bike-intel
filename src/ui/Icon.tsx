type IconName = 'chevron-down' | 'check' | 'alert' | 'info' | 'arrow-right'

const paths: Record<IconName, React.ReactNode> = {
  'chevron-down': <path d="M3.5 6 8 10.5 12.5 6" />,
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  alert: <><path d="M8 2.5 14 13.5H2L8 2.5Z" /><path d="M8 6.5v3.2M8 11.6v.1" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.2v3.8M8 5v.1" /></>,
  'arrow-right': <path d="M3 8h10M9 4l4 4-4 4" />,
}

/** Small, quiet line icons. Decorative unless given a label. */
export function Icon({ name, size = 16, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  )
}
