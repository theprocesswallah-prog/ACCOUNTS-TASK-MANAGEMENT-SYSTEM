/**
 * Accounts Task Management System — Main Application
 * Industrial Manufacturing Plant Accounts Department
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tv,
  ListTodo,
  CheckCircle2,
  Clock,
  Award,
  BarChart3,
  Plus,
  RefreshCw,
  Settings,
  UserCheck
} from 'lucide-react';
import { Header } from './components/Header';
import { LiveTaskBoard } from './components/LiveTaskBoard';
import { TaskListView } from './components/TaskListView';
import { ScorecardView } from './components/ScorecardView';
import { ExtensionsView } from './components/ExtensionsView';
import { ReportsView } from './components/ReportsView';
import { TaskCreationModal } from './components/TaskCreationModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { ExtensionModal } from './components/ExtensionModal';
import { ExtensionReviewModal } from './components/ExtensionReviewModal';
import { AppsScriptSetupModal } from './components/AppsScriptSetupModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { TaskAssignmentModal } from './components/TaskAssignmentModal';
import { ExternalTaskSubmissionForm } from './components/ExternalTaskSubmissionForm';
import { Task, Employee, ExtensionRequest, EmployeeScorecard } from './types';
import { api, getActiveUser, setActiveUser } from './services/api';
import { APP_CONFIG, isAppsScriptConfigured } from './config';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('live-board');
  const [currentUser, setCurrentUserState] = useState<Employee>(getActiveUser());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [scorecards, setScorecards] = useState<EmployeeScorecard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Check if opened directly via external department URL (/task-request, #/task-request, ?portal=submit)
  const isExternalUrl = useCallback((): boolean => {
    try {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      return (
        params.get('portal') === 'submit' ||
        params.get('portal') === 'external' ||
        params.get('form') === 'external' ||
        params.get('tab') === 'task-request' ||
        path.endsWith('/task-request') ||
        path.endsWith('/task-request/') ||
        path.includes('/task-request') ||
        hash === '#/submit' ||
        hash === '#/task-request' ||
        hash === '#task-request'
      );
    } catch (e) {
      return false;
    }
  }, []);

  const [isStandalonePortal, setIsStandalonePortal] = useState<boolean>(isExternalUrl);

  // Sync portal mode if URL or hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      setIsStandalonePortal(isExternalUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [isExternalUrl]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [extensionTargetTask, setExtensionTargetTask] = useState<Task | null>(null);
  const [isExtensionRequestOpen, setIsExtensionRequestOpen] = useState(false);
  const [reviewTargetExtension, setReviewTargetExtension] = useState<ExtensionRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignTargetTask, setAssignTargetTask] = useState<Task | null>(null);

  // Full-screen state for office monitor
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fetch all core data from API (Google Sheets or Local Store)
  const refreshData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [allTasks, emps, extList, scList] = await Promise.all([
        api.getAllTasks(),
        api.getEmployees(),
        api.getExtensionRequests(),
        api.getScorecards(),
      ]);

      setTasks(allTasks);
      setEmployees(emps);
      setExtensions(extList);
      setScorecards(scList);
      setLastUpdated(new Date());

      // If selectedTask is open, update its reference
      if (selectedTask) {
        const updatedSelected = allTasks.find((t) => t.Task_ID === selectedTask.Task_ID);
        if (updatedSelected) setSelectedTask(updatedSelected);
      }
    } catch (e) {
      console.error('Failed to load accounts task data', e);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [selectedTask]);

  // Initial load
  useEffect(() => {
    refreshData(false);
  }, []);

  // Auto-refresh interval (Section 7: 15–30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      refreshData(true);
    }, APP_CONFIG.BOARD_AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshData]);

  // Switch Active User
  const handleSelectUser = (user: Employee) => {
    setCurrentUserState(user);
    setActiveUser(user);
  };

  // Open Task Details
  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  // Open Request Extension
  const handleOpenExtensionRequest = (task: Task) => {
    setExtensionTargetTask(task);
    setIsExtensionRequestOpen(true);
  };

  // Open Complete Task (opens details with completion form)
  const handleOpenCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  // Open Extension Review
  const handleOpenExtensionReview = (request: ExtensionRequest) => {
    setReviewTargetExtension(request);
    setIsReviewOpen(true);
  };

  // Open Task Assignment Modal
  const handleOpenAssignTask = (task: Task) => {
    setAssignTargetTask(task);
    setIsAssignOpen(true);
  };

  // Count incoming tasks awaiting Accounts assignment
  const pendingCount = tasks.filter((t) => t.Status === 'Pending Assignment').length;

  // CASE A: External Direct Link (/task-request, ?portal=external, ?portal=submit, etc.)
  // Restricted intake mode: No dashboard buttons, no internal links, no redirection to internal app.
  if (isStandalonePortal) {
    return (
      <ExternalTaskSubmissionForm
        isInternalOrigin={false}
      />
    );
  }

  // CASE B: Opened from inside the internal Accounts Dashboard (via Dept Portal action)
  // Internal session: Allows returning to Accounts Dashboard.
  if (currentTab === 'external-portal') {
    return (
      <ExternalTaskSubmissionForm
        isInternalOrigin={true}
        onBackToDashboard={() => {
          setCurrentTab('live-board');
          refreshData(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#E9EDF3] text-[#202A38] flex flex-col font-sans pb-20 md:pb-8">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenCreateTask={() => setIsCreateOpen(true)}
        onOpenSettings={() => setIsSetupOpen(true)}
        onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onOpenExternalPortal={() => setCurrentTab('external-portal')}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {currentTab === 'live-board' && (
          <LiveTaskBoard
            tasks={tasks}
            employees={employees}
            isLoading={isLoading}
            lastUpdated={lastUpdated}
            onRefresh={() => refreshData(false)}
            onViewDetails={handleViewDetails}
            onRequestExtension={handleOpenExtensionRequest}
            onCompleteTask={handleOpenCompleteTask}
            onOpenCreateTask={() => setIsCreateOpen(true)}
            onAssignTask={handleOpenAssignTask}
          />
        )}

        {currentTab === 'all-tasks' && (
          <TaskListView
            tasks={tasks}
            employees={employees}
            currentUser={currentUser}
            defaultFilterTab="all"
            onViewDetails={handleViewDetails}
            onRequestExtension={handleOpenExtensionRequest}
            onCompleteTask={handleOpenCompleteTask}
            onOpenCreateTask={() => setIsCreateOpen(true)}
            onAssignTask={handleOpenAssignTask}
          />
        )}

        {currentTab === 'completed' && (
          <TaskListView
            tasks={tasks}
            employees={employees}
            currentUser={currentUser}
            defaultFilterTab="completed"
            onViewDetails={handleViewDetails}
            onRequestExtension={handleOpenExtensionRequest}
            onCompleteTask={handleOpenCompleteTask}
            onOpenCreateTask={() => setIsCreateOpen(true)}
            onAssignTask={handleOpenAssignTask}
          />
        )}

        {currentTab === 'extensions' && (
          <ExtensionsView
            extensions={extensions}
            currentUser={currentUser}
            onOpenReview={handleOpenExtensionReview}
            onRefresh={() => refreshData(false)}
          />
        )}

        {currentTab === 'scorecard' && (
          <ScorecardView
            scorecards={scorecards}
            currentUser={currentUser}
            onRefresh={() => refreshData(false)}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView tasks={tasks} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#E9EDF3]/95 backdrop-blur-md border-t border-[#CAD2DE]/50 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setCurrentTab('live-board')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            currentTab === 'live-board' ? 'text-[#4169E1]' : 'text-[#667085]'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Live Board</span>
        </button>

        <button
          onClick={() => setCurrentTab('all-tasks')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            currentTab === 'all-tasks' ? 'text-[#4169E1]' : 'text-[#667085]'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Tasks</span>
        </button>

        {/* Floating Mobile Create Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="neu-btn-primary -mt-6 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
          title="Create Task"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentTab('extensions')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            currentTab === 'extensions' ? 'text-[#4169E1]' : 'text-[#667085]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Extensions</span>
        </button>

        <button
          onClick={() => setCurrentTab('scorecard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            currentTab === 'scorecard' ? 'text-[#4169E1]' : 'text-[#667085]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Scorecard</span>
        </button>
      </div>

      {/* Modals */}
      <TaskCreationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTaskCreated={() => refreshData(false)}
        currentUser={currentUser}
        employees={employees}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        currentUser={currentUser}
        onRequestExtension={(t) => {
          setIsDetailOpen(false);
          handleOpenExtensionRequest(t);
        }}
        onTaskUpdated={() => refreshData(false)}
        onOpenAssignModal={(t) => {
          setIsDetailOpen(false);
          handleOpenAssignTask(t);
        }}
      />

      <TaskAssignmentModal
        isOpen={isAssignOpen}
        task={assignTargetTask}
        onClose={() => {
          setIsAssignOpen(false);
          setAssignTargetTask(null);
        }}
        currentUser={currentUser}
        employees={employees}
        onAssignmentCompleted={() => refreshData(false)}
      />

      <ExtensionModal
        task={extensionTargetTask}
        isOpen={isExtensionRequestOpen}
        onClose={() => {
          setIsExtensionRequestOpen(false);
          setExtensionTargetTask(null);
        }}
        currentUser={currentUser}
        onRequestSubmitted={() => refreshData(false)}
      />

      <ExtensionReviewModal
        request={reviewTargetExtension}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setReviewTargetExtension(null);
        }}
        currentUser={currentUser}
        onReviewCompleted={() => refreshData(false)}
      />

      <AppsScriptSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigChanged={() => refreshData(false)}
      />

      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
        employees={employees}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
