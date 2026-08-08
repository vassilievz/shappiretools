import { useState, type CSSProperties } from 'react'
import type { ComponentPreviewProps } from './types'
import { toAccentColor } from './types'
import { DiscordComponentPreview } from './DiscordComponentPreview'

export function DiscordContainerPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  const [revealed, setRevealed] = useState(!Boolean(node.spoiler))
  const accent = toAccentColor(node.accent_color)
  return <section className={`discord-preview__container ${selected === node.key ? 'is-selected' : ''} ${revealed ? '' : 'is-spoiler'}`} style={{ '--discord-container-accent': accent ?? 'transparent' } as CSSProperties} onClick={() => { onSelect(node.key); setRevealed(true) }}>{node.components?.map((child) => <DiscordComponentPreview key={child.key} node={child} selected={selected} onSelect={onSelect} />)}</section>
}
