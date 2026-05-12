import axios from 'axios';
import type { ScanConfig } from '../types';
const api = axios.create({ baseURL: '/api' });
export const scanApi = {
  start: (payload: ScanConfig) => api.post('/scan/start', payload),
  stop: (id: string) => api.post(`/scan/stop/${id}`),
  tasks: () => api.get('/scan/tasks'),
  logs: (id: string) => api.get(`/scan/logs/${id}`),
  results: (id: string) => api.get(`/scan/results/${id}`)
};
