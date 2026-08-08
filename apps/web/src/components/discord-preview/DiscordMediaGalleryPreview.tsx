import { useMemo, useState, type CSSProperties } from 'react'
import type { ComponentPreviewProps, MediaItem } from './types'
import { mediaUrl } from './types'

type Dimensions = Record<string, { width: number; height: number }>

function galleryWidth(items: MediaItem[], dimensions: Dimensions) {
  if (items.length !== 1) return 520
  const size = dimensions[items[0].url]
  if (!size) return 420
  return Math.min(520, size.width, Math.max(1, Math.round(350 * size.width / size.height)))
}

function GalleryTile({ item, className, onLoad }: { item: MediaItem; className?: string; onLoad: (width: number, height: number) => void }) {
  const [revealed, setRevealed] = useState(!item.spoiler)
  return <button type="button" className={`discord-preview__gallery-tile ${className ?? ''} ${revealed ? '' : 'is-spoiler'}`} onClick={(event) => { event.stopPropagation(); setRevealed(true) }}><img src={item.url} alt={item.description} onLoad={(event) => onLoad(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} /></button>
}

export function DiscordMediaGalleryPreview({ node, selected, onSelect }: ComponentPreviewProps) {
  const [dimensions, setDimensions] = useState<Dimensions>({})
  const items = useMemo(() => (Array.isArray(node.items) ? node.items : []).map((item) => ({ url: mediaUrl((item as Record<string, unknown>).media as Record<string, unknown>), description: String((item as Record<string, unknown>).description || ''), spoiler: Boolean((item as Record<string, unknown>).spoiler) })).filter((item) => item.url), [node.items])
  if (!items.length) return <div className="discord-preview__gallery-empty" onClick={() => onSelect(node.key)}>Galeria sem mídia</div>
  const count = Math.min(items.length, 10)
  const width = galleryWidth(items, dimensions)
  const setSize = (url: string, imageWidth: number, imageHeight: number) => setDimensions((current) => current[url]?.width === imageWidth && current[url]?.height === imageHeight ? current : { ...current, [url]: { width: imageWidth, height: imageHeight } })
  return <div className={`discord-preview__gallery discord-preview__gallery--${count} ${selected === node.key ? 'is-selected' : ''}`} style={{ '--discord-gallery-width': `${width}px` } as CSSProperties} onClick={() => onSelect(node.key)}>{items.slice(0, 10).map((item, index) => <GalleryTile key={`${item.url}-${index}`} item={item} className={`discord-preview__gallery-tile--${index + 1}`} onLoad={(imageWidth, imageHeight) => setSize(item.url, imageWidth, imageHeight)} />)}</div>
}
