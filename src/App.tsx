import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import HolographicNode from "./components/HolographicNode";
import Dashboard from "./components/Dashboard";
import SystemTray from "./components/SystemTray";

function App() {
    const [isListening, setIsListening] = useState(false);
    const [assistantState, setAssistantState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const [showDashboard, setShowDashboard] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        // Initialize the assistant on mount (only once)
        initializeAssistant();
        
        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setAssistantState('listening');
                setIsListening(true);
            };

            recognitionRef.current.onresult = (event: any) => {
                const currentTranscript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');
                
                console.log('Speech recognized:', currentTranscript);
                setTranscript(currentTranscript);
                
                // Process the command immediately if it's the final result
                if (event.results[event.results.length - 1].isFinal) {
                    console.log('Final transcript, processing:', currentTranscript);
                    setIsListening(false);
                    processCommand(currentTranscript);
                }
            };

            recognitionRef.current.onend = () => {
                console.log('Recognition ended');
                setIsListening(false);
                setAssistantState('idle');
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                setAssistantState('idle');
            };
        }

        // Initialize speech synthesis
        synthRef.current = window.speechSynthesis;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []); // Empty dependency array - run only once on mount

    const initializeAssistant = async () => {
        try {
            const message = await invoke("initialize_assistant");
            console.log("ASTRAL initialized successfully:", message);
            // Removed the speak call so it doesn't announce on every init
        } catch (error) {
            console.error("Failed to initialize ASTRAL:", error);
        }
    };

    const toggleDashboard = () => {
        setShowDashboard(!showDashboard);
    };

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setTranscript("");
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    const speak = async (text: string) => {
        console.log('Speaking:', text);
        setAssistantState('speaking');
        
        try {
            // Try GPT-SoVITS first
            const config: any = await invoke("gptsovits_get_config");
            
            if (config.enabled) {
                console.log('Using GPT-SoVITS TTS');
                const audioPath: string = await invoke("gptsovits_speak", { text });
                console.log('GPT-SoVITS generated audio at:', audioPath);
                
                // Convert file path to Tauri asset protocol
                const { convertFileSrc } = await import('@tauri-apps/api/core');
                const assetUrl = convertFileSrc(audioPath);
                
                // Play the audio file
                const audio = new Audio(assetUrl);
                audio.onended = () => {
                    console.log('GPT-SoVITS speech ended');
                    setAssistantState('idle');
                };
                audio.onerror = (e) => {
                    console.error('GPT-SoVITS audio playback error:', e);
                    console.log('Falling back to browser TTS');
                    speakWithBrowser(text);
                };
                await audio.play();
                return;
            }
        } catch (error) {
            console.log('GPT-SoVITS not available, using browser TTS:', error);
        }
        
        // Fallback to browser TTS
        speakWithBrowser(text);
    };
    
    const speakWithBrowser = (text: string) => {
        if (synthRef.current) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onstart = () => {
                console.log('Browser speech started');
                setAssistantState('speaking');
            };
            utterance.onend = () => {
                console.log('Browser speech ended');
                setAssistantState('idle');
            };
            utterance.onerror = (event) => {
                console.error('Browser speech error:', event);
                setAssistantState('idle');
            };
            
            synthRef.current.speak(utterance);
        } else {
            console.error('Speech synthesis not available');
            setAssistantState('idle');
        }
    };

    const processCommand = async (command: string) => {
        setAssistantState('thinking');
        setCommandHistory(prev => [command, ...prev.slice(0, 4)]);
        
        const lowerCommand = command.toLowerCase();
        let response = "";

        try {
            // Greetings
            if (lowerCommand === 'hello' || lowerCommand === 'hi' || lowerCommand === 'hey' || lowerCommand.startsWith('hello.') || lowerCommand.startsWith('hi.')) {
                const greetings = [
                    "Hello! How can I assist you today?",
                    "Hi there! What can I do for you?",
                    "Greetings! I'm ASTRAL, your AI assistant. How may I help?",
                    "Hello! Ready to assist you.",
                ];
                response = greetings[Math.floor(Math.random() * greetings.length)];
            }
            // Time queries
            else if (lowerCommand.includes('time')) {
                const now = new Date();
                response = `The current time is ${now.toLocaleTimeString()}`;
            }
            // Date queries
            else if (lowerCommand.includes('date')) {
                const now = new Date();
                response = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
            }
            // Automation routines
            else if (lowerCommand.includes('work mode') || lowerCommand.includes('start work')) {
                try {
                    await invoke("execute_automation", { routineId: "work-mode" });
                    response = "Work mode activated! Launching your productivity apps.";
                } catch (error) {
                    response = "I couldn't start work mode. Make sure the automation is enabled.";
                }
            }
            else if (lowerCommand.includes('gaming mode') || lowerCommand.includes('start gaming')) {
                try {
                    await invoke("execute_automation", { routineId: "gaming-mode" });
                    response = "Gaming mode activated! Good luck and have fun!";
                } catch (error) {
                    response = "I couldn't start gaming mode. Make sure the automation is enabled.";
                }
            }
            else if (lowerCommand.includes('morning routine')) {
                try {
                    await invoke("execute_automation", { routineId: "morning-routine" });
                    response = "Good morning! Starting your morning routine.";
                } catch (error) {
                    response = "I couldn't start the morning routine.";
                }
            }
            else if (lowerCommand.includes('evening') || lowerCommand.includes('wind down')) {
                try {
                    await invoke("execute_automation", { routineId: "evening-winddown" });
                    response = "Starting your evening wind down routine.";
                } catch (error) {
                    response = "I couldn't start the evening routine.";
                }
            }
            // Weather (placeholder)
            else if (lowerCommand.includes('weather')) {
                response = "Weather integration coming soon. I'll be able to tell you the current weather conditions.";
            }
            // Open applications
            else if (lowerCommand.includes('open')) {
                const app = lowerCommand.replace('open', '').trim();
                response = `Opening ${app}`;
                try {
                    await invoke("execute_command", { command: `open:${app}` });
                } catch (error) {
                    response = `I couldn't open ${app}. This feature is still in development.`;
                }
            }
            // System info (but not if asking about AI systems)
            else if ((lowerCommand.includes('system') || lowerCommand.includes('stats')) && !lowerCommand.includes('ai')) {
                try {
                    const info: any = await invoke("get_system_info");
                    response = `CPU usage is ${info.cpu_usage}%, Memory: ${Math.round(info.memory_used / 1024 / 1024 / 1024)} gigabytes used`;
                } catch (error) {
                    response = "System information is currently unavailable";
                }
            }
            // Show/hide dashboard
            else if (lowerCommand.includes('dashboard') || lowerCommand.includes('settings')) {
                setShowDashboard(!showDashboard);
                response = showDashboard ? "Closing dashboard" : "Opening dashboard";
            }
            // Help
            else if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
                response = "I can tell you the time, date, open applications, check system stats, run automation routines like work mode or gaming mode, and control your dashboard. I also have AI capabilities for complex questions. Try saying 'start work mode' or 'what time is it'";
            }
            // For complex queries, use LLM
            else if (lowerCommand.length > 15 || lowerCommand.includes('why') || lowerCommand.includes('how') || lowerCommand.includes('explain') || lowerCommand.includes('what is') || lowerCommand.includes('what\'s') || lowerCommand.includes('calculate') || lowerCommand.includes('*') || lowerCommand.includes('+') || lowerCommand.includes('-') || lowerCommand.includes('/')) {
                try {
                    const llmResponse: any = await invoke("send_llm_message", { message: command });
                    response = llmResponse.content;
                } catch (error) {
                    response = "I'm having trouble connecting to my AI brain right now. Make sure Ollama is running with 'ollama serve' or configure an API key in settings.";
                }
            }
            // Default - route everything else to AI for creative interpretation
            else {
                try {
                    const llmResponse: any = await invoke("send_llm_message", { message: command });
                    response = llmResponse.content;
                } catch (error) {
                    // Only if AI completely fails, give a fallback
                    response = "Hmm, I'm having a bit of trouble processing that. Could you rephrase, or perhaps try asking about the time, system stats, or say 'help' for options?";
                }
            }

            speak(response);
        } catch (error) {
            console.error('Command processing error:', error);
            speak("I encountered an error processing that command");
            setAssistantState('idle');
        }
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
                onActivate={startListening}
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
            <div className="absolute bottom-8 left-8 glass px-4 py-3 rounded-lg space-y-2 max-w-md">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${assistantState === 'idle' ? 'bg-gray-400' :
                            assistantState === 'listening' ? 'bg-cyber-cyan animate-pulse' :
                                assistantState === 'thinking' ? 'bg-cyber-purple animate-pulse' :
                                    'bg-cyber-pink animate-pulse'
                        }`} />
                    <span className="text-sm font-medium capitalize">{assistantState}</span>
                </div>
                {transcript && (
                    <div className="text-xs text-white/60 italic">
                        "{transcript}"
                    </div>
                )}
                {commandHistory.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-xs text-white/40 mb-1">Recent:</div>
                        {commandHistory.slice(0, 3).map((cmd, i) => (
                            <div key={i} className="text-xs text-white/50">• {cmd}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* Version Info */}
            <div className="absolute bottom-4 right-4 text-xs text-white/30 font-mono">
                ASTRAL v0.1.0-alpha
            </div>
        </div>
    );
}

export default App;
