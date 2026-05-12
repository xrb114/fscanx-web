import { create } from 'zustand';
import { scanApi } from '../api/client';
import type { RuntimeStats, ScanConfig, ScanTask, TimelineEvent, TaskStatus } from '../types';

interface State {
  stats: RuntimeStats;
  tasks: ScanTask[];
  timeline: TimelineEvent[];
  activeTaskId?: string;
  config: ScanConfig;
  isRunning: boolean;
  logLines: string[];
  setConfig: (p: Partial<ScanConfig>) => void;
  startTask: () => Promise<void>;
  stopTask: () => Promise<void>;
  appendLog: (line: string) => void;
  tick: () => void;
}

const baseStats: RuntimeStats = { cpu: 8, memory: 21, threads: 0, online: true, scannedHosts: 0, openPorts: 0, services: 0, websites: 0, vulns: 0, critical: 0, cracked: 0, speed: 0 };

const statusUpdate = (tasks: ScanTask[], id: string, status: TaskStatus) =>
  tasks.map((t) => (t.id === id ? { ...t, status } : t));

export const useAppStore = create<State>((set, get) => ({
  stats: baseStats,
  tasks: [],
  timeline: [],
  activeTaskId: undefined,
  isRunning: false,
  logLines: [],
  config: {
    target: '',
    ports: '80,443,22,3306,6379',
    userDict: 'users.txt',
    passDict: 'passwords.txt',
    modules: ['主机发现', '端口扫描'],
    threads: 300,
    timeout: 6,
    proxy: ''
  },
  setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  appendLog: (line) => set((s) => ({ logLines: [...s.logLines.slice(-1200), line] })),
  startTask: async () => {
    const { config, tasks } = get();
    if (!config.target.trim()) {
      set((s) => ({ timeline: [{ ts: new Date().toISOString(), type: 'error', message: '目标不能为空' }, ...s.timeline] }));
      return;
    }

    const localTaskId = `task-${Date.now()}`;
    const nextTask: ScanTask = {
      id: localTaskId,
      target: config.target,
      status: 'running',
      startedAt: new Date().toISOString(),
      modules: config.modules,
      speed: 0
    };

    set({ isRunning: true, activeTaskId: localTaskId, tasks: [nextTask, ...tasks], logLines: [`[init] 准备扫描目标 ${config.target}`] });
    set((s) => ({ timeline: [{ ts: new Date().toISOString(), type: 'info', message: `任务启动中: ${config.target}` }, ...s.timeline] }));

    try {
      const resp = await scanApi.start(config);
      const realId = resp.data?.id ?? localTaskId;
      if (realId !== localTaskId) {
        set((s) => ({
          activeTaskId: realId,
          tasks: s.tasks.map((t) => (t.id === localTaskId ? { ...t, id: realId } : t))
        }));
      }
      get().appendLog(`[ok] 扫描任务已提交 (${realId})`);
    } catch {
      get().appendLog('[mock] 后端不可达，已使用前端模拟扫描流。');
    }
  },
  stopTask: async () => {
    const { activeTaskId } = get();
    if (!activeTaskId) return;
    try { await scanApi.stop(activeTaskId); } catch {}
    set((s) => ({
      isRunning: false,
      tasks: statusUpdate(s.tasks, activeTaskId, 'stopped'),
      timeline: [{ ts: new Date().toISOString(), type: 'warn', message: `任务已停止: ${activeTaskId}` }, ...s.timeline]
    }));
    get().appendLog(`[stop] 任务 ${activeTaskId} 已停止`);
  },
  tick: () => {
    const { isRunning, config, stats, activeTaskId } = get();
    const cpu = Math.min(96, Math.max(3, stats.cpu + (Math.random() - 0.5) * 8));
    if (!isRunning) {
      set({ stats: { ...stats, cpu, speed: 0, threads: 0 } });
      return;
    }
    const speed = Math.max(20, Math.round(config.threads * (0.8 + Math.random() * 0.5)));
    const scannedHosts = stats.scannedHosts + Math.max(1, Math.round(speed / 20));
    set({
      stats: {
        ...stats,
        cpu,
        threads: config.threads,
        speed,
        scannedHosts,
        openPorts: stats.openPorts + Math.round(Math.random() * 2),
        services: stats.services + Math.round(Math.random() * 2),
        websites: stats.websites + (Math.random() > 0.8 ? 1 : 0),
        vulns: stats.vulns + (Math.random() > 0.92 ? 1 : 0),
        critical: stats.critical + (Math.random() > 0.97 ? 1 : 0),
        cracked: stats.cracked + (Math.random() > 0.96 ? 1 : 0)
      },
      tasks: activeTaskId ? statusUpdate(get().tasks, activeTaskId, 'running').map((t) => (t.id === activeTaskId ? { ...t, speed } : t)) : get().tasks
    });
  }
}));
