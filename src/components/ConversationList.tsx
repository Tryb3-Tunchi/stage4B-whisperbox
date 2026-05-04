import type { Conversation } from '../api/client'

interface Props {
  conversations: Conversation[]
  activeUserId: string | null
  currentUserId: string
  onSelect: (conv: Conversation) => void
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

export default function ConversationList({ conversations, activeUserId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <p className="text-sm text-gray-400">No conversations yet</p>
        <p className="text-xs text-gray-300 mt-1">Tap + to start one</p>
      </div>
    )
  }

  return (
    <ul role="list">
      {conversations.map(conv => (
        <li key={conv.user_id}>
          <button
            onClick={() => onSelect(conv)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left
              hover:bg-gray-50 transition-colors border-b border-gray-50
              ${activeUserId === conv.user_id ? 'bg-sky-50 border-l-4 border-l-sky-500' : ''}
            `}
            aria-current={activeUserId === conv.user_id ? 'true' : undefined}
          >
            <Avatar name={conv.display_name} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 truncate">{conv.display_name}</p>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">@{conv.username}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export { Avatar }