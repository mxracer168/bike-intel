type IconName = 'chevron-down' | 'chevron-right' | 'check' | 'alert' | 'info' | 'arrow-right' | 'menu' | 'close' | 'search' | 'external'

const paths: Record<IconName, React.ReactNode> = {
  'chevron-down': <path d="M3.5 6 8 10.5 12.5 6" />,
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  alert: <><path d="M8 2.5 14 13.5H2L8 2.5Z" /><path d="M8 6.5v3.2M8 11.6v.1" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.2v3.8M8 5v.1" /></>,
  'arrow-right': <path d="M3 8h10M9 4l4 4-4 4" />,
  'chevron-right': <path d="M6 3.5 10.5 8 6 12.5" />,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  search: <><circle cx="7" cy="7" r="4.25" /><path d="m10.2 10.2 3.3 3.3" /></>,
  external: <path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />,
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
