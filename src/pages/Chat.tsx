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
import ConversationList from '../components/ConversationList'
import MessageThread from '../components/MessageThread'
import SearchUsers from '../components/SearchUsers'
import { ShieldIcon, LogoutIcon, PlusIcon } from '../components/Icons'

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
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false)

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
    setIsMobileThreadOpen(true)
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
    setIsMobileThreadOpen(true)
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
    <div className="h-full flex bg-gray-100">

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className={`
        flex flex-col bg-white border-r border-gray-200
        w-full md:w-80 lg:w-96 flex-shrink-0
        ${isMobileThreadOpen ? 'hidden md:flex' : 'flex'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-sky-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{user.display_name}</p>
              <p className="text-xs text-sky-100">@{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="New conversation"
              title="New conversation"
            >
              <PlusIcon />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>

        {/* E2EE indicator */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border-b border-emerald-100">
          <ShieldIcon className="w-3.5 h-3.5 text-emerald-600" />
          <p className="text-xs text-emerald-700 font-medium">End-to-end encrypted</p>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ConversationList
            conversations={conversations}
            activeUserId={activeUserId}
            currentUserId={user.id}
            onSelect={selectConversation}
          />
        </div>
      </aside>

      {/* ── Message thread ───────────────────────────── */}
      <main className={`
        flex-1 flex flex-col
        ${!isMobileThreadOpen ? 'hidden md:flex' : 'flex'}
      `}>
        {activeUser ? (
          <MessageThread
            currentUserId={user.id}
            partner={activeUser}
            messages={messages}
            loading={loadingMessages}
            sending={sending}
            onSend={sendMessage}
            onBack={() => { setIsMobileThreadOpen(false); setActiveUserId(null) }}
          />
        ) : (
          <EmptyState onNew={() => setShowSearch(true)} />
        )}
      </main>

      {/* ── Search modal ─────────────────────────────── */}
      {showSearch && (
        <SearchUsers
          onSelect={startConversation}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
      <div className="w-20 h-20 rounded-3xl bg-sky-100 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Your messages are private</h2>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
        Messages are end-to-end encrypted. Only you and the person you're messaging can read them.
      </p>
      <button
        onClick={onNew}
        className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-full transition-colors"
      >
        Start a conversation
      </button>
    </div>
  )
}