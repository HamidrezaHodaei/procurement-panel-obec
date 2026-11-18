'use client';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

// The icon shows what the click will do: close an open sidebar, open a closed one
export function SidebarToggle() {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const sidebarOpen = isMobile ? openMobile : open;

  return (
    <Button
      variant='ghost'
      size='icon'
      className='text-muted-foreground hover:text-foreground -ms-1'
      aria-label='باز و بسته کردن منو'
      aria-expanded={sidebarOpen}
      onClick={toggleSidebar}
    >
      {sidebarOpen ? <Icons.panelLeftClose className='rtl:-scale-x-100' /> : <Icons.panelLeftOpen className='rtl:-scale-x-100' />}
    </Button>
  );
}
