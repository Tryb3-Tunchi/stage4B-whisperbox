import { useState, useEffect, useRef } from 'react'
import { apiSearchUsers, type SearchUser } from '../api/client'
import { SearchIcon, XIcon } from './Icons'
import { Avatar } from './ConversationList'

interface Props {
  onSelect: (user: SearchUser) => void
  onClose: () => void
}

export default function SearchUsers({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await apiSearchUsers(query.trim())
        setResults(data)
      } catch (err: any) {
        setError(err.message || 'Search failed')
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Search users"
    >
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <SearchIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by username or display name…"
            className="flex-1 text-sm text-white placeholder-gray-500 focus:outline-none bg-transparent"
            aria-label="Search users"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700 text-gray-500 hover:text-gray-400 transition-colors"
            aria-label="Close search"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {!loading && !error && query.length > 0 && results.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-gray-500">No users found for "{query}"</p>
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul role="list">
              {results.map(user => (
                <li key={user.id}>
                  <button
                    onClick={() => onSelect(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                  >
                    <Avatar name={user.display_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.display_name}</p>
                      <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                    </div>
                    <span className="text-xs text-cyan-400 font-medium">Message</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!query && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
              <SearchIcon className="w-8 h-8 text-gray-700" />
              <p className="text-sm text-gray-500">Search for people to message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}