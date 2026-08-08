import { useEffect, useState, type PointerEvent } from 'react'

type Hsv = { h: number; s: number; v: number }
type Tab = 'picker' | 'hex' | 'rgb' | 'presets'

const presets = ['#5865f2', '#57f287', '#fee75c', '#ed4245', '#eb459e', '#ffffff', '#9e9e9e', '#111111']
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function hexToRgb(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '969696'
  return { r: Number.parseInt(value.slice(0, 2), 16), g: Number.parseInt(value.slice(2, 4), 16), b: Number.parseInt(value.slice(4, 6), 16) }
}

function toHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsv(r, g, b)
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const red = r / 255; const green = g / 255; const blue = b / 255
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const delta = max - min
  let hue = 0
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (max === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }
  return { h: (hue + 360) % 360, s: max ? (delta / max) * 100 : 0, v: max * 100 }
}

function hsvToHex({ h, s, v }: Hsv) {
  const saturation = s / 100; const value = v / 100; const chroma = value * saturation; const x = chroma * (1 - Math.abs((h / 60) % 2 - 1)); const match = value - chroma
  const [red, green, blue] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x]
  return `#${[red, green, blue].map((item) => Math.round((item + match) * 255).toString(16).padStart(2, '0')).join('')}`
}

export function AccentColorEditor({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [tab, setTab] = useState<Tab>('picker'); const [hsv, setHsv] = useState<Hsv>(() => toHsv(value))
  const color = hsvToHex(hsv); const rgb = hexToRgb(color)
  useEffect(() => setHsv(toHsv(value)), [value])
  const update = (next: Partial<Hsv>) => { const resolved = { ...hsv, ...next }; setHsv(resolved); onChange(hsvToHex(resolved)) }
  const pick = (event: PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); update({ s: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100), v: clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100) }) }
  const position = { left: `${hsv.s}%`, top: `${100 - hsv.v}%` }
  return <section className="discord-accent-editor"><header><strong><i style={{ backgroundColor: color }} />Accent color</strong></header><nav>{([{ id: 'picker', label: 'Color picker' }, { id: 'hex', label: 'HEX' }, { id: 'rgb', label: 'RGB' }, { id: 'presets', label: 'Presets' }] as const).map((item) => <button type="button" className={tab === item.id ? 'is-active' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>{tab === 'picker' && <><div className="discord-hsv-square" style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pick(event) }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event) }}><i style={position} /></div><input className="discord-hue-slider" type="range" min="0" max="360" value={hsv.h} onChange={(event) => update({ h: Number(event.target.value) })} /></>}{tab === 'hex' && <label className="discord-color-code"><span>HEX</span><input value={color.toUpperCase()} maxLength={7} onChange={(event) => { const next = event.target.value; if (/^#[0-9a-f]{6}$/i.test(next)) { setHsv(toHsv(next)); onChange(next) } }} /></label>}{tab === 'rgb' && <div className="discord-rgb-fields">{(['r', 'g', 'b'] as const).map((channel) => <label key={channel}><span>{channel.toUpperCase()}</span><input type="number" min="0" max="255" value={rgb[channel]} onChange={(event) => { const next = { ...rgb, [channel]: clamp(Number(event.target.value), 0, 255) }; const nextHex = `#${[next.r, next.g, next.b].map((item) => item.toString(16).padStart(2, '0')).join('')}`; const nextHsv = rgbToHsv(next.r, next.g, next.b); setHsv(nextHsv); onChange(nextHex) }} /></label>)}</div>}{tab === 'presets' && <div className="discord-color-presets">{presets.map((preset) => <button type="button" key={preset} className={color.toLowerCase() === preset ? 'is-active' : ''} style={{ backgroundColor: preset }} onClick={() => { setHsv(toHsv(preset)); onChange(preset) }} aria-label={`Usar ${preset}`} />)}</div>}<footer><i style={{ backgroundColor: color }} /><code>{color.toUpperCase()}</code><span>rgb({rgb.r}, {rgb.g}, {rgb.b})</span></footer></section>
}
