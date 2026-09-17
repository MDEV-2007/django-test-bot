'use client';

import React, { useState } from 'react';
import ModernSidebar from './ModernSidebar';
import ModernTopbar from './ModernTopbar';
import MobileTabBar from '@/components/MobileTabBar';
import StreakModal from '@/components/student/StreakModal';
import CosmeticTheme from '@/components/student/CosmeticTheme';
import CommandPalette from '@/components/CommandPalette';
import { useAuthStore } from '@/lib/auth-store';

interface ModernAppLayoutProps {
  children: React.ReactNode;
  user?: any;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onLogout?: () => void;
}

export default function ModernAppLayout({
  children,
  user,
  unreadCount = 0,
  onNotificationsClick,
  onLogout,
}: ModernAppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const { logout } = useAuthStore();

  const handleLogout = onLogout || logout;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      <CosmeticTheme />

      {/* Dynamic Atmospheric Glow Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_70%)]" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.05),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.05),transparent_70%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Modern Glassmorphic Sidebar */}
        <ModernSidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          user={user}
          onLogout={handleLogout}
        />

        {/* Main Content Column */}
        <div className="flex flex-1 flex-col min-w-0 lg:pl-64 xl:pl-72 pb-20 sm:pb-8">
          {/* High-Tech Topbar */}
          <ModernTopbar
            onMenuClick={() => setMobileMenuOpen(true)}
            user={user}
            unreadCount={unreadCount}
            onNotificationsClick={onNotificationsClick}
            onStreakClick={() => setStreakModalOpen(true)}
            onSearchClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
            }}
          />

          {/* Page Main Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Tab Bar on Phones */}
      <MobileTabBar />

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
