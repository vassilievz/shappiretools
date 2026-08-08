import type { ComponentPreviewProps } from './types'

export function DiscordSeparatorPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  return <div className={`discord-preview__separator discord-preview__separator--${Number(node.spacing ?? 1) === 2 ? 'large' : 'small'} ${selected === node.key ? 'is-selected' : ''}`} onClick={() => onSelect(node.key)}>{node.divider !== false && <i />}</div>
}
