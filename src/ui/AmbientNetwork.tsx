import styles from './AppShell.module.css'

/*
 * A quiet network of lines and nodes anchored in the sidebar's lower left:
 * atmosphere behind the navigation, never content. Approved for the sidebar
 * only (docs/design-system.md, "Application shell"); nowhere else gets a
 * glowing or animated "intelligence" effect. Still when motion is reduced.
 */
const NODES: [number, number, number, '' | 'a' | 'b' | 'c'][] = [
  [186, 112, 5, 'a'], [327, 185, 3, ''], [475, 88, 6, 'b'], [630, 167, 3, ''], [786, 78, 5, 'c'],
  [932, 149, 3, ''], [123, 468, 5, 'b'], [400, 412, 3, ''], [518, 599, 6, 'a'], [722, 370, 3, ''],
  [920, 531, 5, 'c'], [245, 678, 3, ''], [429, 800, 5, 'a'], [650, 793, 3, ''], [823, 860, 5, 'b'],
]

export function AmbientNetwork() {
  return (
    <div className={styles.network} aria-hidden="true">
      <svg fill="none" preserveAspectRatio="xMinYMax slice" viewBox="0 0 1200 900">
        <g className={styles.connections}>
          <path d="M35 192 186 112 327 185 475 88 630 167 786 78 932 149 1138 72" />
          <path d="m186 112 32 206 182 94 75-324" />
          <path d="m327 185 73 227 230-245 92 203 210-221" />
          <path d="m35 192 88 276 277-56 118 187 204-229 198 161 218-58" />
          <path d="m123 468 122 210 273-79 132 194 270-262 218 171" />
          <path d="m245 678 184 122 221-7 173 67" />
        </g>
        <g className={styles.signals}>
          <path d="M35 192 186 112 327 185 475 88 630 167" />
          <path d="m400 412 118 187 204-229 198 161" />
          <path d="m245 678 184 122 221-7 173 67" />
        </g>
        <g className={styles.nodes}>
          {NODES.map(([cx, cy, r, v], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} className={v ? [styles.node, styles[`node_${v}`]].join(' ') : styles.quietNode} />
          ))}
        </g>
      </svg>
    </div>
  )
}
