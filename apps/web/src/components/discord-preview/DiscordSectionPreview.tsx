import type { ComponentPreviewProps } from './types'
import { DiscordComponentPreview } from './DiscordComponentPreview'
import { DiscordThumbnailPreview } from './DiscordThumbnailPreview'

export function DiscordSectionPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  return <section className={`discord-preview__section ${selected === node.key ? 'is-selected' : ''}`} onClick={() => onSelect(node.key)}><div className="discord-preview__section-content">{node.components?.map((child) => <DiscordComponentPreview key={child.key} node={child} selected={selected} onSelect={onSelect} />)}</div>{node.accessory?.type === 11 ? <DiscordThumbnailPreview node={node.accessory} selected={selected} onSelect={onSelect} /> : node.accessory ? <DiscordComponentPreview node={node.accessory} selected={selected} onSelect={onSelect} /> : null}</section>
}
