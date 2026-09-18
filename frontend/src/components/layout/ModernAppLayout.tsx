'use client';

import React, { useState } from 'react';
import ModernSidebar from './ModernSidebar';
import ModernTopbar from './ModernTopbar';
import MobileTabBar from '@/components/MobileTabBar';
import StreakModal from '@/components/student/StreakModal';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import CommandPalette from '@/components/CommandPalette';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

interface ModernAppLayoutProps {
  children: React.ReactNode;
  user?: any;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
}

export default function ModernAppLayout({
  children,
  user,
  unreadCount = 0,
  onNotificationsClick,
  onLogout,
  theme = 'dark',
}: ModernAppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const { logout } = useAuthStore();

  const handleLogout = onLogout || logout;
  const isLight = theme === 'light';

  return (
    <div
      className={cn(
        'min-h-screen w-full transition-colors duration-300',
        isLight
          ? 'bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-500/20 selection:text-blue-700'
          : 'bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300'
      )}
    >
      <CosmeticTheme />

      {/* Dynamic Atmospheric Glow Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isLight ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.05),transparent_70%)]" />
            <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.035),transparent_70%)]" />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_70%)]" />
            <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.05),transparent_70%)]" />
            <div className="absolute bottom-0 right-0 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.05),transparent_70%)]" />
          </>
        )}
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Modern Sidebar */}
        <ModernSidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          user={user}
          onLogout={handleLogout}
          theme={theme}
        />

        {/* Main Content Column */}
        <div className="flex flex-1 flex-col min-w-0 lg:pl-64 xl:pl-72 pb-24 sm:pb-8">
          {/* Topbar */}
          <ModernTopbar
            onMenuClick={() => setMobileMenuOpen(true)}
            user={user}
            unreadCount={unreadCount}
            onNotificationsClick={onNotificationsClick}
            onStreakClick={() => setStreakModalOpen(true)}
            onSearchClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
            }}
            theme={theme}
          />

          {/* Page Main Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Floating Mobile Tab Bar on Phones */}
      <MobileTabBar theme={theme} />

      {/* Command Palette */}
      <CommandPalette />

      {/* Streak Modal */}
      {user && (
        <StreakModal
          open={streakModalOpen}
          onOpenChange={setStreakModalOpen}
          user={user}
        />
      )}
    </div>
  );
}
