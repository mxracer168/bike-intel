import type { AttributeValue } from './types'

/**
 * Reading attributes from how a supplier names an option, keeping both the
 * normalized meaning (for filtering and comparison) and the designation the
 * item is sold under ("700c" and "29″" are both 622 mm; neither is
 * canonical). Generic keys from the V1 seed; nothing here is a column.
 */
export const attributeLabels: Record<string, string> = {
  wheel_size: 'Wheel size',
  tire_width: 'Width',
  valve_type: 'Valve',
  valve_length: 'Valve length',
  drivetrain_speed: 'Speed',
  color: 'Color',
  volume: 'Volume',
}

/** Which attributes become filters once the results narrow to one category (category_attribute, filterable). */
export const categoryFacets: Record<string, string[]> = {
  Tires: ['wheel_size', 'tire_width'],
  'Tubes & spokes': ['wheel_size', 'valve_type', 'valve_length'],
  Drivetrain: ['drivetrain_speed'],
  Accessories: ['color'],
  'Shop supplies': ['volume'],
}

/** ISO bead-seat diameter for the wheel designations in use. */
const BSD: Record<string, { bsd: number; designation: string }> = {
  '29': { bsd: 622, designation: '29″' },
  '700': { bsd: 622, designation: '700c' },
  '27.5': { bsd: 584, designation: '27.5″' },
  '650b': { bsd: 584, designation: '650B' },
  '26': { bsd: 559, designation: '26″' },
  '20': { bsd: 406, designation: '20″' },
  '16': { bsd: 305, designation: '16″' },
}

const COLORS = ['black', 'white', 'red', 'blue', 'green', 'graphite', 'grey', 'orange', 'yellow', 'purple', 'pink', 'tan']

function wheel(label: string): AttributeValue | undefined {
  const m = /^(29|700|27\.5|650b|26|20|16)\s*×/i.exec(label.trim())
  const w = m ? BSD[m[1]!.toLowerCase()] : undefined
  return w ? { value: w.bsd, designation: w.designation } : undefined
}

function width(label: string): AttributeValue | undefined {
  const m = /×\s*(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?/.exec(label)
  if (!m) return undefined
  const first = Number(m[1])
  const range = m[2] ? `${m[1]}–${m[2]}` : m[1]!
  // Inch widths (2.4) or millimetres (25, 40).
  return first < 10
    ? { value: Math.round(first * 25.4), designation: `${range}″` }
    : { value: first, designation: `${range} mm` }
}

/** The attributes this option's label tells us, for the categories we read. Unknown stays unread, never guessed. */
export function readAttributes(category: string, label: string): Record<string, AttributeValue> {
  const out: Record<string, AttributeValue> = {}
  if (!label) return out
  if (category === 'Tires' || category === 'Tubes & spokes') {
    const w = wheel(label); if (w) out.wheel_size = w
    const t = width(label); if (t && category === 'Tires') out.tire_width = t
  }
  if (category === 'Tubes & spokes') {
    const v = /\b(presta|schrader)\b/i.exec(label)
    if (v) out.valve_type = { value: v[1]!.toLowerCase(), designation: v[1]![0]!.toUpperCase() + v[1]!.slice(1).toLowerCase() }
    const len = /\b(\d{2})\s*mm\b/.exec(label)
    if (len && v) out.valve_length = { value: Number(len[1]), designation: `${len[1]} mm` }
  }
  if (category === 'Drivetrain') {
    const sp = /\b(\d{1,2})-speed\b/i.exec(label) ?? /^X(\d{1,2})$/i.exec(label.trim())
    if (sp) out.drivetrain_speed = { value: Number(sp[1]), designation: /^X/i.test(label.trim()) ? `${label.trim()} (${sp[1]}-speed)` : `${sp[1]}-speed` }
  }
  if (category === 'Accessories') {
    const c = COLORS.find((x) => label.toLowerCase().split(/[\s,]+/).includes(x))
    if (c) out.color = { value: c, designation: label }
  }
  if (category === 'Shop supplies') {
    const ml = /(\d+(?:\.\d+)?)\s*ml\b/i.exec(label)
    const l = /(\d+(?:\.\d+)?)\s*L\b/.exec(label)
    const oz = /(\d+(?:\.\d+)?)\s*oz\b/i.exec(label)
    if (ml) out.volume = { value: Number(ml[1]), designation: `${ml[1]} ml` }
    else if (l) out.volume = { value: Number(l[1]) * 1000, designation: `${l[1]} L` }
    else if (oz) out.volume = { value: Math.round(Number(oz[1]) * 29.57), designation: `${oz[1]} oz` }
  }
  return out
}
