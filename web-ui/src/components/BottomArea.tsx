import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export function BottomArea() {
  const tabs = ['Hosts', 'Ports', 'Services', 'Websites', 'Vulnerabilities', 'Credentials', 'Timeline'];
  const s = useAppStore((v) => v.stats);
  const bars = useMemo(() => [s.openPorts, s.services, s.websites, s.vulns, s.critical].map((n, i) => ({ k: ['Ports', 'Services', 'Web', 'Vulns', 'Critical'][i], v: Math.max(1, n) })), [s]);

  return <div className='glass'><div className='tabs'>{tabs.map((t) => <div className='tab' key={t}>{t}</div>)}</div><div className='chart-wrap'><div className='chart-card'><h4>扫描速度趋势</h4><svg viewBox='0 0 320 120'>{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={20 + i * 55} cy={100 - ((s.speed + i * 7) % 90)} r='3' fill='#00F5FF' />)}<polyline points={[0, 1, 2, 3, 4, 5].map((i) => `${20 + i * 55},${100 - ((s.speed + i * 7) % 90)}`).join(' ')} fill='none' stroke='#00F5FF' strokeWidth='2' /></svg></div><div className='chart-card'><h4>资产分布柱状</h4><div className='bars'>{bars.map((b) => <div key={b.k}><span>{b.k}</span><i style={{ height: `${Math.min(100, b.v % 100)}%` }} /></div>)}</div></div></div></div>;
}
