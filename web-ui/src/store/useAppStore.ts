import { create } from 'zustand';
import { scanApi, wsTaskUrl, API_BASE } from '../api/client';
import type { RuntimeStats, ScanConfig, ScanTask, TimelineEvent, WsTaskMessage, TaskStatus } from '../types';

interface State {
  stats: RuntimeStats;
  tasks: ScanTask[];
  timeline: TimelineEvent[];
  activeTaskId?: string;
  config: ScanConfig;
  isRunning: boolean;
  logLines: string[];
  ws?: WebSocket;
  loading: boolean;
  error?: string;
  setConfig: (p: Partial<ScanConfig>) => void;
  startTask: () => Promise<void>;
  stopTask: () => Promise<void>;
  appendLog: (line: string) => void;
  loadTasks: () => Promise<void>;
  connectWs: (taskId: string) => void;
  disconnectWs: () => void;
}

const emptyStats: RuntimeStats = {
  cpu: null,
  memory: null,
  threads: null,
  online: false,
  scannedHosts: 0,
  openPorts: 0,
  services: 0,
  websites: 0,
  vulns: 0,
  critical: 0,
  cracked: 0,
  speed: 0
};

const mapStatus = (status?: string): TaskStatus => {
  if (!status) return 'idle';
  if (['queued', 'running', 'completed', 'failed', 'stopped', 'idle'].includes(status)) return status as TaskStatus;
  return 'idle';
};

export const useAppStore = create<State>((set, get) => ({
  stats: emptyStats,
  tasks: [],
  timeline: [],
  activeTaskId: undefined,
  isRunning: false,
  logLines: [],
  ws: undefined,
  loading: false,
  error: undefined,
  config: { target: '', ports: '80,443,22,3306,6379', userDict: 'users.txt', passDict: 'passwords.txt', modules: ['主机发现', '端口扫描'], threads: 300, timeout: 6, proxy: '' },

  setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),

  appendLog: (line) => set((s) => ({ logLines: [...s.logLines.slice(-2000), line] })),

  loadTasks: async () => {
    set({ loading: true, error: undefined });
    try {
      const resp = await scanApi.tasks();
      const rows = Array.isArray(resp.data) ? resp.data : resp.data?.tasks ?? [];
      const tasks: ScanTask[] = rows.map((t: any) => ({
        id: String(t.id),
        target: t.target ?? '',
        status: mapStatus(t.status),
        startedAt: t.startedAt ?? t.started_at,
        modules: t.modules ?? [],
        speed: t.speed
      }));
      const running = tasks.find((t) => t.status === 'running');
      set({ tasks, activeTaskId: running?.id, isRunning: Boolean(running), loading: false, error: undefined });
      if (running?.id) get().connectWs(running.id);
    } catch (e) {
      set({ loading: false, error: '无法加载任务列表，请检查后端服务。' });
    }
  },

  connectWs: (taskId: string) => {
    const old = get().ws;
    if (old) old.close();
    const ws = new WebSocket(wsTaskUrl(taskId));

    ws.onopen = () => set((s) => ({ timeline: [{ ts: new Date().toISOString(), type: 'info', message: `WebSocket 已连接: ${taskId}` }, ...s.timeline], error: undefined }));
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsTaskMessage;
        if (msg.type === 'log' && msg.message) get().appendLog(msg.message);
        if (msg.type === 'stats' && msg.stats) set((s) => ({ stats: { ...s.stats, ...msg.stats, online: true } }));
        if (msg.type === 'status' && msg.status) {
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: msg.status } : t)),
            isRunning: msg.status === 'running'
          }));
        }
      } catch {
        get().appendLog(String(event.data));
      }
    };
    ws.onerror = () => set({ error: `WebSocket 连接失败，请检查后端地址。当前 API_BASE=${API_BASE || '(same-origin)'}` });
    ws.onclose = () => set((s) => ({ ws: undefined, timeline: [{ ts: new Date().toISOString(), type: 'warn', message: `WebSocket 已断开: ${taskId}` }, ...s.timeline] }));

    set({ ws, activeTaskId: taskId });
  },

  disconnectWs: () => {
    const ws = get().ws;
    if (ws) ws.close();
    set({ ws: undefined });
  },

  startTask: async () => {
    const { config } = get();
    if (!config.target.trim()) {
      set((s) => ({ timeline: [{ ts: new Date().toISOString(), type: 'error', message: '目标不能为空' }, ...s.timeline] }));
      return;
    }
    set({ loading: true, error: undefined, logLines: [] });
    const resp = await scanApi.start(config);
    const taskId = String(resp.data?.id ?? resp.data?.taskId ?? '');
    if (!taskId) throw new Error('后端未返回任务ID');

    const task: ScanTask = { id: taskId, target: config.target, status: 'running', startedAt: new Date().toISOString(), modules: config.modules, speed: 0 };
    set((s) => ({
      loading: false,
      isRunning: true,
      activeTaskId: taskId,
      tasks: [task, ...s.tasks.filter((t) => t.id !== taskId)],
      timeline: [{ ts: new Date().toISOString(), type: 'success', message: `任务已启动: ${taskId}` }, ...s.timeline]
    }));
    get().connectWs(taskId);
  },

  stopTask: async () => {
    const { activeTaskId } = get();
    if (!activeTaskId) return;
    await scanApi.stop(activeTaskId);
    set((s) => ({
      isRunning: false,
      tasks: s.tasks.map((t) => (t.id === activeTaskId ? { ...t, status: 'stopped' } : t)),
      timeline: [{ ts: new Date().toISOString(), type: 'warn', message: `任务已停止: ${activeTaskId}` }, ...s.timeline]
    }));
    get().disconnectWs();
  }
}));
