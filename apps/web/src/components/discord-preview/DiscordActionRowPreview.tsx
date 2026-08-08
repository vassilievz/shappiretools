import type { ComponentPreviewProps } from './types'
import { DiscordSelectPreview } from './DiscordSelectPreview'

const buttonClass = (style: number) => ({ 1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger', 5: 'link', 6: 'premium' }[style] ?? 'primary')

export function DiscordButtonPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  const style = Number(node.style ?? 1)
  const contents = <>{String(node.emoji || '')} {style === 6 ? 'Comprar' : String(node.label || 'Botão')}</>
  const className = `discord-preview__button discord-preview__button--${buttonClass(style)} ${selected === node.key ? 'is-selected' : ''}`
  if (style === 5 && typeof node.url === 'string' && node.url) return <a className={className} href={node.url} target="_blank" rel="noreferrer noopener" onClick={(event) => { event.stopPropagation(); onSelect(node.key) }}>{contents}<span aria-hidden="true">↗</span></a>
  return <button type="button" disabled={Boolean(node.disabled)} className={className} onClick={(event) => { event.stopPropagation(); onSelect(node.key) }}>{contents}</button>
}

export function DiscordActionRowPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  return <div className={`discord-preview__action-row ${selected === node.key ? 'is-selected' : ''}`} onClick={() => onSelect(node.key)}>{node.components?.map((child) => child.type === 2 ? <DiscordButtonPreview key={child.key} node={child} selected={selected} onSelect={onSelect} /> : <DiscordSelectPreview key={child.key} node={child} selected={selected} onSelect={onSelect} />)}</div>
}
