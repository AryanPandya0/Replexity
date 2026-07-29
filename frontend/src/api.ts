import axios from 'axios';
import type { AnalysisResult } from './types';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const cleanApiUrl = VITE_API_URL.replace(/\/$/, '');
const API_BASE_URL = cleanApiUrl ? (cleanApiUrl.endsWith('/api') ? cleanApiUrl : `${cleanApiUrl}/api`) : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for large repos
});

// Interceptor to attach Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

interface TaskResponse {
  task_id: string;
  status: string;
}

interface PollResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: AnalysisResult;
  error?: string;
}

export async function analyzeGitHub(url: string, branch: string = 'main'): Promise<TaskResponse> {
  const res = await api.post('/analyze/github', { url, branch });
  return res.data;
}

export async function analyzeUpload(file: File): Promise<TaskResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/analyze/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function analyzeLocal(path: string): Promise<TaskResponse> {
  const res = await api.post('/analyze/local', { path });
  return res.data;
}

export async function checkAnalysisStatus(taskId: string): Promise<PollResponse> {
  const res = await api.get(`/status/${taskId}`);
  return res.data;
}

export function getExportUrl(analysisId: string, format: 'json' | 'csv' | 'pdf'): string {
  return `${API_BASE_URL}/export/${analysisId}/${format}`;
}

export async function generateProjectAIReview(project_overview: any, top_issues: any[]): Promise<string> {
  const res = await api.post('/ai/review/project', { project_overview, top_issues });
  return res.data.review;
}

export async function generateFileAIReview(file_path: string, file_metrics: any, code_content: string | null): Promise<string> {
  const res = await api.post('/ai/review/file', { file_path, file_metrics, code_content });
  return res.data.review;
}

export async function generatePdfAIReview(project_overview: any, issues: any[]): Promise<string> {
  const res = await api.post('/ai/review/pdf', { project_overview, issues });
  return res.data.review;
}
