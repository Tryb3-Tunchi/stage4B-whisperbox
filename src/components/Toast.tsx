import { useEffect } from 'react'

export type ToastType = 'error' | 'success' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    error: 'bg-red-900/90 border-red-700',
    success: 'bg-emerald-900/90 border-emerald-700',
    info: 'bg-blue-900/90 border-blue-700',
  }[type]

  const textColor = {
    error: 'text-red-100',
    success: 'text-emerald-100',
    info: 'text-blue-100',
  }[type]

  const icon = {
    error: '⚠️',
    success: '✓',
    info: 'ℹ️',
  }[type]

  return (
    <div
      className={`
        fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md
        ${bgColor} border rounded-xl px-5 py-4 shadow-2xl
        animate-in fade-in slide-in-from-bottom-4
        animate-out fade-out slide-out-to-bottom-4 duration-300
        z-50 flex items-start gap-3
      `}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColor} leading-relaxed`}>
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        className={`flex-shrink-0 ${textColor} hover:opacity-70 transition-opacity`}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  )
}
