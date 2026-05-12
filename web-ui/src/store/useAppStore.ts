import { create } from 'zustand';
import { mockStats, mockTasks, mockTimeline } from '../mocks/data';
import type { RuntimeStats, ScanConfig, ScanTask, TimelineEvent } from '../types';
interface State { stats: RuntimeStats; tasks: ScanTask[]; timeline: TimelineEvent[]; activeTaskId?: string; config: ScanConfig; setConfig: (p: Partial<ScanConfig>) => void; startTask: () => void; stopTask: () => void; tick: () => void; }
export const useAppStore = create<State>((set, get) => ({
  stats: mockStats, tasks: mockTasks, timeline: mockTimeline, activeTaskId: mockTasks[0]?.id,
  config: { target: '', ports: '80,443,22,3306,6379', userDict: 'users.txt', passDict: 'passwords.txt', modules: ['主机发现','端口扫描'], threads: 300, timeout: 6, proxy: '' },
  setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  startTask: () => set((s) => ({ timeline: [{ ts: new Date().toISOString(), type: 'success', message: '任务启动' }, ...s.timeline] })),
  stopTask: () => set((s) => ({ timeline: [{ ts: new Date().toISOString(), type: 'warn', message: '任务停止' }, ...s.timeline] })),
  tick: () => { const s = get().stats; set({ stats: { ...s, cpu: (s.cpu + Math.random() * 6) % 100, speed: Math.max(0, s.speed + Math.round((Math.random() - 0.5) * 80)) } }); }
}));
