import { XIcon, LogoutIcon } from './Icons'

interface Props {
  user: { display_name: string; username: string }
  onLogout: () => void
  onClose: () => void
}

export default function SettingsModal({ user, onLogout, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-purple-500/30 rounded-3xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {user.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{user.display_name}</p>
              <p className="text-sm text-gray-400">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="p-6 space-y-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all font-semibold text-sm"
          >
            <LogoutIcon className="w-5 h-5" />
            Log Out
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            🔐 Tunchi Whisper - Secured ChatBox
          </p>
        </div>
      </div>
    </div>
  )
}
