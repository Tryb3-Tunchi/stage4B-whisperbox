export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      {/* Animated gradient blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/50 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
              opacity: Math.random() * 0.7 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(139, 92, 246, 0.1) 25%, rgba(139, 92, 246, 0.1) 26%, transparent 27%, transparent 74%, rgba(139, 92, 246, 0.1) 75%, rgba(139, 92, 246, 0.1) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(139, 92, 246, 0.1) 25%, rgba(139, 92, 246, 0.1) 26%, transparent 27%, transparent 74%, rgba(139, 92, 246, 0.1) 75%, rgba(139, 92, 246, 0.1) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  )
}
