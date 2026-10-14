/**
 * Top Navigation Bar — Enterprise Grade
 * Redesigned for spaciousness, premium neumorphic balance, and professional alignment.
 * 
 * Layout:
 * [LEFT: Brand & Subtitle] — [CENTER: Spacious Navigation Tabs] — [RIGHT: Primary Action, Status & Profile]
 */

import React, { useState } from 'react';
import {
  Tv,
  Plus,
  ListTodo,
  CheckCircle2,
  Clock,
  Award,
  BarChart3,
  Settings,
  UserCheck,
  Maximize2,
  Minimize2,
  Menu,
  X,
  ChevronDown,
  Building2,
  ShieldCheck,
  Send,
  Inbox,
  Share2
} from 'lucide-react';
import { Employee } from '../types';
import { isAppsScriptConfigured } from '../config';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: Employee;
  onOpenCreateTask: () => void;
  onOpenSettings: () => void;
  onOpenRoleSwitcher: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenExternalPortal?: () => void;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenCreateTask,
  onOpenSettings,
  onOpenRoleSwitcher,
  onToggleFullscreen,
  isFullscreen,
  onOpenExternalPortal,
  pendingCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLiveConnected = isAppsScriptConfigured();

  const navItems = [
    { id: 'live-board', label: 'Live Board', icon: Tv },
    { id: 'all-tasks', label: 'Tasks', icon: ListTodo, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'completed', label: 'Completed', icon: CheckCircle2 },
    { id: 'extensions', label: 'Extensions', icon: Clock },
    { id: 'scorecard', label: 'Scorecard', icon: Award },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#E9EDF3]/95 backdrop-blur-md border-b border-[#CAD2DE]/60 min-h-[76px] flex flex-col justify-center transition-all">
      {/* Main Navbar Row */}
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5 flex items-center justify-between gap-4 lg:gap-8">
        
        {/* =========================================================================
            SECTION 1: LEFT — BRAND
           ========================================================================= */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => handleNavClick('live-board')}
            className="flex items-center gap-3 text-left focus:outline-none group transition-all"
            title="ALFA INTERCONTINENTAL LIMITED - Accounts Task System"
          >
            {/* Logo Badge */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl neu-raised flex items-center justify-center text-[#4169E1] group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#4169E1]" />
            </div>

            {/* Brand Typography */}
            <div className="flex flex-col justify-center">
              <span className="text-[13px] sm:text-[14px] md:text-[15px] xl:text-[15px] font-bold tracking-tight text-[#202A38] leading-tight whitespace-nowrap group-hover:text-[#4169E1] transition-colors">
                ALFA INTERCONTINENTAL LIMITED
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#667085] tracking-wide leading-tight whitespace-nowrap mt-0.5">
                Accounts Task System
              </span>
            </div>
          </button>
        </div>

        {/* =========================================================================
            SECTION 2: CENTER — NAVIGATION (Desktop & Large Screens)
           ========================================================================= */}
        <nav className="hidden xl:flex items-center justify-center gap-1.5 p-1.5 neu-inset-sm rounded-2xl">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`h-10 px-4 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 select-none ${
                  isActive
                    ? 'neu-raised text-[#4169E1] font-bold shadow-sm'
                    : 'text-[#667085] hover:text-[#202A38] hover:bg-white/40'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#4169E1]' : 'text-[#667085]'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D88A16] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* =========================================================================
            SECTION 3: RIGHT — ACTIONS & PROFILE
           ========================================================================= */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Department Intake Portal Action */}
          {onOpenExternalPortal && (
            <button
              onClick={onOpenExternalPortal}
              className="neu-btn h-10 px-3 sm:px-3.5 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap text-[#4169E1] hover:text-[#3658C7] transition-all shrink-0"
              title="Open External Department Task Request Portal (Sales, Purchase, Store, etc.)"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Dept Portal</span>
              <span className="lg:hidden">Portal</span>
            </button>
          )}

          {/* Primary Action: Create Task Button */}
          <button
            onClick={onOpenCreateTask}
            className="neu-btn-primary h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            title="Create New Accounts Task (Internal)"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Create Task</span>
            <span className="sm:hidden">New</span>
          </button>

          {/* Fullscreen TV Mode Toggle (Desktop & TV monitors) */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="h-10 w-10 rounded-xl neu-btn hidden sm:flex items-center justify-center text-[#667085] hover:text-[#202A38] transition-colors shrink-0"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Large Screen TV Monitor Mode'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Google Sheets / Demo Mode Connection Status */}
          <button
            onClick={onOpenSettings}
            className={`h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all shrink-0 ${
              isLiveConnected
                ? 'neu-raised text-[#16845B] hover:shadow-md'
                : 'neu-raised text-[#D88A16] hover:shadow-md'
            }`}
            title="Configure Google Apps Script & Sheets Integration"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isLiveConnected ? 'bg-[#16845B]' : 'bg-[#D88A16]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isLiveConnected ? 'bg-[#16845B]' : 'bg-[#D88A16]'
                }`}
              />
            </span>
            <span className="hidden md:inline font-bold">
              {isLiveConnected ? 'Sheets Live' : 'Demo Mode'}
            </span>
            <Settings className="w-3.5 h-3.5 text-[#667085]" />
          </button>

          {/* Active User Profile & Role Control */}
          <button
            onClick={onOpenRoleSwitcher}
            className="h-10 px-2.5 sm:px-3.5 rounded-xl neu-raised flex items-center gap-2.5 text-xs font-medium text-[#202A38] hover:shadow-md transition-all shrink-0"
            title="Switch Active Employee / Role"
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner"
              style={{ backgroundColor: currentUser.Avatar_Color || '#4169E1' }}
            >
              {currentUser.Employee_Name.charAt(0)}
            </div>

            {/* User Name & Role Pill */}
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-bold text-[13px] text-[#202A38] leading-tight max-w-[120px] truncate">
                {currentUser.Employee_Name}
              </span>
              <span className="text-[10px] font-semibold text-[#667085] leading-tight">
                {currentUser.Role}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-[#667085] shrink-0 hidden sm:block" />
          </button>

          {/* Mobile & Tablet Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10 rounded-xl neu-btn flex xl:hidden items-center justify-center text-[#202A38] hover:text-[#4169E1] transition-colors shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* =========================================================================
          RESPONSIVE MOBILE / TABLET SLIDE-DOWN DRAWER
         ========================================================================= */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#CAD2DE]/50 bg-[#E9EDF3] px-4 sm:px-6 py-4 animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Navigation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`h-11 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      isActive
                        ? 'neu-inset text-[#4169E1] font-bold'
                        : 'neu-raised text-[#667085] hover:text-[#202A38]'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#4169E1]' : 'text-[#667085]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Footer Utilities */}
            <div className="pt-2 border-t border-[#CAD2DE]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#667085]">
                <ShieldCheck className="w-4 h-4 text-[#4169E1]" />
                <span>
                  Logged in: <b className="text-[#202A38]">{currentUser.Employee_Name}</b> ({currentUser.Role})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRoleSwitcher();
                  }}
                  className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4169E1]"
                >
                  Switch Role
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#667085]"
                >
                  Configure Sheets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
