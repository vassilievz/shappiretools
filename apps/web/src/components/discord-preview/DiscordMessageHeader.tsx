export function DiscordMessageHeader({ username, avatarUrl }: { username: string; avatarUrl: string }) {
  const name = username || 'webhook'
  const initials = name.slice(0, 2).toUpperCase()
  return <header className="discord-preview__message-header">
    {avatarUrl ? <img className="discord-preview__avatar" src={avatarUrl} alt="" /> : <span className="discord-preview__avatar discord-preview__avatar--fallback">{initials}</span>}
    <div className="discord-preview__header-copy"><div><strong>{name}</strong><b>BOT</b><time>Hoje às 17:24</time></div></div>
  </header>
}
