/**
 * Reports and Audit Trail View Component
 * Department-level analytics, task volume by priority, hourly vs regular ratio,
 * and immutable system audit log from TASK_HISTORY.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { Task, TaskHistory } from '../types';
import { formatISTDateTime } from '../services/pointsEngine';
import { api } from '../services/api';

interface ReportsViewProps {
  tasks: Task[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks }) => {
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    setIsLoadingHistory(true);
    api
      .getTaskHistory()
      .then((h) => setHistory(h))
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, []);

  // Compute departmental metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.Status === 'Completed').length;
  const activeTasks = tasks.filter((t) => t.Status !== 'Completed' && t.Status !== 'Cancelled').length;
  const hourlyTasks = tasks.filter((t) => t.Task_Type === 'Hourly Task').length;
  const regularTasks = totalTasks - hourlyTasks;

  const urgentTasks = tasks.filter((t) => t.Priority === 'Urgent').length;
  const highTasks = tasks.filter((t) => t.Priority === 'High').length;
  const mediumTasks = tasks.filter((t) => t.Priority === 'Medium').length;
  const lowTasks = tasks.filter((t) => t.Priority === 'Low').length;

  const onTimeCompleted = tasks.filter((t) => t.Status === 'Completed' && (t.Points_Awarded || 0) > 0).length;
  const deptOnTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

  // Filter history
  const filteredHistory = history.filter((h) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      h.Task_ID.toLowerCase().includes(q) ||
      h.Action.toLowerCase().includes(q) ||
      h.Performed_By.toLowerCase().includes(q) ||
      h.Remarks.toLowerCase().includes(q)
    );
  });

  // Export report to CSV
  const handleExportCSV = () => {
    const csvRows = [];
    csvRows.push([
      'Task_ID',
      'Task_Title',
      'Assigned_To',
      'Priority',
      'Task_Type',
      'Status',
      'Deadline',
      'Completed_At',
      'Points_Awarded',
      'Points_Reason',
    ].join(','));

    tasks.forEach((t) => {
      csvRows.push(
        [
          `"${t.Task_ID}"`,
          `"${t.Task_Title.replace(/"/g, '""')}"`,
          `"${t.Assigned_To}"`,
          `"${t.Priority}"`,
          `"${t.Task_Type}"`,
          `"${t.Status}"`,
          `"${t.Current_Deadline || t.Original_Deadline}"`,
          `"${t.Completed_At || ''}"`,
          `"${t.Points_Awarded ?? ''}"`,
          `"${(t.Points_Reason || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Accounts_Tasks_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="neu-raised rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-[#667085] block">
            Total Work Volume
          </span>
          <div className="font-mono text-2xl font-bold text-[#202A38] mt-1 tabular-nums">
            {totalTasks}
          </div>
          <span className="text-[11px] text-[#667085]">
            {activeTasks} Active · {completedTasks} Completed
          </span>
        </div>

        <div className="neu-raised rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-[#667085] block">
            Department On-Time Rate
          </span>
          <div className="font-mono text-2xl font-bold text-[#16845B] mt-1 tabular-nums">
            {deptOnTimeRate}%
          </div>
          <span className="text-[11px] text-[#667085]">
            {onTimeCompleted} of {completedTasks} on schedule
          </span>
        </div>

        <div className="neu-raised rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-[#667085] block">
            Task Typology
          </span>
          <div className="font-mono text-2xl font-bold text-[#4169E1] mt-1 tabular-nums">
            {hourlyTasks} / {regularTasks}
          </div>
          <span className="text-[11px] text-[#667085]">
            Hourly tasks / Regular tasks
          </span>
        </div>

        <div className="neu-raised rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-[#667085] block">
            Urgent & High Priority
          </span>
          <div className="font-mono text-2xl font-bold text-[#D64545] mt-1 tabular-nums">
            {urgentTasks + highTasks}
          </div>
          <span className="text-[11px] text-[#667085]">
            {urgentTasks} Urgent · {highTasks} High
          </span>
        </div>
      </div>

      {/* Audit Trail Section */}
      <div className="neu-raised rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#CAD2DE]/40">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#4169E1]" />
              <h2 className="text-base font-bold text-[#202A38]">
                Centralized Audit Trail (TASK_HISTORY)
              </h2>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Immutable ledger of task creation, status progressions, extension reviews, and point scores.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full neu-inset rounded-xl px-8 py-1.5 text-xs text-[#202A38] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-2.5" />
            </div>

            <button
              onClick={handleExportCSV}
              className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4169E1] flex items-center gap-1.5 whitespace-nowrap"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#CAD2DE]/30 text-[11px] font-bold text-[#667085] uppercase tracking-wider bg-[#E9EDF3]/40">
                <th className="py-2.5 px-3">History ID</th>
                <th className="py-2.5 px-3">Task ID</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Old State</th>
                <th className="py-2.5 px-3">New State</th>
                <th className="py-2.5 px-3">Performed By</th>
                <th className="py-2.5 px-3">Timestamp (IST)</th>
                <th className="py-2.5 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CAD2DE]/20 text-[#202A38]">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <tr key={h.History_ID} className="hover:bg-white/40">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#4169E1]">
                      {h.History_ID}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {h.Task_ID}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">
                      {h.Action}
                    </td>
                    <td className="py-2.5 px-3 text-[#667085] truncate max-w-[120px]">
                      {h.Old_Value || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#16845B] truncate max-w-[140px]">
                      {h.New_Value}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {h.Performed_By}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#667085] whitespace-nowrap">
                      {formatISTDateTime(h.Timestamp)}
                    </td>
                    <td className="py-2.5 px-4 text-[#667085] italic truncate max-w-[200px]">
                      {h.Remarks || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#667085]">
                    No audit records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
