import { DiscordMarkdown } from './DiscordMarkdown'
import type { ComponentPreviewProps } from './types'

export function DiscordTextDisplayPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  return <div className={`discord-preview__text-display ${selected === node.key ? 'is-selected' : ''}`} onClick={() => onSelect(node.key)}><DiscordMarkdown content={String(node.content || 'Text Display vazio')} /></div>
}
