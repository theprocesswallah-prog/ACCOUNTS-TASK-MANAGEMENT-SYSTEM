/**
 * Task Detail Modal Component
 * Displays full task details, attachments, workflow progression actions,
 * completion remarks entry, and task-specific audit trail history.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  History,
  Hourglass,
  ArrowRight,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { Task, Employee, TaskHistory, TaskAttachment, TaskStatus } from '../types';
import { formatISTDateTime, getTimeRemainingText, calculateCompletionPoints } from '../services/pointsEngine';
import { api } from '../services/api';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  onRequestExtension: (task: Task) => void;
  onTaskUpdated: () => void;
  onOpenAssignModal?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUser,
  onRequestExtension,
  onTaskUpdated,
  onOpenAssignModal,
}) => {
  const [historyList, setHistoryList] = useState<TaskHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch history when task opens
  useEffect(() => {
    if (task && isOpen) {
      setIsLoadingHistory(true);
      api
        .getTaskHistory(task.Task_ID)
        .then((hist) => setHistoryList(hist))
        .catch(() => {})
        .finally(() => setIsLoadingHistory(false));
      setIsCompleting(false);
      setCompletionNotes('');
      setActionError('');
      setActionSuccess('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  // Parse attachments
  let parsedAttachments: TaskAttachment[] = [];
  try {
    if (task.Attachment_URLs) {
      parsedAttachments = typeof task.Attachment_URLs === 'string'
        ? JSON.parse(task.Attachment_URLs)
        : task.Attachment_URLs;
    }
  } catch (e) {}

  const remaining = getTimeRemainingText(task.Current_Deadline || task.Original_Deadline);

  // Workflow status progression helper
  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    setIsSubmitting(true);
    setActionError('');
    try {
      const res = await api.updateTaskStatus(
        task.Task_ID,
        newStatus,
        `Status changed to ${newStatus} by ${currentUser.Employee_Name}`,
        currentUser
      );
      if (res.success) {
        setActionSuccess(`Task status changed to ${newStatus}`);
        onTaskUpdated();
        setTimeout(() => setActionSuccess(''), 2000);
      } else {
        setActionError(res.error || 'Failed to update status.');
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete task handler
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionNotes.trim()) {
      setActionError('Please provide brief completion notes or reference voucher numbers.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');
    try {
      const res = await api.completeTask(task.Task_ID, completionNotes.trim(), currentUser);
      if (res.success) {
        setActionSuccess(res.message || 'Task marked as completed!');
        setTimeout(() => {
          onTaskUpdated();
          onClose();
        }, 1000);
      } else {
        setActionError(res.error || 'Failed to complete task.');
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview potential points if completed right now
  const projectedPoints = calculateCompletionPoints(task);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-raised rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-[#4169E1]">
              {task.Task_ID}
            </span>
            <span className="text-[#CAD2DE]">·</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#4169E1]/10 text-[#4169E1]">
              {task.Priority} Priority
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CAD2DE]/40 text-[#202A38]">
              {task.Status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {actionError && (
            <div className="p-3 rounded-xl bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 rounded-xl bg-[#16845B]/10 border border-[#16845B]/20 text-[#16845B] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h1 className="text-xl font-bold text-[#202A38] leading-tight mb-2">
              {task.Task_Title}
            </h1>
            <p className="text-xs text-[#202A38]/80 leading-relaxed whitespace-pre-wrap">
              {task.Task_Description || 'No description provided.'}
            </p>
          </div>

          {/* Key Dates & Assignment Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="neu-inset-sm p-3 rounded-xl">
              <span className="text-[10px] text-[#667085] block font-semibold uppercase">
                Assigned Employee
              </span>
              <span className="font-bold text-[#202A38] mt-0.5 block truncate">
                {task.Assigned_To}
              </span>
              <span className="text-[10px] text-[#667085] truncate block">
                {task.Assigned_To_Email}
              </span>
            </div>

            <div className="neu-inset-sm p-3 rounded-xl">
              <span className="text-[10px] text-[#667085] block font-semibold uppercase">
                Created By
              </span>
              <span className="font-bold text-[#202A38] mt-0.5 block truncate">
                {task.Created_By}
              </span>
              <span className="text-[10px] text-[#667085] truncate block">
                {formatISTDateTime(task.Created_At)}
              </span>
            </div>

            <div className="neu-inset-sm p-3 rounded-xl">
              <span className="text-[10px] text-[#667085] block font-semibold uppercase">
                Start Time
              </span>
              <span className="font-mono font-bold text-[#202A38] mt-0.5 block tabular-nums">
                {task.Start_Date} {task.Start_Time}
              </span>
              <span className="text-[10px] text-[#667085]">
                {task.Task_Type}
              </span>
            </div>

            <div className="neu-inset-sm p-3 rounded-xl">
              <span className="text-[10px] text-[#667085] block font-semibold uppercase">
                Effective Deadline
              </span>
              <span className="font-mono font-bold text-[#202A38] mt-0.5 block tabular-nums">
                {formatISTDateTime(task.Current_Deadline || task.Original_Deadline)}
              </span>
              <span
                className={`text-[10px] font-mono font-bold block ${
                  remaining.isOverdue
                    ? 'text-[#D64545]'
                    : remaining.isDueSoon
                    ? 'text-[#D88A16]'
                    : 'text-[#16845B]'
                }`}
              >
                {remaining.text}
              </span>
            </div>
          </div>

          {/* Extension Status Callout if present */}
          {task.Extension_Status === 'Approved' && (
            <div className="p-3 rounded-xl bg-[#4169E1]/10 border border-[#4169E1]/30 flex items-start gap-2.5 text-xs text-[#4169E1]">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  Extension Approved by {task.Approved_By || 'Manager'}
                </span>
                <span className="text-[11px] block text-[#202A38]">
                  New deadline: {formatISTDateTime(task.Approved_Extension_Deadline)}. Completing on or before this approved deadline will award full 5 points!
                </span>
              </div>
            </div>
          )}

          {task.Extension_Status === 'Requested' && (
            <div className="p-3 rounded-xl bg-[#D88A16]/10 border border-[#D88A16]/30 flex items-start gap-2.5 text-xs text-[#D88A16]">
              <Hourglass className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  Extension Request Pending Approval
                </span>
                <span className="text-[11px] block text-[#202A38]">
                  Currently awaiting Manager / Administrator review. Current effective deadline remains in effect.
                </span>
              </div>
            </div>
          )}

          {/* Completion Info if Completed */}
          {task.Status === 'Completed' && (
            <div className="p-3.5 rounded-xl bg-[#16845B]/10 border border-[#16845B]/20 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#16845B] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Task Completed by {task.Completed_By}
                </span>
                <span className="font-bold text-[#16845B] px-2 py-0.5 rounded bg-white font-mono">
                  +{task.Points_Awarded} Points Awarded
                </span>
              </div>
              <p className="text-[#202A38] text-[11px]">
                <b>Reason:</b> {task.Points_Reason}
              </p>
              {task.Completion_Notes && (
                <p className="text-[#202A38] text-[11px]">
                  <b>Notes:</b> {task.Completion_Notes}
                </p>
              )}
              <p className="text-[#667085] text-[10px] font-mono">
                Completed At: {formatISTDateTime(task.Completed_At)}
              </p>
            </div>
          )}

          {/* Attachments Section */}
          {parsedAttachments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#202A38] uppercase tracking-wider mb-2">
                Attached Documents ({parsedAttachments.length})
              </h3>
              <div className="space-y-1.5">
                {parsedAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="neu-inset-sm rounded-xl p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-[#4169E1] shrink-0" />
                      <span className="font-semibold text-[#202A38] truncate">
                        {att.name}
                      </span>
                      {att.size && (
                        <span className="text-[10px] text-[#667085]">
                          ({Math.round(att.size / 1024)} KB)
                        </span>
                      )}
                    </div>
                    {att.url && att.url !== '#' ? (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4169E1] hover:underline flex items-center gap-1 text-[11px] font-semibold shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#667085]">Attached</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow Status Actions (when not completed) */}
          {task.Status !== 'Completed' && (
            <div className="pt-2 border-t border-[#CAD2DE]/40">
              <h3 className="text-xs font-bold text-[#202A38] uppercase tracking-wider mb-2">
                Task Workflow Actions
              </h3>

              {!isCompleting ? (
                <div className="flex flex-wrap items-center gap-2">
                  {task.Status === 'Pending Assignment' ? (
                    onOpenAssignModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAssignModal(task);
                        }}
                        className="neu-btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md hover:scale-[1.01] transition-transform"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Review & Assign Task to Accounts Officer</span>
                      </button>
                    )
                  ) : (
                    <>
                      {task.Status === 'Assigned' && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleUpdateStatus('Acknowledged')}
                          className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#202A38] hover:text-[#4169E1]"
                        >
                          Acknowledge Task
                        </button>
                      )}

                      {(task.Status === 'Assigned' || task.Status === 'Acknowledged' || task.Status === 'Blocked') && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleUpdateStatus('In Progress')}
                          className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4169E1]"
                        >
                          Start Work (In Progress)
                        </button>
                      )}

                      {task.Status === 'In Progress' && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleUpdateStatus('Blocked')}
                          className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#D64545]"
                        >
                          Report Blocker
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRequestExtension(task)}
                        className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#D88A16] hover:text-[#202A38]"
                      >
                        Request Extension
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCompleting(true)}
                        className="neu-btn-primary px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Task</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Completion remarks entry panel */
                <form
                  onSubmit={handleCompleteSubmit}
                  className="neu-inset-sm p-4 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#16845B] flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Submit Task Completion
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-[#202A38]">
                      Projected: +{projectedPoints.points} pts ({projectedPoints.isOnTime ? 'On Time' : 'Late'})
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-[#202A38] font-semibold block mb-1">
                      Completion Remarks / Voucher References <span className="text-[#D64545]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="e.g. Reconciled 48 purchase invoices in SAP. Difference booked under Round-off GL."
                      className="w-full neu-inset rounded-xl p-2.5 text-xs text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCompleting(false)}
                      className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#667085]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#16845B] hover:bg-[#126b49] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Recording Completion...' : 'Confirm & Complete'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Audit Trail History */}
          <div className="pt-2 border-t border-[#CAD2DE]/40">
            <h3 className="text-xs font-bold text-[#202A38] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#667085]" />
              Audit Trail History
            </h3>

            {isLoadingHistory ? (
              <p className="text-xs text-[#667085]">Loading audit trail...</p>
            ) : historyList.length > 0 ? (
              <div className="space-y-2">
                {historyList.map((hist) => (
                  <div
                    key={hist.History_ID}
                    className="neu-raised-sm rounded-xl p-2.5 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#202A38]">
                        {hist.Action}
                      </span>
                      <span className="text-[#667085] font-mono text-[10px]">
                        {formatISTDateTime(hist.Timestamp)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#667085]">
                      By <span className="font-medium text-[#202A38]">{hist.Performed_By}</span>
                    </div>
                    {hist.Remarks && (
                      <p className="text-[11px] text-[#202A38]/90 italic">
                        "{hist.Remarks}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#667085]">
                No prior history recorded for this task.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
