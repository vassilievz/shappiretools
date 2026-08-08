import { useState } from 'react'
import type { ComponentPreviewProps } from './types'
import { mediaUrl } from './types'

export function DiscordFilePreview({ node, selected, onSelect }: ComponentPreviewProps) {
  const [revealed, setRevealed] = useState(!Boolean(node.spoiler))
  const url = mediaUrl(node.file as Record<string, unknown>) || 'attachment://arquivo'
  const filename = url.replace(/^attachment:\/\//, '').split('/').at(-1) || 'arquivo'
  return <button type="button" className={`discord-preview__file ${selected === node.key ? 'is-selected' : ''} ${revealed ? '' : 'is-spoiler'}`} onClick={(event) => { event.stopPropagation(); onSelect(node.key); setRevealed(true) }}><span className="discord-preview__file-icon">▤</span><span><strong>{filename}</strong><small>Arquivo anexado</small></span></button>
}
