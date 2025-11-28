import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface DashboardProps {
    onClose: () => void;
}

export default function Dashboard({ onClose }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'automation' | 'settings'>('overview');
    const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, memoryUsed: 0, memoryTotal: 0, gpu: 0 });

    useEffect(() => {
        // Update system stats every 2 seconds
        const updateStats = async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const stats: any = await invoke('get_system_stats_command');
                setSystemStats({
                    cpu: Math.round(stats.cpu_usage),
                    memory: Math.round(stats.memory_usage),
                    memoryUsed: Math.round(stats.memory_used / (1024 * 1024 * 1024)), // Convert to GB
                    memoryTotal: Math.round(stats.memory_total / (1024 * 1024 * 1024)), // Convert to GB
                    gpu: stats.gpu_usage ? Math.round(stats.gpu_usage) : 0
                });
            } catch (error) {
                console.error('Failed to get system stats:', error);
            }
        };

        updateStats(); // Initial load
        const interval = setInterval(updateStats, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 h-full w-96 glass-strong border-l border-white/20 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gradient">Dashboard</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg glass hover:bg-white/10 transition-colors flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        {(['overview', 'automation', 'settings'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50'
                                        : 'glass hover:bg-white/5'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
            <div className="p-6 h-[calc(100%-140px)] overflow-y-auto custom-scrollbar">
                {activeTab === 'overview' && <OverviewTab stats={systemStats} />}
                {activeTab === 'automation' && <AutomationTab />}
                {activeTab === 'settings' && <SettingsTab />}
            </div>
            </motion.div>
        </AnimatePresence>
    );
}

function OverviewTab({ stats }: { stats: { cpu: number; memory: number; memoryUsed: number; memoryTotal: number; gpu: number } }) {
    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">System Status</h3>
                <div className="space-y-2">
                    <StatusItem label="CPU" value={`${stats.cpu}%`} color="cyan" percent={stats.cpu} />
                    <StatusItem label="Memory" value={`${stats.memoryUsed}/${stats.memoryTotal} GB`} color="purple" percent={stats.memory} />
                    <StatusItem label="GPU" value={stats.gpu > 0 ? `${stats.gpu}%` : 'N/A'} color="pink" percent={stats.gpu} />
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Commands</h3>
                <div className="space-y-2 text-sm">
                    <div className="text-white/80">• Open Spotify</div>
                    <div className="text-white/80">• What's the weather?</div>
                    <div className="text-white/80">• Set a timer for 10 minutes</div>
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        className="cyber-button text-sm hover:scale-105 transition-transform active:scale-95" 
                        onClick={() => alert('Focus Mode: Muting notifications and minimizing distractions')}
                    >
                        Focus Mode
                    </button>
                    <button 
                        className="cyber-button text-sm hover:scale-105 transition-transform active:scale-95"
                        onClick={() => alert('Night Mode: Reducing blue light and screen brightness')}
                    >
                        Night Mode
                    </button>
                </div>
            </div>
        </div>
    );
}

function AutomationTab() {
    const [routines, setRoutines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoutines();
    }, []);

    const loadRoutines = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const result: any = await invoke('get_automation_routines');
            setRoutines(result);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load routines:', error);
            setLoading(false);
        }
    };

    const toggleRoutine = async (routineId: string) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const newState: boolean = await invoke('toggle_automation', { routineId });
            setRoutines(prev => prev.map(r => 
                r.id === routineId ? { ...r, enabled: newState } : r
            ));
        } catch (error) {
            console.error('Failed to toggle routine:', error);
        }
    };

    const executeRoutine = async (routineId: string) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('execute_automation', { routineId });
            alert('Routine started!');
        } catch (error) {
            console.error('Failed to execute routine:', error);
            alert('Failed to execute routine');
        }
    };

    if (loading) {
        return <div className="text-center text-white/60">Loading routines...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Automation Routines</h3>
                <div className="space-y-3">
                    {routines.map(routine => (
                        <div key={routine.id} className="bg-white/5 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium">{routine.name}</div>
                                    <div className="text-xs text-white/50">{routine.description}</div>
                                </div>
                                <div className={`w-10 h-5 rounded-full transition-colors ${routine.enabled ? 'bg-cyber-cyan' : 'bg-white/20'} relative cursor-pointer`}
                                    onClick={() => toggleRoutine(routine.id)}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${routine.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                            </div>
                            <button 
                                className="w-full text-xs cyber-button py-1"
                                onClick={() => executeRoutine(routine.id)}
                            >
                                Run Now
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-xs text-white/40 text-center">
                Say "start work mode" or "gaming mode" to activate routines by voice
            </div>
        </div>
    );
}

function SettingsTab() {
    const [settings, setSettings] = useState({
        localProcessing: true,
        cloudBackup: false,
        usageAnalytics: false
    });
    const [llmProvider, setLlmProvider] = useState('Ollama');
    const [showApiKey, setShowApiKey] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [ttsApiKey, setTtsApiKey] = useState('');
    const [ttsVoice, setTtsVoice] = useState('21m00Tcm4TlvDq8ikWAM');
    const [voices, setVoices] = useState<any[]>([]);

    useEffect(() => {
        loadTTSConfig();
        loadVoices();
    }, []);

    const loadTTSConfig = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const config: any = await invoke('elevenlabs_get_config');
            setTtsEnabled(config.enabled);
            setTtsApiKey(config.api_key);
            setTtsVoice(config.voice_id);
        } catch (error) {
            console.error('Failed to load TTS config:', error);
        }
    };

    const loadVoices = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const voiceList: any[] = await invoke('elevenlabs_get_voices');
            setVoices(voiceList);
        } catch (error) {
            console.error('Failed to load voices:', error);
        }
    };

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const testLlmConnection = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const config = {
                provider: llmProvider,
                api_key: null,
                model: llmProvider === 'OpenAI' ? 'gpt-4' : llmProvider === 'Claude' ? 'claude-3-sonnet-20240229' : 'llama2',
                temperature: 0.7,
                max_tokens: 500,
                ollama_url: 'http://localhost:11434'
            };
            const result = await invoke('test_llm_connection', { config });
            alert(result ? 'Connection successful!' : 'Connection failed - check your settings');
        } catch (error) {
            alert('Connection test failed: ' + error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">AI Provider</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-white/50 block mb-1">LLM Provider</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                            value={llmProvider}
                            onChange={(e) => setLlmProvider(e.target.value)}
                        >
                            <option value="Ollama">Ollama (Local)</option>
                            <option value="OpenAI">OpenAI GPT-4</option>
                            <option value="Claude">Anthropic Claude</option>
                        </select>
                    </div>
                    {llmProvider !== 'Ollama' && (
                        <div>
                            <label className="text-xs text-white/50 block mb-1">API Key</label>
                            <input 
                                type={showApiKey ? 'text' : 'password'}
                                className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                                placeholder="sk-..."
                            />
                            <button 
                                className="text-xs text-cyber-cyan mt-1"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    )}
                    {llmProvider === 'Ollama' && (
                        <div className="text-xs text-white/50 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded p-2">
                            Make sure Ollama is running: <code className="text-cyber-cyan">ollama serve</code>
                        </div>
                    )}
                    <button className="w-full cyber-button text-sm" onClick={testLlmConnection}>
                        Test Connection
                    </button>
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Speech-to-Text (Whisper)</h3>
                <div className="space-y-3">
                    <WhisperSettings />
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Text-to-Speech (ElevenLabs)</h3>
                <div className="space-y-3">
                    <ToggleItem 
                        label="Use ElevenLabs (Natural Voice)" 
                        enabled={ttsEnabled}
                        onToggle={async () => {
                            const newState = !ttsEnabled;
                            setTtsEnabled(newState);
                            try {
                                const { invoke } = await import('@tauri-apps/api/core');
                                await invoke('elevenlabs_update_config', {
                                    config: {
                                        api_key: ttsApiKey,
                                        voice_id: ttsVoice,
                                        model_id: 'eleven_turbo_v2_5',
                                        enabled: newState
                                    }
                                });
                                console.log('ElevenLabs', newState ? 'enabled' : 'disabled');
                            } catch (error) {
                                console.error('Failed to update TTS config:', error);
                            }
                        }}
                    />
                    
                    <div>
                        <label className="text-xs text-white/50 block mb-1">API Key</label>
                        <input 
                            type="password"
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                            placeholder="sk_..."
                            value={ttsApiKey}
                            onChange={async (e) => {
                                const newKey = e.target.value;
                                setTtsApiKey(newKey);
                                try {
                                    const { invoke } = await import('@tauri-apps/api/core');
                                    await invoke('elevenlabs_update_config', {
                                        config: {
                                            api_key: newKey,
                                            voice_id: ttsVoice,
                                            model_id: 'eleven_turbo_v2_5',
                                            enabled: ttsEnabled
                                        }
                                    });
                                } catch (error) {
                                    console.error('Failed to update API key:', error);
                                }
                            }}
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs text-white/50 block mb-1">Voice</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                            value={ttsVoice}
                            onChange={async (e) => {
                                const newVoice = e.target.value;
                                setTtsVoice(newVoice);
                                try {
                                    const { invoke } = await import('@tauri-apps/api/core');
                                    await invoke('elevenlabs_update_config', {
                                        config: {
                                            api_key: ttsApiKey,
                                            voice_id: newVoice,
                                            model_id: 'eleven_turbo_v2_5',
                                            enabled: ttsEnabled
                                        }
                                    });
                                } catch (error) {
                                    console.error('Failed to update voice:', error);
                                }
                            }}
                        >
                            {voices.map(voice => (
                                <option key={voice.id} value={voice.id}>{voice.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        className="w-full cyber-button text-sm"
                        onClick={async () => {
                            try {
                                const { invoke } = await import('@tauri-apps/api/core');
                                const result: string = await invoke('elevenlabs_test');
                                alert(result);
                            } catch (error) {
                                alert('Test failed: ' + error);
                            }
                        }}
                    >
                        Test Voice
                    </button>
                    
                    <div className="text-xs text-white/50 bg-cyber-purple/10 border border-cyber-purple/30 rounded p-2">
                        ℹ️ Get free API key at <a href="https://elevenlabs.io" target="_blank" className="text-cyber-cyan underline">elevenlabs.io</a> (10k chars/month free)
                    </div>
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Wake Word Detection</h3>
                <div className="space-y-3">
                    <WakeWordSettings />
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Privacy</h3>
                <div className="space-y-3">
                    <ToggleItem 
                        label="Local Processing" 
                        enabled={settings.localProcessing}
                        onToggle={() => toggleSetting('localProcessing')}
                    />
                    <ToggleItem 
                        label="Cloud Backup" 
                        enabled={settings.cloudBackup}
                        onToggle={() => toggleSetting('cloudBackup')}
                    />
                    <ToggleItem 
                        label="Usage Analytics" 
                        enabled={settings.usageAnalytics}
                        onToggle={() => toggleSetting('usageAnalytics')}
                    />
                </div>
            </div>

            <div className="text-xs text-white/40 text-center">
                Advanced features: Wake word detection, Whisper STT, multi-provider TTS
            </div>
        </div>
    );
}

function StatusItem({ label, value, color, percent }: { label: string; value: string; color: 'cyan' | 'purple' | 'pink'; percent: number }) {
    const colorClass = color === 'cyan' ? 'bg-cyber-cyan' : color === 'purple' ? 'bg-cyber-purple' : 'bg-cyber-pink';

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{label}</span>
            <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${colorClass} rounded-full transition-all duration-500`} 
                        style={{ width: `${percent}%` }} 
                    />
                </div>
                <span className="text-sm font-mono text-white/90 w-16 text-right">{value}</span>
            </div>
        </div>
    );
}

function RoutineItem({ name, enabled, onToggle }: { name: string; enabled: boolean; onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" onClick={onToggle}>
            <span className="text-sm">{name}</span>
            <div className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-cyber-cyan' : 'bg-white/20'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
        </div>
    );
}

function SettingItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{label}</span>
            <span className="text-sm font-medium">{value}</span>
        </div>
    );
}

function WhisperSettings() {
    const [whisperEnabled, setWhisperEnabled] = useState(false);
    const [whisperUrl, setWhisperUrl] = useState('http://localhost:9881');
    const [isHealthy, setIsHealthy] = useState(false);

    useEffect(() => {
        loadWhisperConfig();
    }, []);

    const loadWhisperConfig = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const config: any = await invoke('whisper_get_config');
            setWhisperEnabled(config.enabled);
            setWhisperUrl(config.server_url);
            
            if (config.enabled) {
                checkHealth();
            }
        } catch (error) {
            console.error('Failed to load Whisper config:', error);
        }
    };

    const checkHealth = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const healthy = await invoke('whisper_health_check');
            setIsHealthy(healthy as boolean);
        } catch (error) {
            setIsHealthy(false);
        }
    };

    return (
        <>
            <ToggleItem 
                label="Use Whisper (Better Accuracy)" 
                enabled={whisperEnabled}
                onToggle={async () => {
                    const newState = !whisperEnabled;
                    setWhisperEnabled(newState);
                    try {
                        const { invoke } = await import('@tauri-apps/api/core');
                        await invoke('whisper_update_config', {
                            config: {
                                server_url: whisperUrl,
                                model: 'base.en',
                                enabled: newState
                            }
                        });
                        if (newState) {
                            checkHealth();
                        }
                    } catch (error) {
                        console.error('Failed to update Whisper config:', error);
                    }
                }}
            />
            
            <div>
                <label className="text-xs text-white/50 block mb-1">Server URL</label>
                <input 
                    type="text"
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                    value={whisperUrl}
                    onChange={(e) => setWhisperUrl(e.target.value)}
                    placeholder="http://localhost:9881"
                />
            </div>

            {whisperEnabled && (
                <div className={`text-xs p-2 rounded ${isHealthy ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                    {isHealthy ? '✓ Whisper server is running' : '✗ Server not responding. Run install-whisper.ps1'}
                </div>
            )}

            <button 
                className="w-full cyber-button text-sm"
                onClick={checkHealth}
            >
                Test Connection
            </button>

            <div className="text-xs text-white/50 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded p-2">
                ℹ️ Local speech recognition with Whisper.cpp (offline, multilingual, more accurate)
            </div>
        </>
    );
}

function WakeWordSettings() {
    const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        loadWakeWordConfig();
        checkIfActive();
    }, []);

    const loadWakeWordConfig = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const config: any = await invoke('get_wake_word_config');
            setWakeWordEnabled(config.enabled);
        } catch (error) {
            console.error('Failed to load wake word config:', error);
        }
    };

    const checkIfActive = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const active = await invoke('is_wake_word_active');
            setIsActive(active as boolean);
        } catch (error) {
            console.error('Failed to check wake word status:', error);
        }
    };

    const toggleWakeWord = async () => {
        const newState = !wakeWordEnabled;
        setWakeWordEnabled(newState);
        
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('update_wake_word_config', {
                config: {
                    enabled: newState,
                    phrase: 'hey aki',
                    sensitivity: 0.7
                }
            });
            
            // Start/stop detection based on new state
            if (newState) {
                await invoke('start_wake_word_detection');
                setIsActive(true);
            } else {
                await invoke('stop_wake_word_detection');
                setIsActive(false);
            }
            
            console.log('Wake word', newState ? 'enabled' : 'disabled');
        } catch (error) {
            console.error('Failed to update wake word config:', error);
            setWakeWordEnabled(!newState); // Revert on error
        }
    };

    return (
        <>
            <ToggleItem 
                label='Always Listen for "Hey AKI"' 
                enabled={wakeWordEnabled}
                onToggle={toggleWakeWord}
            />
            
            {wakeWordEnabled && (
                <div className={`text-xs p-2 rounded ${isActive ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'}`}>
                    {isActive ? '🎤 Listening for wake word...' : '⏸️ Wake word detection paused'}
                </div>
            )}
            
            <div className="text-xs text-white/50 bg-cyber-purple/10 border border-cyber-purple/30 rounded p-2">
                ℹ️ Say "Hey AKI" to activate hands-free. (Placeholder - full implementation coming soon)
            </div>
        </>
    );
}

function ToggleItem({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-2 rounded transition-colors" onClick={onToggle}>
            <span className="text-sm text-white/70">{label}</span>
            <div className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-cyber-cyan' : 'bg-white/20'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
        </div>
    );
}
