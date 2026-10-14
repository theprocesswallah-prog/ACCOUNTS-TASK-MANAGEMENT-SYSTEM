/**
 * Live Task Board Component — Large Screen Monitor & Office TV Mode
 * Displays ACTIVE tasks only. Completed tasks immediately disappear from the active view.
 * Includes auto-refresh (every 20s), live IST clock, KPI summary strip,
 * filter preservation, and fullscreen toggle.
 */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Hourglass,
  CheckCircle2,
  Tv,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles
} from 'lucide-react';
import { Task, Employee, Priority } from '../types';
import { TaskCard } from './TaskCard';
import { getTimeRemainingText, formatISTDateTime } from '../services/pointsEngine';
import { APP_CONFIG } from '../config';

interface LiveTaskBoardProps {
  tasks: Task[];
  employees: Employee[];
  isLoading: boolean;
  lastUpdated: Date;
  onRefresh: () => void;
  onViewDetails: (task: Task) => void;
  onRequestExtension: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onOpenCreateTask: () => void;
  onAssignTask?: (task: Task) => void;
}

export const LiveTaskBoard: React.FC<LiveTaskBoardProps> = ({
  tasks,
  employees,
  isLoading,
  lastUpdated,
  onRefresh,
  onViewDetails,
  onRequestExtension,
  onCompleteTask,
  onOpenCreateTask,
  onAssignTask,
}) => {
  // Live IST Clock State
  const [istTimeStr, setIstTimeStr] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('All');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Update IST clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setIstTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Filter ONLY active tasks (no completed, no cancelled)
  const activeTasks = tasks.filter((t) => {
    if (t.Status === 'Completed' || t.Status === 'Cancelled' || t.Is_Archived) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = t.Task_ID.toLowerCase().includes(q);
      const matchTitle = t.Task_Title.toLowerCase().includes(q);
      const matchDesc = (t.Task_Description || '').toLowerCase().includes(q);
      const matchAssignee = t.Assigned_To.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchDesc && !matchAssignee) return false;
    }

    if (selectedPriority !== 'All' && t.Priority !== selectedPriority) {
      return false;
    }

    if (selectedEmployee !== 'All' && t.Assigned_To !== selectedEmployee) {
      return false;
    }

    return true;
  });

  // Calculate live counts
  let overdueCount = 0;
  let dueSoonCount = 0;
  let extRequestedCount = 0;
  let pendingAssignmentCount = 0;

  activeTasks.forEach((t) => {
    if (t.Status === 'Pending Assignment') pendingAssignmentCount++;
    const rem = getTimeRemainingText(t.Current_Deadline || t.Original_Deadline);
    if (rem.isOverdue) overdueCount++;
    else if (rem.isDueSoon) dueSoonCount++;
    if (t.Extension_Status === 'Requested') extRequestedCount++;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar for Large Monitor: Department Info, IST Live Clock, Auto-Refresh Status, Controls */}
      <div className="neu-raised rounded-2xl p-4 lg:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Department & IST Clock */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center text-[#4169E1]">
              <Tv className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#202A38] leading-tight">
                  Active Task Board
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16845B]/10 text-[#16845B]">
                  LIVE IST
                </span>
              </div>
              <div className="font-mono text-xs font-semibold text-[#667085] tabular-nums mt-0.5">
                {istTimeStr || 'Loading IST...'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live Quick Summary Badges */}
        <div className="grid grid-cols-5 gap-2 w-full md:w-auto">
          <div className="neu-inset-sm px-2.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-[#667085] block uppercase">
              Active
            </span>
            <span className="font-mono text-base font-bold text-[#4169E1] tabular-nums">
              {activeTasks.length}
            </span>
          </div>

          <div className="neu-inset-sm px-2.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-[#667085] block uppercase">
              Incoming
            </span>
            <span className={`font-mono text-base font-bold tabular-nums ${pendingAssignmentCount > 0 ? 'text-[#D88A16]' : 'text-[#667085]'}`}>
              {pendingAssignmentCount}
            </span>
          </div>

          <div className="neu-inset-sm px-2.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-[#667085] block uppercase">
              Due Soon
            </span>
            <span className="font-mono text-base font-bold text-[#D88A16] tabular-nums">
              {dueSoonCount}
            </span>
          </div>

          <div className="neu-inset-sm px-2.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-[#667085] block uppercase">
              Overdue
            </span>
            <span className="font-mono text-base font-bold text-[#D64545] tabular-nums">
              {overdueCount}
            </span>
          </div>

          <div className="neu-inset-sm px-2.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-[#667085] block uppercase">
              Ext Req
            </span>
            <span className="font-mono text-base font-bold text-[#D88A16] tabular-nums">
              {extRequestedCount}
            </span>
          </div>
        </div>

        {/* Right: Actions (Refresh, Fullscreen) */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <span className="text-[11px] text-[#667085] hidden xl:inline font-mono">
            Updated: {lastUpdated.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="neu-btn px-3 py-2 rounded-xl text-xs font-semibold text-[#202A38] flex items-center gap-1.5 hover:text-[#4169E1]"
            title="Manual refresh from Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#4169E1]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="neu-btn p-2 rounded-xl text-xs font-semibold text-[#202A38] hover:text-[#4169E1]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Large Screen TV Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="neu-raised rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Task ID, title, or employee..."
            className="w-full neu-inset rounded-xl px-9 py-2 text-xs font-medium text-[#202A38] placeholder-[#667085] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
          />
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-[#667085] hover:text-[#202A38]"
            >
              ×
            </button>
          )}
        </div>

        {/* Priority & Assignee Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#667085] font-semibold whitespace-nowrap hidden md:inline">
              Priority:
            </span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="neu-inset-sm text-xs font-medium text-[#202A38] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#667085] font-semibold whitespace-nowrap hidden md:inline">
              Assignee:
            </span>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="neu-inset-sm text-xs font-medium text-[#202A38] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
            >
              <option value="All">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.Employee_ID} value={emp.Employee_Name}>
                  {emp.Employee_Name}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || selectedPriority !== 'All' || selectedEmployee !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedPriority('All');
                setSelectedEmployee('All');
              }}
              className="text-xs text-[#4169E1] font-semibold hover:underline whitespace-nowrap px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Incoming Department Requests Notice Banner if any */}
      {pendingAssignmentCount > 0 && (
        <div className="neu-flat p-4 rounded-2xl border-l-4 border-l-[#D88A16] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#D88A16]/5">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D88A16] animate-ping shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm text-[#202A38]">
                {pendingAssignmentCount} Incoming Inter-Department Request{pendingAssignmentCount > 1 ? 's' : ''} Awaiting Review
              </span>
              <p className="text-[11px] text-[#667085]">
                New tasks submitted from Sales, Purchase, Store, etc. Require Accounts Manager assignment.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#D88A16] shrink-0">
            Click &quot;Review &amp; Assign&quot; on task cards below
          </span>
        </div>
      )}

      {/* Active Tasks Grid */}
      {activeTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {activeTasks.map((task) => (
            <TaskCard
              key={task.Task_ID}
              task={task}
              onViewDetails={onViewDetails}
              onRequestExtension={onRequestExtension}
              onCompleteTask={onCompleteTask}
              onAssignTask={onAssignTask}
              isLargeScreen={isFullscreen}
            />
          ))}
        </div>
      ) : (
        <div className="neu-raised rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl neu-inset mx-auto flex items-center justify-center text-[#16845B] mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#202A38] mb-1">
            All Caught Up!
          </h2>
          <p className="text-xs text-[#667085] mb-5 leading-relaxed">
            There are no active pending tasks matching your current filters. Completed tasks are safely archived in Google Sheets and visible in the Completed tab.
          </p>
          <button
            onClick={onOpenCreateTask}
            className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            Create New Task
          </button>
        </div>
      )}
    </div>
  );
};
