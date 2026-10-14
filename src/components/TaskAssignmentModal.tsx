/**
 * Task Assignment Modal Component
 * Allows Accounts Manager or Administrator to review an incoming department task request,
 * configure official parameters, and assign it to an Accounts employee.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  Check,
  XCircle,
  Building2,
  Mail,
  Phone,
  Hash,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Task, Employee, Priority, TaskType, TaskAttachment } from '../types';
import { api } from '../services/api';
import {
  getISTCurrentDateStr,
  getISTCurrentTimeStr,
  formatISTDate,
  formatISTTime12Hr
} from '../services/pointsEngine';

interface TaskAssignmentModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  employees: Employee[];
  onAssignmentCompleted: () => void;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUser,
  employees,
  onAssignmentCompleted,
}) => {
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [taskType, setTaskType] = useState<TaskType>('Regular Task');
  const [startDate, setStartDate] = useState(getISTCurrentDateStr());
  const [startTime, setStartTime] = useState(getISTCurrentTimeStr());
  const [deadlineDate, setDeadlineDate] = useState(getISTCurrentDateStr());
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [durationHours, setDurationHours] = useState<number>(4);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  
  // Rejection/Cancellation sub-flow
  const [isRejecting, setIsRejecting] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill form when task changes
  useEffect(() => {
    if (task) {
      // Pick first accounts employee by default or current user
      const defaultEmp = employees.find(e => e.Role === 'Employee')?.Employee_Name || employees[0]?.Employee_Name || currentUser.Employee_Name;
      setAssignedEmployee(task.Assigned_To && task.Assigned_To !== 'Unassigned' ? task.Assigned_To : defaultEmp);
      setPriority(task.Requested_Priority || task.Priority || 'Medium');
      setTaskType(task.Task_Type || 'Regular Task');
      setStartDate(getISTCurrentDateStr());
      setStartTime(getISTCurrentTimeStr());

      if (task.Deadline_Date) {
        setDeadlineDate(task.Deadline_Date);
        setDeadlineTime(task.Deadline_Time || '18:00');
      } else {
        setDeadlineDate(getISTCurrentDateStr());
        setDeadlineTime('18:00');
      }

      setAssignmentNotes(task.Assignment_Notes || '');
      setIsRejecting(false);
      setCancelReason('');
      setErrorMessage('');
    }
  }, [task, isOpen, employees, currentUser]);

  if (!isOpen || !task) return null;

  // Parse attachments
  let attachmentsList: TaskAttachment[] = [];
  try {
    if (typeof task.Attachment_URLs === 'string') {
      attachmentsList = JSON.parse(task.Attachment_URLs);
    } else if (Array.isArray(task.Attachment_URLs)) {
      attachmentsList = task.Attachment_URLs;
    }
  } catch (e) {
    attachmentsList = [];
  }

  // Handle Assignment Submission
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!assignedEmployee) {
      setErrorMessage('Please select an Accounts employee to assign this task.');
      return;
    }

    const assignedEmpObj = employees.find(e => e.Employee_Name === assignedEmployee);

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.assignTask(
        {
          Task_ID: task.Task_ID,
          Assigned_To: assignedEmployee,
          Assigned_To_Email: assignedEmpObj?.Email || '',
          Priority: priority,
          Task_Type: taskType,
          Start_Date: startDate,
          Start_Time: startTime,
          Deadline_Date: deadlineDate,
          Deadline_Time: deadlineTime,
          Is_Hourly_Task: taskType === 'Hourly Task',
          Estimated_Duration_Hours: taskType === 'Hourly Task' ? durationHours : 0,
          Assignment_Notes: assignmentNotes.trim(),
        },
        currentUser
      );

      if (res.success) {
        onAssignmentCompleted();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to assign task.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while assigning task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancellation / Rejection
  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      setErrorMessage('Please specify the cancellation or rejection reason.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.cancelTask(task.Task_ID, cancelReason.trim(), currentUser);
      if (res.success) {
        onAssignmentCompleted();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to cancel task.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while cancelling task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202A38]/60 backdrop-blur-sm overflow-y-auto">
      <div className="neu-flat w-full max-w-3xl rounded-3xl p-6 sm:p-8 my-8 max-h-[92vh] flex flex-col shadow-2xl border border-white/40">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#CAD2DE]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-raised flex items-center justify-center text-[#4169E1]">
              <UserCheck className="w-5 h-5 text-[#4169E1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#4169E1] px-2 py-0.5 rounded-md neu-inset-sm">
                  {task.Task_ID}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#D88A16]/15 text-[#D88A16] border border-[#D88A16]/30">
                  {task.Status}
                </span>
                {task.Request_Source === 'External' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#4169E1]/15 text-[#4169E1]">
                    Dept: {task.Requesting_Department || 'External'}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#202A38] mt-1">
                Review & Assign Incoming Task
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#C93B2B]/10 border border-[#C93B2B]/30 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#C93B2B] shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-[#C93B2B]">{errorMessage}</span>
            </div>
          )}

          {/* Incoming Request Details Card */}
          <div className="neu-inset p-4 sm:p-5 rounded-2xl border border-[#CAD2DE]/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CAD2DE]/40 pb-2.5 text-xs">
              <div className="flex items-center gap-2 text-[#465366]">
                <Building2 className="w-4 h-4 text-[#4169E1]" />
                <span className="font-bold text-[#202A38]">
                  {task.Requesting_Department || 'External'} Department
                </span>
                {task.Requester_Name && (
                  <span>
                    • Requester: <strong className="text-[#202A38]">{task.Requester_Name}</strong>
                  </span>
                )}
              </div>

              {task.Reference_Number && (
                <div className="flex items-center gap-1 font-mono text-[11px] bg-white/60 px-2 py-0.5 rounded-md border border-[#CAD2DE]/60">
                  <Hash className="w-3 h-3 text-[#667085]" />
                  <span>Ref: {task.Reference_Number}</span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#202A38] leading-snug">
                {task.Task_Title}
              </h3>
              <p className="text-xs text-[#465366] mt-2 whitespace-pre-wrap leading-relaxed">
                {task.Task_Description}
              </p>
            </div>

            {/* Requester Contact & Requested Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-[#667085] border-t border-[#CAD2DE]/40">
              <div>
                <span className="block font-medium">Contact:</span>
                <span className="font-semibold text-[#202A38]">
                  {task.Requester_Email || task.Created_By_Email || 'N/A'}
                  {task.Requester_Contact ? ` • ${task.Requester_Contact}` : ''}
                </span>
              </div>

              <div>
                <span className="block font-medium">Requested Priority:</span>
                <span className={`font-bold ${
                  task.Requested_Priority === 'Urgent' ? 'text-[#C93B2B]' :
                  task.Requested_Priority === 'High' ? 'text-[#D88A16]' : 'text-[#4169E1]'
                }`}>
                  {task.Requested_Priority || task.Priority}
                </span>
              </div>

              <div>
                <span className="block font-medium">Requested Completion:</span>
                <span className="font-semibold text-[#202A38]">
                  {formatISTDate(task.Deadline_Date)} at {formatISTTime12Hr(task.Deadline_Time)} IST
                </span>
              </div>
            </div>

            {/* Attached Files */}
            {attachmentsList.length > 0 && (
              <div className="pt-2 border-t border-[#CAD2DE]/40">
                <span className="text-[11px] font-bold text-[#667085] block mb-1.5 flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-[#4169E1]" />
                  <span>Attached Documents ({attachmentsList.length}):</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {attachmentsList.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="neu-btn px-2.5 py-1 rounded-lg text-xs font-medium text-[#4169E1] flex items-center gap-1.5 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{att.name}</span>
                      <ExternalLink className="w-3 h-3 text-[#667085]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Toggle between Assignment Form and Cancellation Form */}
          {!isRejecting ? (
            <form id="assign-task-form" onSubmit={handleAssignSubmit} className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
                  <span>Assign Accounts Officer & Configure Official Terms</span>
                </h4>

                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="text-xs font-semibold text-[#C93B2B] hover:underline flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject / Cancel Request</span>
                </button>
              </div>

              {/* Assign To Employee Selector */}
              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                  Assign To Accounts Employee <span className="text-[#C93B2B]">*</span>
                </label>
                <div className="neu-inset rounded-xl px-3 py-1 flex items-center">
                  <select
                    value={assignedEmployee}
                    onChange={(e) => setAssignedEmployee(e.target.value)}
                    required
                    className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select an Accounts Team Member</option>
                    {employees.map((emp) => (
                      <option key={emp.Employee_ID} value={emp.Employee_Name}>
                        {emp.Employee_Name} ({emp.Role}) — {emp.Email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & Task Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Official Priority Level
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-1 flex items-center">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] py-2 focus:outline-none"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Task Type
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-1 flex items-center">
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as TaskType)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] py-2 focus:outline-none"
                    >
                      <option value="Regular Task">Regular Task</option>
                      <option value="Hourly Task">Hourly Task</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Official Start Date & Time (auto-populated with IST) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5 flex items-center justify-between">
                    <span>Official Start Date</span>
                    <span className="text-[10px] text-[#4169E1] font-semibold">IST Auto-set</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#667085]" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5 flex items-center justify-between">
                    <span>Official Start Time</span>
                    <span className="text-[10px] text-[#4169E1] font-semibold">IST Auto-set</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#667085]" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Official Deadline Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Official Completion Deadline Date <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#667085]" />
                    <input
                      type="date"
                      required
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Official Completion Deadline Time <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#667085]" />
                    <input
                      type="time"
                      required
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Manager Assignment Notes */}
              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                  Manager Instructions & Notes for Assignee <span className="text-[10px] text-[#667085] font-normal">(Optional)</span>
                </label>
                <div className="neu-inset rounded-xl p-3">
                  <textarea
                    rows={2}
                    placeholder="e.g. Cross-verify party ledger balance before approving the dispatch clearance. Priority is high."
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* Cancellation / Rejection Form */
            <div className="neu-raised p-5 rounded-2xl border border-[#C93B2B]/30 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#C93B2B] flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span>Reject / Cancel This Department Request</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="text-xs font-semibold text-[#4169E1] hover:underline"
                >
                  Return to Assignment
                </button>
              </div>

              <p className="text-xs text-[#667085]">
                Rejecting this request will mark the task as <strong>Cancelled</strong> and record your rationale into the immutable audit trail.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                  Reason for Cancellation / Rejection <span className="text-[#C93B2B]">*</span>
                </label>
                <div className="neu-inset rounded-xl p-3">
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Incomplete documentation provided. Missing signed purchase order from customer."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancelSubmit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#C93B2B] hover:bg-[#A82B1D] transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Request Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!isRejecting && (
          <div className="pt-4 border-t border-[#CAD2DE]/60 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="neu-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-[#667085] hover:text-[#202A38]"
            >
              Close
            </button>

            <button
              type="submit"
              form="assign-task-form"
              disabled={isSubmitting}
              className="neu-btn-primary px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Assignment & Publish to Live Board</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
