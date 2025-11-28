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
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [useWhisper, setUseWhisper] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [wakeWordActive, setWakeWordActive] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const wakeWordStreamRef = useRef<MediaStream | null>(null);
    const wakeWordRecorderRef = useRef<MediaRecorder | null>(null);
    const wakeWordIntervalRef = useRef<number | null>(null);

    // Load settings on startup
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings: any = await invoke('load_settings');
                console.log('Loaded settings:', settings);
                setUseWhisper(settings.whisper_enabled);
                
                // Apply other settings (TTS, LLM, etc.)
                if (settings.elevenlabs_enabled && settings.elevenlabs_api_key) {
                    await invoke('elevenlabs_update_config', {
                        config: {
                            api_key: settings.elevenlabs_api_key,
                            voice_id: settings.elevenlabs_voice_id,
                            model_id: settings.elevenlabs_model_id,
                            enabled: settings.elevenlabs_enabled
                        }
                    });
                }
                
                if (settings.whisper_enabled) {
                    await invoke('whisper_update_config', {
                        config: {
                            server_url: settings.whisper_server_url,
                            model: settings.whisper_model,
                            enabled: settings.whisper_enabled
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        
        loadSettings();
    }, []);

    // Wake word continuous audio capture
    const startWakeWordCapture = async () => {
        try {
            console.log('[WAKE_WORD] Starting continuous audio capture...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            wakeWordStreamRef.current = stream;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            wakeWordRecorderRef.current = recorder;
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                if (chunks.length === 0) return;

                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                chunks.length = 0;

                // Convert to WAV and send to Whisper
                try {
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioContext = new AudioContext({ sampleRate: 16000 });
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    // Convert to WAV
                    const wavBlob = await audioBufferToWav(audioBuffer);
                    const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
                    
                    // Transcribe with Whisper
                    const transcript: string = await invoke("whisper_transcribe_bytes", { 
                        audioBytes: Array.from(wavBytes)
                    });
                    
                    if (transcript && transcript.trim().length > 0) {
                        console.log('[WAKE_WORD] Transcribed:', transcript);
                        
                        // Check for wake word
                        const detected: boolean = await invoke('check_for_wake_word', { 
                            text: transcript 
                        });
                        
                        if (detected) {
                            console.log('[WAKE_WORD] Wake word detected! Activating...');
                            // Stop wake word capture temporarily while user speaks
                            stopWakeWordCapture();
                            // Trigger listening via custom event
                            window.dispatchEvent(new CustomEvent('wake-word-trigger'));
                        }
                    }
                } catch (error) {
                    console.error('[WAKE_WORD] Transcription error:', error);
                }

                // Start next recording cycle if wake word is still active
                const isActive = await invoke('is_wake_word_active');
                if (isActive && wakeWordRecorderRef.current) {
                    setTimeout(() => {
                        if (wakeWordRecorderRef.current?.state === 'inactive') {
                            wakeWordRecorderRef.current.start();
                            setTimeout(() => {
                                if (wakeWordRecorderRef.current?.state === 'recording') {
                                    wakeWordRecorderRef.current.stop();
                                }
                            }, 2000); // Record 2 second chunks
                        }
                    }, 100);
                }
            };

            // Start recording in 2-second intervals
            recorder.start();
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            }, 2000);

        } catch (error) {
            console.error('[WAKE_WORD] Failed to start audio capture:', error);
        }
    };

    const stopWakeWordCapture = () => {
        console.log('[WAKE_WORD] Stopping continuous audio capture...');
        
        if (wakeWordRecorderRef.current && wakeWordRecorderRef.current.state === 'recording') {
            wakeWordRecorderRef.current.stop();
        }
        
        if (wakeWordStreamRef.current) {
            wakeWordStreamRef.current.getTracks().forEach(track => track.stop());
            wakeWordStreamRef.current = null;
        }
        
        wakeWordRecorderRef.current = null;
    };

    // Wake word detection effect
    useEffect(() => {
        const setupWakeWordListener = async () => {
            try {
                const config: any = await invoke('get_wake_word_config');
                if (config.enabled && useWhisper) {
                    console.log('[WAKE_WORD] Wake word detection enabled');
                    await invoke('start_wake_word_detection');
                    setWakeWordActive(true);
                    
                    // Start continuous audio capture
                    startWakeWordCapture();
                } else {
                    setWakeWordActive(false);
                }
            } catch (error) {
                console.error('Failed to setup wake word:', error);
                setWakeWordActive(false);
            }
        };

        setupWakeWordListener();

        return () => {
            // Cleanup: stop wake word detection when component unmounts
            stopWakeWordCapture();
            invoke('stop_wake_word_detection').catch(console.error);
            setWakeWordActive(false);
        };
    }, [useWhisper]);

    const monitorAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate RMS for audio level
        const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length);
        const normalized = Math.min(rms / 128, 1); // Normalize to 0-1
        
        setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    };

    useEffect(() => {
        // Initialize the assistant on mount (only once)
        initializeAssistant();
        
        // Check if Whisper is available and enabled
        checkWhisperAvailability();

        // Listen for wake word detection events
        const setupEventListener = async () => {
            const { listen } = await import('@tauri-apps/api/event');
            const unlisten = await listen('wake-word-detected', () => {
                console.log('[WAKE_WORD] Event received from backend, activating...');
                if (!isListening) {
                    startListening();
                }
            });
            
            return unlisten;
        };

        // Listen for wake word trigger from frontend
        const handleWakeWordTrigger = () => {
            console.log('[WAKE_WORD] Frontend trigger received, activating...');
            if (!isListening) {
                startListening();
            }
        };

        window.addEventListener('wake-word-trigger', handleWakeWordTrigger);

        let unlistenFn: any = null;
        setupEventListener().then(fn => { unlistenFn = fn; });

        return () => {
            window.removeEventListener('wake-word-trigger', handleWakeWordTrigger);
            if (unlistenFn) unlistenFn();
        };
        
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

    const checkWhisperAvailability = async () => {
        try {
            const config: any = await invoke("whisper_get_config");
            if (config.enabled) {
                const isHealthy = await invoke("whisper_health_check");
                if (isHealthy) {
                    console.log("Whisper STT available and healthy");
                    setUseWhisper(true);
                } else {
                    console.log("Whisper server not healthy, using browser speech recognition");
                }
            }
        } catch (error) {
            console.log("Whisper not available, using browser speech recognition:", error);
        }
    };

    const toggleDashboard = () => {
        setShowDashboard(!showDashboard);
    };

    const startListening = async () => {
        // If already listening with Whisper, stop recording
        if (isListening && useWhisper && mediaRecorderRef.current) {
            console.log("Stopping Whisper recording...");
            mediaRecorderRef.current.stop();
            setIsListening(false);
            
            // Stop audio monitoring
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            setAudioLevel(0);
            
            return;
        }
        
        if (isListening) return;
        
        setTranscript("");
        
        // Use Whisper if available
        if (useWhisper) {
            try {
                console.log("Starting Whisper recording...");
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Setup audio analysis for visualization
                audioContextRef.current = new AudioContext();
                const source = audioContextRef.current.createMediaStreamSource(stream);
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                source.connect(analyserRef.current);
                
                // Start audio level monitoring
                monitorAudioLevel();
                
                const options = { mimeType: 'audio/webm' };
                mediaRecorderRef.current = new MediaRecorder(stream, options);
                audioChunksRef.current = [];
                
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };
                
                mediaRecorderRef.current.onstop = async () => {
                    console.log("Recording stopped, processing with Whisper...");
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    
                    console.log(`Audio blob size: ${audioBlob.size} bytes`);
                    
                    // Convert to WAV format for Whisper
                    const audioContext = new AudioContext({ sampleRate: 16000 }); // Whisper works best with 16kHz
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    console.log(`Audio duration: ${audioBuffer.duration} seconds`);
                    
                    // Check if audio is too short
                    if (audioBuffer.duration < 0.5) {
                        console.warn("Audio too short, ignoring...");
                        setAssistantState('idle');
                        return;
                    }
                    
                    // Convert AudioBuffer to WAV
                    const wavBlob = await audioBufferToWav(audioBuffer);
                    const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
                    
                    console.log(`WAV file size: ${wavBytes.length} bytes`);
                    
                    try {
                        setAssistantState('thinking');
                        const transcript: string = await invoke("whisper_transcribe_bytes", { 
                            audioBytes: Array.from(wavBytes)
                        });
                        console.log("Whisper transcription:", transcript);
                        
                        if (!transcript || transcript.trim().length === 0) {
                            console.warn("Empty transcription, falling back to browser speech");
                            setAssistantState('idle');
                            // Could fall back to browser speech here
                            return;
                        }
                        
                        setTranscript(transcript);
                        processCommand(transcript);
                    } catch (error) {
                        console.error("Whisper transcription failed:", error);
                        setAssistantState('idle');
                    }
                    
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorderRef.current.start();
                setAssistantState('listening');
                setIsListening(true);
            } catch (error) {
                console.error('Error starting Whisper recording:', error);
                setAssistantState('idle');
            }
        } else {
            // Use browser speech recognition
            if (recognitionRef.current && !isListening) {
                try {
                    recognitionRef.current.start();
                } catch (error) {
                    console.error('Error starting recognition:', error);
                }
            }
        }
    };

    const stopListening = () => {
        if (useWhisper && mediaRecorderRef.current && isListening) {
            console.log("Stopping Whisper recording...");
            mediaRecorderRef.current.stop();
            setIsListening(false);
        } else if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    // Helper function to convert AudioBuffer to WAV
    const audioBufferToWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numberOfChannels * bytesPerSample;
        
        const data = audioBuffer.getChannelData(0);
        const dataLength = data.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);
        
        // Write WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        
        // Write PCM data
        let offset = 44;
        for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
    };

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const speak = async (text: string) => {
        console.log('Speaking:', text);
        setAssistantState('speaking');
        
        try {
            // Try ElevenLabs first
            const config: any = await invoke("elevenlabs_get_config");
            
            if (config.enabled) {
                console.log('Using ElevenLabs TTS');
                const audioBytes: number[] = await invoke("elevenlabs_speak", { text });
                console.log('ElevenLabs generated audio:', audioBytes.length, 'bytes');
                
                // Convert bytes to Blob and create URL
                const audioBlob = new Blob([new Uint8Array(audioBytes)], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Play the audio
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                    console.log('ElevenLabs speech ended');
                    URL.revokeObjectURL(audioUrl); // Clean up
                    setAssistantState('idle');
                };
                audio.onerror = (e) => {
                    console.error('ElevenLabs audio playback error:', e);
                    URL.revokeObjectURL(audioUrl); // Clean up
                    console.log('Falling back to browser TTS');
                    speakWithBrowser(text);
                };
                await audio.play();
                return;
            }
        } catch (error) {
            console.log('ElevenLabs not available, using browser TTS:', error);
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
                    "Greetings! I'm AKI, your AI assistant. How may I help?",
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
            // Open/Launch applications
            else if (lowerCommand.includes('open') || lowerCommand.includes('launch') || lowerCommand.includes('start')) {
                // Extract app name
                let appName = lowerCommand
                    .replace(/^(open|launch|start)\s+/i, '')
                    .replace(/\s+(please|for me|app|application)$/i, '')
                    .trim();
                
                try {
                    const result: any = await invoke("launch_application", { appName });
                    if (result.success) {
                        response = `Launched ${result.app_name}`;
                    } else {
                        response = `I couldn't find or launch ${appName}`;
                    }
                } catch (error) {
                    response = `I couldn't launch ${appName}. ${error}`;
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
                audioLevel={audioLevel}
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
                    {wakeWordActive && (
                        <div className="ml-auto flex items-center gap-2 text-xs text-cyber-cyan">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />
                            Wake word active
                        </div>
                    )}
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
                AKI v0.1.0-alpha
            </div>
        </div>
    );
}

export default App;
