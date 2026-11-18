'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const SEGMENT_TITLES: Record<string, string> = {
  dashboard: 'پنل',
  procurement: 'مدیریت فرآیند خرید',
  processes: 'فرآیندهای خرید',
  new: 'پرونده جدید',
  reports: 'گزارش‌ها',
  settings: 'تنظیمات و اطلاعات پایه'
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: SEGMENT_TITLES[segment] ?? (/^\d+$/.test(segment) ? 'پرونده' : segment.charAt(0).toUpperCase() + segment.slice(1)),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
