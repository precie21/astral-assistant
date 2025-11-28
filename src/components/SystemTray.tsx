interface SystemTrayProps {
    onToggleDashboard: () => void;
    assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export default function SystemTray({ onToggleDashboard, assistantState }: SystemTrayProps) {
    return (
        <div className="absolute top-6 right-6 flex items-center gap-3">
            {/* Quick status */}
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${assistantState === 'idle' ? 'bg-gray-400' :
                        assistantState === 'listening' ? 'bg-cyber-cyan animate-pulse' :
                            assistantState === 'thinking' ? 'bg-cyber-purple animate-pulse' :
                                'bg-cyber-pink animate-pulse'
                    }`} />
                <span className="text-xs font-medium">AKI</span>
            </div>

            {/* Dashboard toggle */}
            <button
                onClick={onToggleDashboard}
                className="glass w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors group"
                title="Toggle Dashboard"
            >
                <svg
                    className="w-5 h-5 text-white/70 group-hover:text-cyber-cyan transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                </svg>
            </button>
        </div>
    );
}
