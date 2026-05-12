export type TaskStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'stopped';

export interface ScanTask {
  id: string;
  target: string;
  status: TaskStatus;
  startedAt?: string;
  modules: string[];
  speed?: number;
}

export interface RuntimeStats {
  cpu: number | null;
  memory: number | null;
  threads: number | null;
  online: boolean;
  scannedHosts: number;
  openPorts: number;
  services: number;
  websites: number;
  vulns: number;
  critical: number;
  cracked: number;
  speed: number;
}

export interface ScanConfig {
  target: string;
  ports: string;
  userDict: string;
  passDict: string;
  modules: string[];
  threads: number;
  timeout: number;
  proxy: string;
}

export interface TimelineEvent {
  ts: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface WsTaskMessage {
  type: 'log' | 'stats' | 'status' | 'task';
  message?: string;
  stats?: Partial<RuntimeStats>;
  status?: TaskStatus;
}
