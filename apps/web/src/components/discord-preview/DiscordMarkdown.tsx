import { useState, type ReactNode } from 'react'

function DiscordSpoiler({ children }: { children: string }) {
  const [revealed, setRevealed] = useState(false)
  return <button type="button" className={`discord-preview__spoiler ${revealed ? 'is-revealed' : ''}`} onClick={(event) => { event.stopPropagation(); setRevealed(true) }}>{children}</button>
}

function inline(value: string, keyPrefix: string): ReactNode[] {
  const tokens = value.split(/(`[^`]*`|\|\|[\s\S]*?\|\||\*\*[\s\S]*?\*\*|__[\s\S]*?__|~~[\s\S]*?~~|\[[^\]]+\]\([^\s)]+\)|\*[^*]+\*|_[^_]+_)/g)
  return tokens.filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`
    if (token.startsWith('`') && token.endsWith('`')) return <code key={key}>{token.slice(1, -1)}</code>
    if (token.startsWith('||') && token.endsWith('||')) return <DiscordSpoiler key={key}>{token.slice(2, -2)}</DiscordSpoiler>
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={key}>{inline(token.slice(2, -2), key)}</strong>
    if (token.startsWith('__') && token.endsWith('__')) return <u key={key}>{inline(token.slice(2, -2), key)}</u>
    if (token.startsWith('~~') && token.endsWith('~~')) return <s key={key}>{inline(token.slice(2, -2), key)}</s>
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) return <em key={key}>{inline(token.slice(1, -1), key)}</em>
    const link = token.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/)
    if (link) return <a key={key} href={link[2]} target="_blank" rel="noreferrer noopener">{link[1]}</a>
    return <span key={key}>{token}</span>
  })
}

export function DiscordMarkdown({ content, className = '' }: { content: string; className?: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  return <div className={`discord-preview__markdown ${className}`.trim()}>{lines.map((line, index) => {
    if (line.startsWith('> ')) return <blockquote key={index}>{inline(line.slice(2), `quote-${index}`)}</blockquote>
    if (/^#{1,3}\s/.test(line)) return <strong className="discord-preview__markdown-heading" key={index}>{inline(line.replace(/^#{1,3}\s/, ''), `heading-${index}`)}</strong>
    return <span className="discord-preview__markdown-line" key={index}>{inline(line, `line-${index}`)}</span>
  })}</div>
}
