import { useState } from 'react'
import type { ComponentPreviewProps } from './types'
import { mediaUrl } from './types'

export function DiscordThumbnailPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  const [revealed, setRevealed] = useState(!Boolean(node.spoiler))
  const url = mediaUrl(node.media as Record<string, unknown>)
  if (!url) return <div className="discord-preview__thumbnail discord-preview__thumbnail--empty" />
  return <button type="button" className={`discord-preview__thumbnail ${selected === node.key ? 'is-selected' : ''} ${revealed ? '' : 'is-spoiler'}`} onClick={(event) => { event.stopPropagation(); onSelect(node.key); setRevealed(true) }}><img src={url} alt={String(node.description || '')} /></button>
}
