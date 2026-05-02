import axios from 'axios';
import type { AnalysisResult } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes for large repos
});

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
  return `/api/export/${analysisId}/${format}`;
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
