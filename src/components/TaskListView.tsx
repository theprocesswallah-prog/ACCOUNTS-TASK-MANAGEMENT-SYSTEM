/**
 * Task List View Component
 * Supports multiple filtered views: All Tasks, My Tasks, Created by Me, Completed Tasks,
 * Overdue, Due Today, Due Soon, with full search and multi-criteria filters.
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Task, Employee, Priority, TaskStatus, TaskType } from '../types';
import { TaskCard } from './TaskCard';
import { formatISTDateTime, getTimeRemainingText } from '../services/pointsEngine';

interface TaskListViewProps {
  tasks: Task[];
  employees: Employee[];
  currentUser: Employee;
  defaultFilterTab?: 'all' | 'my-tasks' | 'incoming' | 'created-by-me' | 'completed' | 'overdue' | 'due-today';
  onViewDetails: (task: Task) => void;
  onRequestExtension: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onOpenCreateTask: () => void;
  onAssignTask?: (task: Task) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  employees,
  currentUser,
  defaultFilterTab = 'all',
  onViewDetails,
  onRequestExtension,
  onCompleteTask,
  onOpenCreateTask,
  onAssignTask,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'my-tasks' | 'incoming' | 'created-by-me' | 'completed' | 'overdue' | 'due-today'>(defaultFilterTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('All');

  const incomingCount = tasks.filter(t => t.Status === 'Pending Assignment').length;

  // Filter tasks based on current tab and filters
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((task) => {
    // Sub-tab filtering
    if (activeSubTab === 'incoming') {
      if (task.Status !== 'Pending Assignment') return false;
    } else if (activeSubTab === 'my-tasks') {
      if (task.Assigned_To !== currentUser.Employee_Name) return false;
    } else if (activeSubTab === 'created-by-me') {
      if (task.Created_By !== currentUser.Employee_Name) return false;
    } else if (activeSubTab === 'completed') {
      if (task.Status !== 'Completed') return false;
    } else if (activeSubTab === 'overdue') {
      const rem = getTimeRemainingText(task.Current_Deadline || task.Original_Deadline);
      if (!rem.isOverdue || task.Status === 'Completed') return false;
    } else if (activeSubTab === 'due-today') {
      if (task.Deadline_Date !== todayStr || task.Status === 'Completed') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = task.Task_ID.toLowerCase().includes(q);
      const matchTitle = task.Task_Title.toLowerCase().includes(q);
      const matchDesc = (task.Task_Description || '').toLowerCase().includes(q);
      const matchAssignee = task.Assigned_To.toLowerCase().includes(q);
      const matchCreator = task.Created_By.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchDesc && !matchAssignee && !matchCreator) {
        return false;
      }
    }

    // Select filters
    if (selectedStatus !== 'All' && task.Status !== selectedStatus) return false;
    if (selectedPriority !== 'All' && task.Priority !== selectedPriority) return false;
    if (selectedType !== 'All' && task.Task_Type !== selectedType) return false;
    if (selectedAssignee !== 'All' && task.Assigned_To !== selectedAssignee) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* View Tabs Bar */}
      <div className="neu-raised rounded-2xl p-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'all'
                ? 'neu-inset text-[#4169E1]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            All Tasks ({tasks.length})
          </button>

          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'incoming'
                ? 'neu-inset text-[#D88A16]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            <span>Incoming</span>
            {incomingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D88A16]/20 text-[#D88A16]">
                {incomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('my-tasks')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'my-tasks'
                ? 'neu-inset text-[#4169E1]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            My Tasks
          </button>

          <button
            onClick={() => setActiveSubTab('created-by-me')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'created-by-me'
                ? 'neu-inset text-[#4169E1]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            Created by Me
          </button>

          <button
            onClick={() => setActiveSubTab('due-today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'due-today'
                ? 'neu-inset text-[#4169E1]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            Due Today
          </button>

          <button
            onClick={() => setActiveSubTab('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'overdue'
                ? 'neu-inset text-[#D64545]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            Overdue
          </button>

          <button
            onClick={() => setActiveSubTab('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'completed'
                ? 'neu-inset text-[#16845B]'
                : 'text-[#667085] hover:text-[#202A38]'
            }`}
          >
            Completed Archive
          </button>
        </div>

        <button
          onClick={onOpenCreateTask}
          className="neu-btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="neu-raised rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="w-full lg:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Task ID, title, description, employee..."
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

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {activeSubTab !== 'completed' && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="neu-inset-sm text-xs font-medium text-[#202A38] rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Extension Requested">Extension Requested</option>
              <option value="Completed">Completed</option>
            </select>
          )}

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="neu-inset-sm text-xs font-medium text-[#202A38] rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="neu-inset-sm text-xs font-medium text-[#202A38] rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Task Types</option>
            <option value="Regular Task">Regular Task</option>
            <option value="Hourly Task">Hourly Task</option>
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="neu-inset-sm text-xs font-medium text-[#202A38] rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Assignees</option>
            {employees.map((e) => (
              <option key={e.Employee_ID} value={e.Employee_Name}>
                {e.Employee_Name}
              </option>
            ))}
          </select>

          {(searchQuery || selectedStatus !== 'All' || selectedPriority !== 'All' || selectedType !== 'All' || selectedAssignee !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('All');
                setSelectedPriority('All');
                setSelectedType('All');
                setSelectedAssignee('All');
              }}
              className="text-xs text-[#4169E1] font-semibold hover:underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid or Empty */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.Task_ID}
              task={task}
              onViewDetails={onViewDetails}
              onRequestExtension={onRequestExtension}
              onCompleteTask={onCompleteTask}
              onAssignTask={onAssignTask}
            />
          ))}
        </div>
      ) : (
        <div className="neu-raised rounded-2xl p-12 text-center max-w-md mx-auto">
          <Layers className="w-10 h-10 text-[#667085] mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#202A38] mb-1">
            No Tasks Match Criteria
          </h2>
          <p className="text-xs text-[#667085] mb-4">
            Try adjusting your search query, priority filters, or view tabs.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('All');
              setSelectedPriority('All');
              setSelectedType('All');
              setSelectedAssignee('All');
            }}
            className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-[#4169E1]"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
