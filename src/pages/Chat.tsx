import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../store/AuthContext'
import {
  apiGetConversations, apiGetMessages, apiGetPublicKey,
  apiSendMessage, apiLogout,
  clearTokens, loadPersistedRefresh,
  type Conversation, type Message, type SearchUser,
} from '../api/client'
import { encryptMessage, decryptMessage } from '../crypto/messages'
import { useNavigate } from 'react-router-dom'
import MessageThread from '../components/MessageThread'
import SearchUsers from '../components/SearchUsers'
import SettingsModal from '../components/SettingsModal'
import { PlusIcon, SettingsIcon } from '../components/Icons'

export interface DecryptedMessage {
  id: string
  from_user_id: string
  to_user_id: string
  text: string
  created_at: string
  failed?: boolean
}

export default function ChatPage() {
  const { user, privateKey, clearAuth } = useAuth()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [activeUser, setActiveUser] = useState<{ id: string; display_name: string; username: string } | null>(null)
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // ── Load conversations ──────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const data = await apiGetConversations()
      setConversations(data)
    } catch {}
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Load + decrypt messages ─────────────────────────
  const loadMessages = useCallback(async (partnerId: string) => {
    if (!privateKey || !user) return
    setLoadingMessages(true)
    setMessages([])

    try {
      const raw = await apiGetMessages(partnerId)
      const decrypted = await Promise.all(
        raw.map(async (msg: Message): Promise<DecryptedMessage> => {
          try {
            const isMine = msg.from_user_id === user.id
            const text = await decryptMessage(msg.payload, privateKey, isMine)
            return { id: msg.id, from_user_id: msg.from_user_id, to_user_id: msg.to_user_id, text, created_at: msg.created_at }
          } catch {
            return { id: msg.id, from_user_id: msg.from_user_id, to_user_id: msg.to_user_id, text: '[Could not decrypt]', created_at: msg.created_at, failed: true }
          }
        })
      )
      // API returns newest-first — reverse for display
      setMessages(decrypted.reverse())
    } catch (err: any) {
      console.error('Failed to load messages', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [privateKey, user])

  // ── Select conversation ─────────────────────────────
  async function selectConversation(conv: Conversation) {
    setActiveUserId(conv.user_id)
    setActiveUser({ id: conv.user_id, display_name: conv.display_name, username: conv.username })
    await loadMessages(conv.user_id)
  }

  // ── Start new conversation from search ──────────────
  async function startConversation(searchUser: SearchUser) {
    setShowSearch(false)
    const existing = conversations.find(c => c.user_id === searchUser.id)
    if (existing) {
      await selectConversation(existing)
      return
    }
    // New conversation — add to list optimistically
    const newConv: Conversation = {
      user_id: searchUser.id,
      display_name: searchUser.display_name,
      username: searchUser.username,
      last_message_at: null,
    }
    setConversations(prev => [newConv, ...prev])
    setActiveUserId(searchUser.id)
    setActiveUser(searchUser)
    setMessages([])
  }

  // ── Send message ────────────────────────────────────
  async function sendMessage(text: string) {
    if (!activeUserId || !user || !privateKey || !text.trim()) return
    setSending(true)

    try {
      // 1. Get recipient's public key
      const { public_key: recipientPubKey } = await apiGetPublicKey(activeUserId)

      // 2. Encrypt with Web Crypto API
      const payload = await encryptMessage(text.trim(), recipientPubKey, user.public_key)

      // 3. Send to server
      const sent = await apiSendMessage({ to: activeUserId, payload })

      // 4. Add decrypted version to local state immediately
      const optimistic: DecryptedMessage = {
        id: sent.id,
        from_user_id: user.id,
        to_user_id: activeUserId,
        text: text.trim(),
        created_at: sent.created_at,
      }
      setMessages(prev => [...prev, optimistic])

      // 5. Refresh conversations list
      await loadConversations()

    } catch (err: any) {
      console.error('Send failed', err)
      alert('Failed to send message: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // ── Logout ──────────────────────────────────────────
  async function handleLogout() {
    try {
      const rt = loadPersistedRefresh()
      if (rt) await apiLogout(rt)
    } catch {}
    clearTokens()
    clearAuth()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Message Thread - Full Width */}
      <div className="flex-1 overflow-hidden">
        {activeUser ? (
          <MessageThread
            currentUserId={user.id}
            partner={activeUser}
            messages={messages}
            loading={loadingMessages}
            sending={sending}
            onSend={sendMessage}
            onBack={() => setActiveUserId(null)}
          />
        ) : (
          <EmptyState onNew={() => setShowSearch(true)} />
        )}
      </div>

      {/* Bottom Navigation - Snapchat Style */}
      <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        {/* Conversations List - Horizontal Scroll */}
        <div className="px-2 py-3 border-b border-gray-800 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-500 px-3 py-2">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.user_id}
                  onClick={() => {
                    setActiveUserId(conv.user_id)
                    setActiveUser({ id: conv.user_id, display_name: conv.display_name, username: conv.username })
                    loadMessages(conv.user_id)
                  }}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all whitespace-nowrap
                    ${activeUserId === conv.user_id
                      ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {conv.display_name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          {/* Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all font-semibold text-sm"
            aria-label="Search users"
          >
            <PlusIcon className="w-5 h-5" />
            New Chat
          </button>

          {/* Profile/Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white transition-all shadow-lg"
            aria-label="Settings"
            title="Settings & Profile"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchUsers
          onSelect={startConversation}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && user && (
        <SettingsModal
          user={user}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-900">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to Tunchi Whisper</h2>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-8">
        Your messages are end-to-end encrypted. Only you and the recipient can read them.
      </p>
      <button
        onClick={onNew}
        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-full transition-all shadow-lg hover:shadow-purple-500/50"
      >
        Start a conversation
      </button>
    </div>
  )
}