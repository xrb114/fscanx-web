import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { ControlPanel } from './components/ControlPanel';
import { TerminalView } from './components/TerminalView';
import { StatsPanel } from './components/StatsPanel';
import { BottomArea } from './components/BottomArea';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const loadTasks = useAppStore((s) => s.loadTasks);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  return <div className='app'><div className='grid' /><div className='shell'><TopBar /><div className='main'><ControlPanel /><TerminalView /><StatsPanel /></div><BottomArea /></div></div>;
}
