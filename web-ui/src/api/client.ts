import axios from 'axios';
import type { ScanConfig } from '../types';

export const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || '';

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : '/api'
});

export const wsTaskUrl = (taskId: string) => {
  if (API_BASE) {
    const u = new URL(API_BASE);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/ws/task/${taskId}`;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws/task/${taskId}`;
};

export const scanApi = {
  start: (payload: ScanConfig) => api.post('/scan/start', payload),
  stop: (id: string) => api.post(`/scan/stop/${id}`),
  tasks: () => api.get('/scan/tasks'),
  logs: (id: string) => api.get(`/scan/logs/${id}`),
  results: (id: string) => api.get(`/scan/results/${id}`)
};
