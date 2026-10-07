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
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-200">
      <CosmeticTheme />

      {/* Modern Minimalist Sidebar (Desktop fixed + Mobile drawer) */}
      <ModernSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="relative flex min-h-screen">
        {/* Main Content Column with generous whitespace */}
        <div className="flex flex-1 flex-col min-w-0 lg:pl-64 pb-20 sm:pb-8">
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
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
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
