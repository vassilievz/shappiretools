import type { MessageDraft } from '../../features/discord/model'
import { DiscordComponentPreview } from './DiscordComponentPreview'
import { DiscordMessageHeader } from './DiscordMessageHeader'
import './discord-preview.css'

export function DiscordMessagePreview({ draft, selected, onSelect }: { draft: MessageDraft; selected: string; onSelect: (key: string) => void }) {
  const settings = draft.settings
  const components = draft.components
  return <section className="discord-preview" aria-label="Preview do Discord"><header className="discord-preview__channel"><span>#</span><strong>preview</strong><small>Canal de Preview</small></header><div className="discord-preview__message"><DiscordMessageHeader username={settings.username} avatarUrl={settings.avatar_url} /><div className="discord-preview__message-content">{components.map((node) => <DiscordComponentPreview key={node.key} node={node} selected={selected} onSelect={onSelect} />)}{!components.length && <span className="discord-preview__empty">Container vazio</span>}</div></div></section>
}