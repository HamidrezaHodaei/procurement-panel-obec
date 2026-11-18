'use client';

import { useQuery } from '@tanstack/react-query';
import { procQueries } from '../api/queries';

/** Current user + capability flags (the API enforces the same rules; this only shapes the UI). */
export function useMe() {
  const { data, isLoading } = useQuery(procQueries.me());
  return {
    me: data,
    isLoading,
    canEdit: data?.role === 'admin' || data?.role === 'editor',
    isAdmin: data?.role === 'admin'
  };
}
