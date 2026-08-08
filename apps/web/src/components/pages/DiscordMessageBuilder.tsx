import { AlertCircle, AtSign, Bell, BellOff, Braces, Copy, Layers3, Link, RotateCcw, Save, Send, Shield, Trash2, Upload, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { clean, defaultDraft, hydrateComponent, locateComponent, stripComponent, type Json, type MessageDraft } from '../../features/discord/model'
import { validateDraft } from '../../features/discord/validation'
import { API_URL } from '../../config/constants'
import { useI18n } from '../../i18n'

import { InteractiveCanvas } from './InteractiveCanvas'
import { DiscordMessagePreview } from '../discord-preview/DiscordMessagePreview'

const DRAFT_KEY = 'shappire.discord-tools.draft.v2'
const TEMPLATE_KEY = 'shappire.discord-tools.templates.v2'
const DISCORD_WEBHOOK_ENDPOINT = `${API_URL.replace(/\/$/, '')}/tools/discord-webhook`

function codePayload(draft: MessageDraft) {
  const mentions = draft.settings.allowed_mentions
  const parse = [mentions.everyone && 'everyone', mentions.users && 'users', mentions.roles && 'roles'].filter(Boolean)
  return clean({ flags: 32768 | (draft.settings.suppress_notifications ? 4096 : 0), components: draft.components.map(stripComponent), allowed_mentions: parse.length ? { parse } : undefined })
}

type CodeLanguage = 'json' | 'javascript'

function javascriptPayload(payload: Json) {
  return `const payload = ${JSON.stringify(payload, null, 2)}\n\nexport default payload\n`
}

function objectLiteral(source: string) {
  const start = source.indexOf('{')
  if (start < 0) throw new Error('Objeto payload não encontrado.')
  let depth = 0; let quote = ''; let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") { quote = character; continue }
    if (character === '{') depth += 1
    if (character === '}') { depth -= 1; if (depth === 0) return source.slice(start, index + 1) }
  }
  throw new Error('Objeto payload não foi fechado.')
}

function parseCodePayload(source: string, language: CodeLanguage) {
  return JSON.parse(language === 'json' ? source : objectLiteral(source)) as Json
}

function payloadData(source: Json): Json {
  return source.data && typeof source.data === 'object' ? source.data as Json : source
}

function draftFromPayload(source: Json, current: MessageDraft): MessageDraft {
  const data = payloadData(source)
  return { ...current, components: Array.isArray(data.components) ? data.components.map(hydrateComponent) : current.components }
}

function useHistory(initial: MessageDraft) {
  const [draft, setDraft] = useState(initial); const [past, setPast] = useState<MessageDraft[]>([]); const [future, setFuture] = useState<MessageDraft[]>([])
  const commit = (next: MessageDraft | ((current: MessageDraft) => MessageDraft)) => setDraft((current) => { const value = typeof next === 'function' ? next(structuredClone(current)) : next; setPast((items) => [...items.slice(-29), current]); setFuture([]); return value })
  const undo = () => { const previous = past.at(-1); if (!previous) return; setPast((items) => items.slice(0, -1)); setFuture((items) => [draft, ...items].slice(0, 30)); setDraft(previous) }
  const redo = () => { const next = future[0]; if (!next) return; setFuture((items) => items.slice(1)); setPast((items) => [...items, draft].slice(-30)); setDraft(next) }
  return { draft, commit, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 }
}

function IconButton({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" className="discord-icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function Field({ label, value, onChange, area = false, hint = '', maxLength }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; hint?: string; maxLength?: number }) {
  return <label className="discord-field"><span>{label}{maxLength ? <small>{value.length}/{maxLength}</small> : null}</span>{area ? <textarea value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /> : <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />}{hint && <em>{hint}</em>}</label>
}

export function DiscordMessageBuilder() {
  const { t } = useI18n()
  const [restorable, setRestorable] = useState<MessageDraft | null>(null); const { draft, commit, undo, redo, canUndo, canRedo } = useHistory(defaultDraft()); const [selected, setSelected] = useState(''); const [codeLanguage, setCodeLanguage] = useState<CodeLanguage | null>(null); const [raw, setRaw] = useState(''); const [rawError, setRawError] = useState(''); const [deliveryOpen, setDeliveryOpen] = useState(false); const [webhook, setWebhook] = useState(''); const [sendState, setSendState] = useState(''); const [templates, setTemplates] = useState<Array<{ name: string; payload: Json }>>([]); const [templateName, setTemplateName] = useState('')
  const translate = t
  const payload = useMemo(() => codePayload(draft), [draft]); const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]); const issues = useMemo(() => validateDraft(draft), [draft]); const nodes = draft.components;
  useEffect(() => { try { const snapshot = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as MessageDraft | null; if (snapshot && Array.isArray(snapshot.components)) setRestorable(snapshot); const stored = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]'); if (Array.isArray(stored)) setTemplates(stored); queueMicrotask(() => setSelected(draft.components[0]?.key ?? '__root__')) } catch { /* ignore invalid local drafts */ } }, [])
  useEffect(() => { const timer = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)), 500); return () => window.clearTimeout(timer) }, [draft])

  const updateSettings = (patch: Partial<MessageDraft['settings']>) => commit((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
  const toggleMention = (key: keyof MessageDraft['settings']['allowed_mentions']) => commit((current) => ({ ...current, settings: { ...current.settings, allowed_mentions: { ...current.settings.allowed_mentions, [key]: !current.settings.allowed_mentions[key] } } }))

  const updateNode = (key: string, patch: Json) => commit((current) => { const target = locateComponent(current.components, key); if (target) Object.assign(target.node, patch); return current })
  const remove = (key: string) => commit((current) => { const target = locateComponent(current.components, key); if (!target) return current; if (target.accessory) { if (target.parent) delete target.parent.accessory } else target.list.splice(target.list.findIndex((item) => item.key === key), 1); queueMicrotask(() => setSelected(current.components[0]?.key || '__root__')); return current })
  const duplicate = (key: string) => commit((current) => { const target = locateComponent(current.components, key); if (!target || target.accessory) return current; const item = hydrateComponent(stripComponent(target.node)); target.list.splice(target.list.indexOf(target.node) + 1, 0, item); queueMicrotask(() => setSelected(item.key)); return current })

  const openCodeEditor = (language: CodeLanguage) => { setRaw(language === 'json' ? json : javascriptPayload(payload)); setRawError(''); setCodeLanguage(language) }
  const applyCode = (source: string, language = codeLanguage) => { setRaw(source); if (!language) return; try { const parsed = parseCodePayload(source, language); commit((current) => draftFromPayload(parsed, current)); setRawError('') } catch (error) { setRawError(`${language === 'json' ? 'JSON' : 'JavaScript'} inválido: ${(error as Error).message}`) } }
  const importJson = () => { if (!codeLanguage) return; try { const parsed = parseCodePayload(raw, codeLanguage); commit((current) => draftFromPayload(parsed, current)); setRawError(''); setCodeLanguage(null) } catch (error) { setRawError(`${codeLanguage === 'json' ? 'JSON' : 'JavaScript'} inválido: ${(error as Error).message}`) } }
  const saveTemplateNamed = () => { const name = (templateName || `Template ${templates.length + 1}`).trim(); if (!name) return; const next = [...templates, { name, payload }]; setTemplates(next); setTemplateName(''); localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next)) }
  const loadTemplate = (template: Json) => { const parsed = payloadData(template); setRaw(JSON.stringify(parsed, null, 2)); setCodeLanguage('json'); setRawError(''); setDeliveryOpen(false) }
  const send = async () => {
    if (issues.length) { setSendState(translate('discord.send.err.issues')); return }
    if (!webhook.trim()) { setSendState(translate('discord.send.err.webhook')); return }
    setSendState(translate('discord.send.sending'))
    try {
      const body = new FormData(); body.append('webhookUrl', webhook); body.append('payload_json', JSON.stringify(payload)); body.append('threadId', draft.settings.thread_id); body.append('threadName', draft.settings.thread_name); body.append('appliedTags', draft.settings.applied_tags)
      const response = await fetch(DISCORD_WEBHOOK_ENDPOINT, { method: 'POST', body })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(response.status === 404 ? translate('discord.send.err.api') : String(result.error || translate('discord.send.err.discord')))
      setWebhook(''); setSendState(translate('discord.send.success'))
    } catch (error) { console.error('[discord-webhook] Falha ao chamar a API:', { endpoint: DISCORD_WEBHOOK_ENDPOINT, error }); setSendState((error as Error).message || `${translate('discord.send.err.connect')} (${DISCORD_WEBHOOK_ENDPOINT}).`) }
  }

  return <section className="discord-workspace is-v2" aria-label={translate('discord.components.title')}>
    <header className="discord-v2-heading">
      <div className="discord-v2-heading-text">
        <span>{translate('discord.components.kicker')}</span>
        <h1>{translate('discord.components.title')}</h1>
        <p>{translate('discord.components.lead')}</p>
      </div>
      <div className="discord-v2-heading-actions">
        {restorable && <button type="button" className="discord-restore-button" onClick={() => { const value = restorable; setRestorable(null); commit(value); setSelected(value.components[0]?.key || '__root__') }}>{translate('discord.toolbar.restore')}</button>}
        <IconButton label={translate('discord.toolbar.new')} onClick={() => { const next = defaultDraft(); commit(next); setSelected(next.components[0]?.key || '__root__') }}><RotateCcw size={15} /></IconButton>
        <IconButton label={translate('discord.toolbar.undo')} onClick={undo} disabled={!canUndo}>↶</IconButton>
        <IconButton label={translate('discord.toolbar.redo')} onClick={redo} disabled={!canRedo}>↷</IconButton>
      </div>
    </header>

    <div className="discord-workspace-grid 2-columns">
      <main className="discord-builder-main editor-column">
        <header className="discord-column-header">
          <div className="discord-column-title">
            <Layers3 size={15} />
            <strong>Components V2</strong>
            <span className="count-badge blue-badge">{nodes.length}/40</span>
          </div>
        </header>
        <InteractiveCanvas
          nodes={nodes}
          selected={selected}
          setSelected={setSelected}
          updateNode={updateNode}
          remove={remove}
          duplicate={duplicate}
          commit={commit}
          issues={issues}
        />
        <div className="discord-editor-footer-actions">
          <button className="discord-save-template-btn" type="button" onClick={() => setDeliveryOpen(true)}><Save size={14} />{translate('discord.editor.save')}</button>
          <button className="discord-send-button" type="button" onClick={() => setDeliveryOpen(true)}><Send size={14} />{translate('discord.editor.send')}</button>
        </div>
      </main>

      <aside className="discord-preview-panel output-column">
        <header className="discord-preview-header">
          <div className="discord-preview-tabs">
            <button type="button" className={codeLanguage === null ? 'is-active' : ''} onClick={() => setCodeLanguage(null)}>{translate('discord.preview.preview')}</button>
            <button type="button" className={codeLanguage === 'json' ? 'is-active' : ''} onClick={() => openCodeEditor('json')}><Braces size={13} />JSON</button>
            <button type="button" className={codeLanguage === 'javascript' ? 'is-active' : ''} onClick={() => openCodeEditor('javascript')}>JavaScript</button>
          </div>
          <span className={issues.length ? 'has-errors' : 'is-valid'}>{issues.length ? `${issues.length} ${translate('discord.preview.issues')}` : translate('discord.preview.ready')}</span>
        </header>

        <div className="discord-preview-body">
          {codeLanguage ? (
            <section className="discord-json-editor">
              <header><strong>{codeLanguage === 'json' ? 'JSON' : 'JavaScript'}</strong><span>{translate('discord.json.hint')}</span></header>
              <textarea value={raw} spellCheck={false} onChange={(event) => applyCode(event.target.value)} />
              <footer>
                <button type="button" onClick={importJson}><Upload size={13} />{translate('discord.json.apply')}</button>
                <button type="button" onClick={() => void navigator.clipboard.writeText(codeLanguage === 'json' ? json : javascriptPayload(payload))}><Copy size={13} />{translate('discord.json.copy')}</button>
                {rawError && <span className="error-message">{rawError}</span>}
              </footer>
            </section>
          ) : (
            <DiscordMessagePreview draft={draft} selected={selected} onSelect={setSelected} />
          )}
        </div>

        {issues.length > 0 && (
          <section className="discord-validation">
            <AlertCircle size={15} />
            <div>
              {issues.map((issue, idx) => (
                <button type="button" key={`${issue.message}-${idx}`} onClick={() => issue.key && setSelected(issue.key)}>{issue.message}</button>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>

    {deliveryOpen && <div className="discord-overlay" role="dialog" aria-modal="true" aria-label={translate('discord.delivery.title')}><section className="discord-delivery-drawer">
      <header><div><span>ENTREGA</span><strong>{translate('discord.delivery.title')}</strong></div><IconButton label={translate('discord.delivery.close')} onClick={() => setDeliveryOpen(false)}><X size={16} /></IconButton></header>
      <Field label={translate('discord.delivery.webhook')} value={webhook} onChange={setWebhook} hint={translate('discord.delivery.webhookHint')} />
      <div className="discord-delivery-options">
        <Field label={translate('discord.delivery.username')} value={draft.settings.username} maxLength={80} onChange={(value) => updateSettings({ username: value })} />
        <Field label={translate('discord.delivery.avatar')} value={draft.settings.avatar_url} onChange={(value) => updateSettings({ avatar_url: value })} />
        <Field label={translate('discord.delivery.threadId')} value={draft.settings.thread_id} onChange={(value) => updateSettings({ thread_id: value })} />
        <Field label={translate('discord.delivery.threadName')} value={draft.settings.thread_name} onChange={(value) => updateSettings({ thread_name: value })} />
        <Field label={translate('discord.delivery.tags')} value={draft.settings.applied_tags} onChange={(value) => updateSettings({ applied_tags: value })} />
      </div>
      <section className="discord-v2-options">
        <header><strong><Bell size={14} />{translate('discord.notifications.title')}</strong></header>
        <label className="discord-v2-switch"><input type="checkbox" checked={draft.settings.suppress_notifications} onChange={(event) => updateSettings({ suppress_notifications: event.target.checked })} /><i /><span>{draft.settings.suppress_notifications ? <BellOff size={13} /> : <Bell size={13} />}{translate('discord.notifications.silent')}</span></label>
        <span className="discord-v2-options-label">{translate('discord.notifications.mentions')}</span>
        <div>
          {([{ key: 'users', label: 'Users (@user)', icon: UsersRound }, { key: 'roles', label: 'Roles (@role)', icon: Shield }, { key: 'everyone', label: '@everyone / @here', icon: AtSign }] as const).map(({ key, label, icon: Icon }) => <button type="button" className={draft.settings.allowed_mentions[key] ? 'is-active' : ''} key={key} onClick={() => toggleMention(key)}><Icon size={14} />{label}</button>)}
        </div>
        <small>{translate('discord.notifications.hint')}</small>
      </section>
      <p className="discord-interaction-note"><Link size={14} />{translate('discord.delivery.note')}</p>
      <button className="discord-send-button" type="button" onClick={() => void send()} disabled={Boolean(issues.length)}><Send size={14} />{translate('discord.delivery.send')}</button>
      {sendState && <p className="discord-send-state">{sendState}</p>}

      <section className="discord-template-manager">
        <header><strong>{translate('discord.templates.title')}</strong></header>
        <div className="discord-template-create">
          <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder={translate('discord.templates.name')} />
          <button type="button" onClick={saveTemplateNamed}><Save size={13} />{translate('discord.templates.save')}</button>
        </div>
        {templates.length ? templates.map((template, index) => <div className="discord-template-item" key={`${template.name}-${index}`}><button type="button" onClick={() => loadTemplate(template.payload)}>{template.name}</button><IconButton label={translate('discord.templates.apply')} onClick={() => loadTemplate(template.payload)}><Upload size={12} /></IconButton><IconButton label={translate('discord.templates.delete')} onClick={() => { const next = templates.filter((_, position) => position !== index); setTemplates(next); localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next)) }}><Trash2 size={12} /></IconButton></div>) : <p className="discord-empty-inspector">{translate('discord.templates.empty')}</p>}
      </section>
    </section></div>}
  </section>
}