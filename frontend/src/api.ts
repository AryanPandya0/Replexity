import axios from 'axios';
import type { AnalysisResult } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes for large repos
});

export async function analyzeGitHub(url: string, branch: string = 'main'): Promise<AnalysisResult> {
  const res = await api.post('/analyze/github', { url, branch });
  return res.data;
}

export async function analyzeUpload(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/analyze/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function analyzeLocal(path: string): Promise<AnalysisResult> {
  const res = await api.post('/analyze/local', { path });
  return res.data;
}

export function getExportUrl(analysisId: string, format: 'json' | 'csv' | 'pdf'): string {
  return `/api/export/${analysisId}/${format}`;
}
