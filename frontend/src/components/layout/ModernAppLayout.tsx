'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
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
  /** "pastel" — editorial pastel tema (hozircha faqat Dashboard). */
  variant?: 'default' | 'pastel';
}

export default function ModernAppLayout({
  children,
  user,
  unreadCount = 0,
  onNotificationsClick,
  onLogout,
  variant = 'default',
}: ModernAppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const { logout } = useAuthStore();
  const handleLogout = onLogout || logout;

  return (
    <div
      className={
        variant === 'pastel'
          ? 'theme-pastel min-h-screen w-full text-foreground'
          : 'min-h-screen w-full bg-background text-foreground transition-colors duration-200'
      }
    >
      <CosmeticTheme />

      {/* Minimalist Sidebar (Desktop fixed + Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="relative flex min-h-[var(--tg-viewport,100dvh)]">
        {/* Main Content Column with safe-area bottom spacing for MobileTabBar */}
        <div className="flex flex-1 flex-col min-w-0 lg:pl-64 pb-32 sm:pb-28 md:pb-12">
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
          />

          {/* Page Main Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Floating Mobile Tab Bar on Phones (hidden when mobile drawer is open) */}
      {!mobileMenuOpen && <MobileTabBar />}

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
