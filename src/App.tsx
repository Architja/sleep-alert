import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, BookOpen, Briefcase, Gamepad2, History, BarChart3, Settings, ShieldAlert, Cpu } from 'lucide-react';

type TabRole = 'driver' | 'study' | 'work' | 'gaming' | 'history' | 'reports' | 'settings';

const TABS: { id: TabRole; label: string; icon: React.FC<any> }[] = [
  { id: 'driver', label: 'Driver', icon: Car },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'history', label: 'History', icon: History },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabRole>('driver');

  const renderContent = () => {
    switch (activeTab) {
      case 'driver':
        return <DashboardContent mode="Driver" />;
      case 'study':
        return <DashboardContent mode="Study" />;
      case 'work':
        return <DashboardContent mode="Work" />;
      case 'gaming':
        return <DashboardContent mode="Gaming" />;
      case 'history':
        return <div className="text-xl">History logs will appear here.</div>;
      case 'reports':
        return <div className="text-xl">Analytics and Reports will appear here.</div>;
      case 'settings':
        return <div className="text-xl">System settings configuration.</div>;
      default:
        return <DashboardContent mode="Driver" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-neural-void text-holo-white overflow-hidden font-body">
      {/* Sidebar */}
      <aside className="w-64 border-r border-cyan-glow/10 bg-neural-deep/40 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-cyan-glow/10 flex items-center gap-3">
          <Cpu className="w-8 h-8 text-cyan-glow glow-cyan" />
          <h1 className="font-display font-bold text-lg tracking-wider">NEURO<span className="text-cyan-glow">GUARD</span></h1>
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

function DashboardContent({ mode }: { mode: string }) {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-cyan-glow mb-2">{mode} Profile Activated</h3>
          <p className="text-holo-white/70">Neural cognitive monitoring optimized for {mode.toLowerCase()} tasks.</p>
        </div>
        <ShieldAlert className="w-12 h-12 text-purple-neon glow-purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Cognitive Load" value="42%" trend="+5%" status="normal" />
        <MetricCard title="Fatigue Probability" value="18%" trend="-2%" status="good" />
        <MetricCard title="Focus Score" value="89%" trend="+12%" status="excellent" />
      </div>
      
      <div className="glass-panel p-6 rounded-2xl h-64 flex items-center justify-center">
        <span className="text-holo-white/40 font-mono text-sm tracking-widest uppercase">[{mode} Telemetry Graph Placeholder]</span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, status }: { title: string, value: string, trend: string, status: string }) {
  return (
    <div className={`glass-panel p-6 rounded-2xl border-t-2 ${status === 'excellent' ? 'border-t-purple-neon' : status === 'good' ? 'border-t-cyan-glow' : 'border-t-alert-amber'}`}>
      <h4 className="text-sm font-mono text-holo-white/60 uppercase tracking-wider mb-4">{title}</h4>
      <div className="flex items-end gap-4">
        <span className="text-4xl font-display font-bold text-gradient-cyan">{value}</span>
        <span className={`text-sm font-mono mb-1 ${trend.startsWith('+') ? 'text-cyan-glow' : 'text-purple-neon'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
