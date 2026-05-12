import type { RuntimeStats, ScanTask, TimelineEvent } from '../types';
export const mockStats: RuntimeStats = { cpu: 42, memory: 58, threads: 180, online: true, scannedHosts: 2489, openPorts: 714, services: 512, websites: 161, vulns: 33, critical: 7, cracked: 15, speed: 882 };
export const mockTasks: ScanTask[] = [{ id: 'tsk-001', target: '10.0.0.0/16', status: 'running', startedAt: new Date().toISOString(), modules: ['主机发现','端口扫描','漏洞检测'], speed: 910 }];
export const mockTimeline: TimelineEvent[] = [{ ts: new Date().toISOString(), type: 'success', message: '扫描任务已启动' }];
