import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface DashboardProps {
    onClose: () => void;
}

export default function Dashboard({ onClose }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'automation' | 'settings'>('overview');

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
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'automation' && <AutomationTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function OverviewTab() {
    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">System Status</h3>
                <div className="space-y-2">
                    <StatusItem label="CPU" value="24%" color="cyan" />
                    <StatusItem label="Memory" value="3.2 GB" color="purple" />
                    <StatusItem label="GPU" value="12%" color="pink" />
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
                    <button className="cyber-button text-sm">Focus Mode</button>
                    <button className="cyber-button text-sm">Night Mode</button>
                </div>
            </div>
        </div>
    );
}

function AutomationTab() {
    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Active Routines</h3>
                <div className="space-y-3">
                    <RoutineItem name="Morning Briefing" enabled={true} />
                    <RoutineItem name="Focus Mode" enabled={false} />
                    <RoutineItem name="Evening Wind Down" enabled={true} />
                </div>
            </div>

            <button className="w-full cyber-button">
                + Create New Routine
            </button>
        </div>
    );
}

function SettingsTab() {
    return (
        <div className="space-y-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Voice Settings</h3>
                <div className="space-y-3">
                    <SettingItem label="Wake Word" value="Hey ASTRAL" />
                    <SettingItem label="Voice" value="British (Male)" />
                    <SettingItem label="Speech Speed" value="Normal" />
                </div>
            </div>

            <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white/60 mb-3">Privacy</h3>
                <div className="space-y-3">
                    <ToggleItem label="Local Processing" enabled={true} />
                    <ToggleItem label="Cloud Backup" enabled={false} />
                    <ToggleItem label="Usage Analytics" enabled={false} />
                </div>
            </div>
        </div>
    );
}

function StatusItem({ label, value, color }: { label: string; value: string; color: 'cyan' | 'purple' | 'pink' }) {
    const colorClass = color === 'cyan' ? 'bg-cyber-cyan' : color === 'purple' ? 'bg-cyber-purple' : 'bg-cyber-pink';

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{label}</span>
            <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full`} style={{ width: value }} />
                </div>
                <span className="text-sm font-mono text-white/90 w-16 text-right">{value}</span>
            </div>
        </div>
    );
}

function RoutineItem({ name, enabled }: { name: string; enabled: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
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

function ToggleItem({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{label}</span>
            <div className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-cyber-cyan' : 'bg-white/20'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
        </div>
    );
}
