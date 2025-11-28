import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface DashboardProps {
    onClose: () => void;
}

export default function Dashboard({ onClose }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'automation' | 'settings'>('overview');
    const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, gpu: 0 });

    useEffect(() => {
        // Update system stats every 2 seconds
        const interval = setInterval(() => {
            setSystemStats({
                cpu: Math.floor(Math.random() * 100),
                memory: Math.floor(Math.random() * 100),
                gpu: Math.floor(Math.random() * 100)
            });
        }, 2000);
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

function OverviewTab({ stats }: { stats: { cpu: number; memory: number; gpu: number } }) {
    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">System Status</h3>
                <div className="space-y-2">
                    <StatusItem label="CPU" value={`${stats.cpu}%`} color="cyan" percent={stats.cpu} />
                    <StatusItem label="Memory" value={`${stats.memory}%`} color="purple" percent={stats.memory} />
                    <StatusItem label="GPU" value={`${stats.gpu}%`} color="pink" percent={stats.gpu} />
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
                <h3 className="text-sm font-semibold text-white/60 mb-3">Voice Settings (ElevenLabs)</h3>
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
                                        model_id: 'eleven_monolingual_v1',
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
                                            model_id: 'eleven_monolingual_v1',
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
                                            model_id: 'eleven_monolingual_v1',
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
