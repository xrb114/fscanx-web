import { useAppStore } from '../store/useAppStore';

export function StatsPanel() {
  const s = useAppStore((v) => v.stats);
  const items = [['扫描速度', s.speed], ['主机数', s.scannedHosts], ['开放端口', s.openPorts], ['服务数', s.services], ['Web应用', s.websites], ['漏洞', s.vulns], ['高危', s.critical], ['爆破成功', s.cracked]];

  return <div className='glass panel'><h3>实时统计（后端数据）</h3><div className='kpi'>{items.map(([k, v]) => <div key={k as string}><small>{k}</small><div style={{ fontSize: 22, color: '#00ff9d' }}>{v as number}</div></div>)}</div></div>;
}
