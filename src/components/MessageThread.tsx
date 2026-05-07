import { useRef, useEffect, useState } from 'react'
import type { DecryptedMessage } from '../pages/Chat'
import { SendIcon, ChevronLeftIcon, ShieldIcon } from './Icons'
import { Avatar } from './ConversationList'

interface Props {
  currentUserId: string
  partner: { id: string; display_name: string; username: string }
  messages: DecryptedMessage[]
  loading: boolean
  sending: boolean
  onSend: (text: string) => Promise<void>
  onBack: () => void
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateDivider(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function shouldShowDivider(messages: DecryptedMessage[], index: number) {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].created_at).toDateString()
  const curr = new Date(messages[index].created_at).toDateString()
  return prev !== curr
}

export default function MessageThread({
  currentUserId, partner, messages, loading, sending, onSend, onBack
}: Props) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    await onSend(text)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 shadow-sm">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ChevronLeftIcon />
        </button>
        <Avatar name={partner.display_name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{partner.display_name}</p>
          <div className="flex items-center gap-1">
            <ShieldIcon className="w-3 h-3 text-cyan-400" />
            <p className="text-xs text-cyan-400 font-medium">Encrypted</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <ShieldIcon className="w-7 h-7 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-300">No messages yet</p>
            <p className="text-xs text-gray-500">Send a message to start the encrypted conversation</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg, i) => {
              const isMine = msg.from_user_id === currentUserId
              const showDiv = shouldShowDivider(messages, i)
              return (
                <div key={msg.id}>
                  {showDiv && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-700" />
                      <span className="text-xs text-gray-500 font-medium px-2">
                        {formatDateDivider(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-gray-700" />
                    </div>
                  )}
                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`
                      max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm
                      ${isMine
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-tr-sm'
                        : msg.failed
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 rounded-tl-sm'
                          : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                      }
                    `}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-xs ${isMine ? 'text-purple-100' : 'text-gray-500'}`}>
                          {formatMessageTime(msg.created_at)}
                        </span>
                        {isMine && (
                          <svg className="w-3.5 h-3.5 text-purple-100" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Compose */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-700 rounded-2xl px-4 py-2 min-h-[44px] flex items-end">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none max-h-32 leading-relaxed"
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 128) + 'px'
              }}
              aria-label="Message input"
              disabled={sending}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-white flex items-center justify-center transition-all flex-shrink-0 shadow-lg hover:shadow-purple-500/50 disabled:shadow-none"
            aria-label="Send message"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2 flex items-center justify-center gap-1">
          <ShieldIcon className="w-3 h-3" /> Encrypted before sending
        </p>
      </div>
    </div>
  )
}