import { mutationOptions, queryOptions } from '@tanstack/react-query';
import type {
  CurrentUser, UserDto,
  DashboardData, Filters, Lookups, ProcessDetail, ProcessListResponse, ReportId, ReportResult, AuditEntry
} from '../types';
import type { ProcessInput } from '../schemas';
import { api, filtersToQuery } from './client';

export const procKeys = { all: ['procurement'] as const };

export const procQueries = {
  lookups: () => queryOptions({ queryKey: [...procKeys.all, 'lookups'], queryFn: () => api<Lookups>('/lookups'), staleTime: 30_000 }),
  me: () => queryOptions({ queryKey: [...procKeys.all, 'me'], queryFn: () => api<CurrentUser>('/api/auth/me'), staleTime: 60_000, retry: false }),
  users: () => queryOptions({ queryKey: [...procKeys.all, 'users'], queryFn: () => api<UserDto[]>('/api/auth/users') }),
  list: (f: Filters, page: number, perPage: number, sort: string) =>
    queryOptions({
      queryKey: [...procKeys.all, 'list', f, page, perPage, sort],
      queryFn: () => api<ProcessListResponse>(`/processes${filtersToQuery(f, { page, perPage, sort })}`)
    }),
  detail: (id: number) => queryOptions({ queryKey: [...procKeys.all, 'detail', id], queryFn: () => api<ProcessDetail>(`/processes/${id}`) }),
  audit: (id: number) => queryOptions({ queryKey: [...procKeys.all, 'audit', id], queryFn: () => api<AuditEntry[]>(`/processes/${id}/audit`) }),
  dashboard: (f: Filters) => queryOptions({ queryKey: [...procKeys.all, 'dashboard', f], queryFn: () => api<DashboardData>(`/dashboard${filtersToQuery(f)}`) }),
  report: (id: ReportId, f: Filters) => queryOptions({ queryKey: [...procKeys.all, 'report', id, f], queryFn: () => api<ReportResult>(`/reports/${id}${filtersToQuery(f)}`) }),
  master: (key: string) => queryOptions({ queryKey: [...procKeys.all, 'master', key], queryFn: () => api<Record<string, unknown>[]>(`/masters/${key}`) })
};

export const procMutations = {
  createProcess: () => mutationOptions({ mutationFn: (v: ProcessInput) => api<ProcessDetail>('/processes', { method: 'POST', json: v }) }),
  updateProcess: () => mutationOptions({ mutationFn: ({ id, values }: { id: number; values: ProcessInput }) => api<ProcessDetail>(`/processes/${id}`, { method: 'PATCH', json: values }) }),
  deleteProcess: () => mutationOptions({ mutationFn: (id: number) => api<{ ok: true }>(`/processes/${id}`, { method: 'DELETE' }) }),
  saveChild: () =>
    mutationOptions({
      mutationFn: ({ processId, kind, id, values }: { processId: number; kind: string; id?: number; values: unknown }) =>
        id
          ? api(`/processes/${processId}/${kind}/${id}`, { method: 'PATCH', json: values })
          : api(`/processes/${processId}/${kind}`, { method: 'POST', json: values })
    }),
  deleteChild: () => mutationOptions({ mutationFn: ({ processId, kind, id }: { processId: number; kind: string; id: number }) => api(`/processes/${processId}/${kind}/${id}`, { method: 'DELETE' }) }),
  saveUser: () =>
    mutationOptions({
      mutationFn: ({ id, values }: { id?: number; values: Record<string, unknown> }) =>
        id ? api<UserDto>(`/api/auth/users/${id}`, { method: 'PATCH', json: values }) : api<UserDto>('/api/auth/users', { method: 'POST', json: values })
    }),
  saveMaster: () =>
    mutationOptions({
      mutationFn: ({ key, id, values }: { key: string; id?: number; values: Record<string, unknown> }) =>
        id ? api(`/masters/${key}/${id}`, { method: 'PATCH', json: values }) : api(`/masters/${key}`, { method: 'POST', json: values })
    })
};
