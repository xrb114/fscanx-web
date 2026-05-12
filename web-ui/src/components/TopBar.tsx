import { Cpu, Github, Settings } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function TopBar() {
  const s = useAppStore((v) => v.stats);
  const loading = useAppStore((v) => v.loading);
  const format = (v: number | null, suffix = '') => (v === null ? '--' : `${v}${suffix}`);

  return <div className='glass top'><div><b style={{ color: '#00f7ff' }}>FScan X</b></div><div className='row'><span className='badge'>{s.online ? '在线' : '离线'}</span><span><Cpu size={14} /> CPU {format(s.cpu, '%')}</span><span>MEM {format(s.memory, '%')}</span><span>THR {format(s.threads)}</span>{loading && <span>同步中...</span>}</div><div className='row'><Github size={18} /><Settings size={18} /><img src='https://api.dicebear.com/9.x/bottts/svg?seed=fscan' width='28' /></div></div>;
}
