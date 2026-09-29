import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, BookOpen, Briefcase, Gamepad2, History, BarChart3, ShieldAlert, Cpu } from 'lucide-react';
import SleepDetector from './components/SleepDetector';

type TabRole = 'driver' | 'study' | 'work' | 'gaming' | 'history' | 'reports';

const TABS: { id: TabRole; label: string; icon: React.FC<any> }[] = [
  { id: 'driver', label: 'Driver', icon: Car },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'history', label: 'History', icon: History },
  { id: 'reports', label: 'Analytics', icon: BarChart3 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabRole>('driver');
  const [isAsleep, setIsAsleep] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const [sleepHistory, setSleepHistory] = useState<{ time: Date, duration: number, mode: string }[]>([]);
  const sleepStartTimeRef = useRef<number | null>(null);

  // Initialize audio context on any click to bypass browser autoplay restrictions
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  useEffect(() => {
    if (isAsleep) {
      if (!sleepStartTimeRef.current) {
        sleepStartTimeRef.current = Date.now();
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sawtooth'; // Harsher, louder sound
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Higher pitch A5
      osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.1); // E6
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
      
      // Pulsing effect
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 8; // Faster 8Hz pulse
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1;
      lfo.connect(lfoGain.gain);
      lfoGain.connect(gainNode.gain);
      lfo.start();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      
      oscillatorRef.current = osc;
    } else {
      if (sleepStartTimeRef.current) {
        const duration = (Date.now() - sleepStartTimeRef.current) / 1000;
        if (duration > 0.5) { // Only log significant events
          setSleepHistory(prev => [{ time: new Date(), duration, mode: activeTab }, ...prev].slice(0, 50));
        }
        sleepStartTimeRef.current = null;
      }

      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
    }
  }, [isAsleep, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'driver':
        return <DashboardContent mode="Driver" isAsleep={isAsleep} onSleepDetected={setIsAsleep} isActive={isActive} onActiveChange={setIsActive} />;
      case 'study':
        return <DashboardContent mode="Study" isAsleep={isAsleep} onSleepDetected={setIsAsleep} isActive={isActive} onActiveChange={setIsActive} />;
      case 'work':
        return <DashboardContent mode="Work" isAsleep={isAsleep} onSleepDetected={setIsAsleep} isActive={isActive} onActiveChange={setIsActive} />;
      case 'gaming':
        return <DashboardContent mode="Gaming" isAsleep={isAsleep} onSleepDetected={setIsAsleep} isActive={isActive} onActiveChange={setIsActive} />;
      case 'history':
        return <HistoryContent history={sleepHistory} />;
      case 'reports':
        return <AnalyticsContent history={sleepHistory} />;
      default:
        return <DashboardContent mode="Driver" isAsleep={isAsleep} onSleepDetected={setIsAsleep} isActive={isActive} onActiveChange={setIsActive} />;
    }
  };

  return (
    <div className={`flex h-screen w-full bg-neural-void text-holo-white overflow-hidden font-body transition-colors duration-500 ${isAsleep ? 'bg-alert-red/20' : ''}`}>
      {/* Sidebar */}
      <aside className="w-64 border-r border-cyan-glow/10 bg-neural-deep/40 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-cyan-glow/10 flex items-center gap-3">
          <Cpu className="w-8 h-8 text-cyan-glow glow-cyan" />
          <h1 className="font-display font-bold text-lg tracking-wider">SLEEP<span className="text-cyan-glow">ALERT</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                id={`${tab.id}-tab`}
                role="tab"
                aria-selected={isActive}
                aria-controls="panel"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r from-cyan-glow/20 to-purple-neon/10 border border-cyan-glow/30 text-cyan-glow glow-cyan shadow-[inset_0_0_20px_rgba(0,240,255,0.1)]' 
                    : 'text-holo-white/60 hover:text-holo-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-glow' : ''}`} />
                <span className="font-medium tracking-wide uppercase text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        <header className="h-20 border-b border-cyan-glow/10 flex items-center px-8 bg-neural-void/80 backdrop-blur-sm">
          <h2 className="text-2xl font-display font-semibold tracking-wide">
            {TABS.find(t => t.id === activeTab)?.label} Mode Active
          </h2>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-glow animate-pulse"></div>
              <span className="text-xs font-mono text-cyan-glow uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </header>

        <div 
          id="panel"
          className="flex-1 overflow-auto p-8 relative"
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-20" 
               style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative z-10"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function HistoryContent({ history }: { history: { time: Date, duration: number, mode: string }[] }) {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-xl font-display mb-2 text-cyan-glow">Detection History</h3>
        <p className="text-holo-white/70 mb-6">Log of severe drowsiness events detected across all sessions.</p>
        
        {history.length === 0 ? (
          <div className="text-center py-12 text-holo-white/40 font-mono text-sm">No drowsiness events recorded yet. Stay focused!</div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-neural-void/50 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-alert-red animate-pulse" />
                  <div>
                    <div className="font-mono text-sm text-holo-white">{entry.time.toLocaleTimeString()}</div>
                    <div className="text-xs text-holo-white/50">{entry.time.toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-alert-red">{entry.duration.toFixed(1)}s Duration</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-holo-white/50">{entry.mode} Mode</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsContent({ history }: { history: { time: Date, duration: number, mode: string }[] }) {
  const totalEvents = history.length;
  const avgDuration = totalEvents ? history.reduce((a, b) => a + b.duration, 0) / totalEvents : 0;
  
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl mb-6">
        <h3 className="text-xl font-display mb-2 text-purple-neon">Neural Analytics</h3>
        <p className="text-holo-white/70">Aggregated cognitive performance data.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard title="Total Sleep Events" value={totalEvents.toString()} trend={totalEvents > 5 ? "+Critical" : ""} status={totalEvents > 0 ? "critical" : "excellent"} />
        <MetricCard title="Avg Micro-Sleep" value={`${avgDuration.toFixed(1)}s`} trend="" status={avgDuration > 2 ? "critical" : "normal"} />
      </div>
      
      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
        <BarChart3 className="w-16 h-16 text-purple-neon/20 mb-4" />
        <p className="text-holo-white/40 font-mono text-sm">Advanced visualization metrics active. Awaiting more data...</p>
      </div>
    </div>
  );
}

function DashboardContent({ mode, isAsleep, onSleepDetected, isActive, onActiveChange }: { mode: string, isAsleep: boolean, onSleepDetected: (b: boolean) => void, isActive: boolean, onActiveChange: (b: boolean) => void }) {
  const [metrics, setMetrics] = useState({ load: 0, fatigue: 0, focus: 0 });

  return (
    <div className="space-y-6">
      <div className={`glass-panel p-6 rounded-2xl flex items-center justify-between transition-colors ${isAsleep ? 'border-alert-red bg-alert-red/20 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : ''}`}>
        <div>
          <h3 className={`text-xl font-display mb-2 ${isAsleep ? 'text-alert-red font-bold animate-pulse' : 'text-cyan-glow'}`}>
            {isAsleep ? 'WARNING: SEVERE DROWSINESS DETECTED' : `${mode} Profile Activated`}
          </h3>
          <p className="text-holo-white/70">Neural cognitive monitoring optimized for {mode.toLowerCase()} tasks.</p>
        </div>
        <ShieldAlert className={`w-12 h-12 ${isAsleep ? 'text-alert-red animate-ping' : 'text-purple-neon glow-purple'}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Section (Left, 2 columns) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl h-fit">
          <SleepDetector onSleepDetected={onSleepDetected} isActive={isActive} onActiveChange={onActiveChange} onMetricsUpdate={setMetrics} />
        </div>

        {/* Metrics Section (Right, 1 column, stacked vertically) */}
        <div className="flex flex-col gap-6">
          <MetricCard title="Cognitive Load" value={isActive ? `${metrics.load}%` : "N/A"} trend={isActive ? (metrics.load > 50 ? "+2%" : "-1%") : ""} status={isActive ? (metrics.load > 70 ? "critical" : "normal") : "normal"} />
          <MetricCard title="Fatigue Probability" value={!isActive ? "N/A" : isAsleep ? "99%" : `${metrics.fatigue}%`} trend={!isActive ? "" : isAsleep ? "+80%" : (metrics.fatigue > 30 ? "+5%" : "-2%")} status={!isActive ? "normal" : isAsleep || metrics.fatigue > 60 ? "critical" : "good"} />
          <MetricCard title="Focus Score" value={!isActive ? "N/A" : isAsleep ? "12%" : `${metrics.focus}%`} trend={!isActive ? "" : isAsleep ? "-77%" : (metrics.focus > 80 ? "+2%" : "-5%")} status={!isActive ? "normal" : isAsleep || metrics.focus < 50 ? "critical" : "excellent"} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, status }: { title: string, value: string, trend: string, status: string }) {
  return (
    <div className={`glass-panel p-6 rounded-2xl border-t-2 ${status === 'critical' ? 'border-t-alert-red shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]' : status === 'excellent' ? 'border-t-purple-neon' : status === 'good' ? 'border-t-cyan-glow' : 'border-t-alert-amber'}`}>
      <h4 className="text-sm font-mono text-holo-white/60 uppercase tracking-wider mb-4">{title}</h4>
      <div className="flex items-end gap-4">
        <span className={`text-4xl font-display font-bold ${status === 'critical' ? 'text-alert-red' : 'text-gradient-cyan'}`}>{value}</span>
        <span className={`text-sm font-mono mb-1 ${trend.startsWith('+') ? (status === 'critical' ? 'text-alert-red' : 'text-cyan-glow') : (status === 'critical' ? 'text-alert-red' : 'text-purple-neon')}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
