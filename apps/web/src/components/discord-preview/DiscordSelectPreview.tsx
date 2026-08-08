import type { ComponentPreviewProps } from './types'

export function DiscordSelectPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  return <button type="button" disabled={Boolean(node.disabled)} className={`discord-preview__select ${selected === node.key ? 'is-selected' : ''}`} onClick={(event) => { event.stopPropagation(); onSelect(node.key) }}><span>{String(node.placeholder || 'Selecionar uma opção')}</span><i>⌄</i></button>
}
