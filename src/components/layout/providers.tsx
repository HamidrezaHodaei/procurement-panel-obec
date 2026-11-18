'use client';
import React from 'react';
import { ActiveThemeProvider } from '@/components/themes/active-theme';
import { DirectionProvider } from '@/components/ui/direction';
import QueryProvider from '@/components/layout/query-provider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <DirectionProvider direction='rtl'>
          <QueryProvider>{children}</QueryProvider>
        </DirectionProvider>
      </ActiveThemeProvider>
    </>
  );
}
