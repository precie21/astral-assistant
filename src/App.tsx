import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import HolographicNode from "./components/HolographicNode";
import Dashboard from "./components/Dashboard";
import SystemTray from "./components/SystemTray";

function App() {
    const [isListening, setIsListening] = useState(false);
    const [assistantState, setAssistantState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        // Initialize the assistant on mount
        initializeAssistant();

        // Listen for wake word events
        // TODO: Set up event listeners from Rust backend
    }, []);

    const initializeAssistant = async () => {
        try {
            await invoke("initialize_assistant");
            console.log("ASTRAL initialized successfully");
        } catch (error) {
            console.error("Failed to initialize ASTRAL:", error);
        }
    };

    const toggleDashboard = () => {
        setShowDashboard(!showDashboard);
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#0a0e27] via-[#151932] to-[#0a0e27]">
            {/* Background effects */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-cyan/20 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-purple/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Scan line effect */}
            <div className="scan-line absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent pointer-events-none" />

            {/* Holographic Node */}
            <HolographicNode
                state={assistantState}
                isListening={isListening}
            />

            {/* Dashboard Panel */}
            {showDashboard && (
                <Dashboard onClose={() => setShowDashboard(false)} />
            )}

            {/* System Tray / Quick Controls */}
            <SystemTray
                onToggleDashboard={toggleDashboard}
                assistantState={assistantState}
            />

            {/* Status Indicator */}
            <div className="absolute bottom-8 left-8 glass px-4 py-2 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${assistantState === 'idle' ? 'bg-gray-400' :
                            assistantState === 'listening' ? 'bg-cyber-cyan animate-pulse' :
                                assistantState === 'thinking' ? 'bg-cyber-purple animate-pulse' :
                                    'bg-cyber-pink animate-pulse'
                        }`} />
                    <span className="text-sm font-medium capitalize">{assistantState}</span>
                </div>
            </div>

            {/* Version Info */}
            <div className="absolute bottom-4 right-4 text-xs text-white/30 font-mono">
                ASTRAL v0.1.0-alpha
            </div>
        </div>
    );
}

export default App;
