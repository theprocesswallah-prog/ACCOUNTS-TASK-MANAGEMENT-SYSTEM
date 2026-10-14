/**
 * Task Creation Modal Component
 * Mobile-friendly form for creating regular or hourly tasks with file attachments,
 * date/time validation, employee assignment, and double-click protection.
 * Automatically populates Start Time with current local India time (Asia/Kolkata).
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  AlertCircle,
  Paperclip,
  Trash2,
  Check,
  UploadCloud,
  FileText,
  Building2,
  Sparkles
} from 'lucide-react';
import { Employee, Priority, TaskType, TaskAttachment } from '../types';
import { api } from '../services/api';
import {
  getISTCurrentDateStr,
  getISTCurrentTimeStr,
  formatISTTime12Hr
} from '../services/pointsEngine';

interface TaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  currentUser: Employee;
  employees: Employee[];
}

export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  currentUser,
  employees,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [taskType, setTaskType] = useState<TaskType>('Regular Task');
  const [startDate, setStartDate] = useState(getISTCurrentDateStr());
  const [startTime, setStartTime] = useState(getISTCurrentTimeStr());
  const [hasUserEditedStartTime, setHasUserEditedStartTime] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(getISTCurrentDateStr());
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [durationHours, setDurationHours] = useState<number>(3);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Helper to compute a sensible default deadline that never precedes start date/time
  const computeInitialDeadline = (sDate: string, sTime: string) => {
    try {
      const [h, m] = sTime.split(':').map(Number);
      // If start time is before 16:30, default deadline to same day at 18:00
      if (h < 16 || (h === 16 && m <= 30)) {
        return { dDate: sDate, dTime: '18:00' };
      }
      // If start time is evening/night, default to next day at 18:00
      const startObj = new Date(`${sDate}T${sTime}:00`);
      const nextDay = new Date(startObj.getTime() + 24 * 3600000);
      const y = nextDay.getFullYear();
      const mo = String(nextDay.getMonth() + 1).padStart(2, '0');
      const da = String(nextDay.getDate()).padStart(2, '0');
      return { dDate: `${y}-${mo}-${da}`, dTime: '18:00' };
    } catch (e) {
      return { dDate: sDate, dTime: '18:00' };
    }
  };

  // Helper to calculate deadline for Hourly tasks (safe local date math)
  const computeHourlyDeadline = (sDate: string, sTime: string, hours: number) => {
    try {
      const startObj = new Date(`${sDate}T${sTime}:00`);
      const endObj = new Date(startObj.getTime() + hours * 3600000);
      const y = endObj.getFullYear();
      const mo = String(endObj.getMonth() + 1).padStart(2, '0');
      const da = String(endObj.getDate()).padStart(2, '0');
      const hStr = String(endObj.getHours()).padStart(2, '0');
      const mStr = String(endObj.getMinutes()).padStart(2, '0');
      return { dDate: `${y}-${mo}-${da}`, dTime: `${hStr}:${mStr}` };
    } catch (e) {
      return { dDate: sDate, dTime: '18:00' };
    }
  };

  // Default first employee
  useEffect(() => {
    if (employees.length > 0 && !assignedTo) {
      const candidate = employees.find((e) => e.Employee_ID !== currentUser.Employee_ID) || employees[0];
      setAssignedTo(candidate.Employee_Name);
    }
  }, [employees, currentUser, assignedTo]);

  // When modal opens, populate Start Date with today IST and Start Time with current local IST time
  useEffect(() => {
    if (isOpen) {
      const currentISTDate = getISTCurrentDateStr();
      const currentISTTime = getISTCurrentTimeStr();

      setStartDate(currentISTDate);
      setStartTime(currentISTTime);
      setHasUserEditedStartTime(false);
      setErrorMessage('');
      setSuccessMessage('');
      setTitle('');
      setDescription('');
      setAttachments([]);

      if (taskType === 'Hourly Task') {
        const hourly = computeHourlyDeadline(currentISTDate, currentISTTime, durationHours);
        setDeadlineDate(hourly.dDate);
        setDeadlineTime(hourly.dTime);
      } else {
        const def = computeInitialDeadline(currentISTDate, currentISTTime);
        setDeadlineDate(def.dDate);
        setDeadlineTime(def.dTime);
      }
    }
  }, [isOpen]);

  // If the form stays open for a while and the user has not manually edited Start Time,
  // refresh the default time every 10 seconds so it does not become stale.
  // Note: We do NOT automatically change the deadline when refreshing Start Time.
  useEffect(() => {
    if (!isOpen || hasUserEditedStartTime) return;

    const interval = setInterval(() => {
      const freshISTTime = getISTCurrentTimeStr();
      setStartTime((prev) => {
        if (prev !== freshISTTime) {
          return freshISTTime;
        }
        return prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, hasUserEditedStartTime]);

  if (!isOpen) return null;

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds the 15MB size limit.`);
        continue;
      }
      try {
        const uploaded = await api.uploadAttachment(file, currentUser);
        setAttachments((prev) => [
          ...prev,
          {
            name: uploaded.name,
            url: uploaded.url,
            size: uploaded.size,
            type: file.type,
          },
        ]);
      } catch (err: any) {
        setErrorMessage(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Task type switch handler
  const handleTaskTypeChange = (type: TaskType) => {
    setTaskType(type);
    if (type === 'Hourly Task') {
      const hourly = computeHourlyDeadline(startDate, startTime, durationHours);
      setDeadlineDate(hourly.dDate);
      setDeadlineTime(hourly.dTime);
    }
  };

  // Hourly duration change handler
  const handleDurationChange = (hours: number) => {
    setDurationHours(hours);
    if (taskType === 'Hourly Task') {
      const hourly = computeHourlyDeadline(startDate, startTime, hours);
      setDeadlineDate(hourly.dDate);
      setDeadlineTime(hourly.dTime);
    }
  };

  // Manual Start Time change handler
  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    setHasUserEditedStartTime(true);
    if (taskType === 'Hourly Task') {
      const hourly = computeHourlyDeadline(startDate, newTime, durationHours);
      setDeadlineDate(hourly.dDate);
      setDeadlineTime(hourly.dTime);
    }
  };

  // Start Date change handler
  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (taskType === 'Hourly Task') {
      const hourly = computeHourlyDeadline(newDate, startTime, durationHours);
      setDeadlineDate(hourly.dDate);
      setDeadlineTime(hourly.dTime);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!title.trim()) {
      setErrorMessage('Task Title is required.');
      return;
    }

    if (!assignedTo) {
      setErrorMessage('Please assign an employee.');
      return;
    }

    // Validate start vs deadline in Asia/Kolkata timezone
    const startObj = new Date(`${startDate}T${startTime}:00`);
    const deadlineObj = new Date(`${deadlineDate}T${deadlineTime}:00`);

    if (deadlineObj.getTime() <= startObj.getTime()) {
      setErrorMessage('Deadline date/time must be strictly after Start date/time.');
      return;
    }

    const assignedEmployeeObj = employees.find((e) => e.Employee_Name === assignedTo);

    setIsSubmitting(true);

    try {
      const res = await api.createTask(
        {
          Task_Title: title.trim(),
          Task_Description: description.trim(),
          Assigned_To: assignedTo,
          Assigned_To_Email: assignedEmployeeObj?.Email || '',
          Priority: priority,
          Task_Type: taskType,
          Start_Date: startDate,
          Start_Time: startTime,
          Deadline_Date: deadlineDate,
          Deadline_Time: deadlineTime,
          Is_Hourly_Task: taskType === 'Hourly Task',
          Estimated_Duration_Hours: taskType === 'Hourly Task' ? Number(durationHours) : 0,
          Attachment_URLs: attachments,
          Department: 'Accounts & Finance',
        },
        currentUser
      );

      if (res.success) {
        setSuccessMessage(`Task created successfully! (ID: ${res.data?.Task_ID || 'AT-2026'})`);
        setTimeout(() => {
          onTaskCreated();
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error || 'Failed to create task.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-raised rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header with Company Branding */}
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#202A38]">
                Create Accounts Task
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md neu-inset-sm text-[#4169E1]">
                ALFA INTERCONTINENTAL LIMITED
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Assigned by {currentUser.Employee_Name} ({currentUser.Role})
            </p>
          </div>
          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#16845B]/10 border border-[#16845B]/20 text-[#16845B] text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Task Type Switcher (Segmented Button) */}
          <div>
            <label className="text-xs font-semibold text-[#202A38] block mb-1.5">
              Task Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 neu-inset rounded-xl">
              <button
                type="button"
                onClick={() => handleTaskTypeChange('Regular Task')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  taskType === 'Regular Task'
                    ? 'neu-raised text-[#4169E1]'
                    : 'text-[#667085] hover:text-[#202A38]'
                }`}
              >
                Regular Task (Standard)
              </button>
              <button
                type="button"
                onClick={() => handleTaskTypeChange('Hourly Task')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  taskType === 'Hourly Task'
                    ? 'neu-raised text-[#4169E1]'
                    : 'text-[#667085] hover:text-[#202A38]'
                }`}
              >
                Hourly Task (Fixed Duration)
              </button>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="text-xs font-semibold text-[#202A38] block mb-1">
              Task Title <span className="text-[#D64545]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly GST ITC Reconciliation vs GSTR-2B"
              className="w-full neu-inset rounded-xl px-3.5 py-2.5 text-xs text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="text-xs font-semibold text-[#202A38] block mb-1">
              Task Description & Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear steps, invoice batches, account ledgers, or specific verification criteria..."
              className="w-full neu-inset rounded-xl p-3 text-xs text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
            />
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#202A38] block mb-1">
                Assign To <span className="text-[#D64545]">*</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full neu-inset text-xs font-medium text-[#202A38] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
              >
                {employees.map((emp) => (
                  <option key={emp.Employee_ID} value={emp.Employee_Name}>
                    {emp.Employee_Name} ({emp.Role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#202A38] block mb-1">
                Priority <span className="text-[#D64545]">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full neu-inset text-xs font-medium text-[#202A38] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* If Hourly Task: Duration in hours */}
          {taskType === 'Hourly Task' && (
            <div className="neu-inset-sm p-3 rounded-xl space-y-1">
              <label className="text-xs font-semibold text-[#4169E1] block">
                Estimated Duration (Hours) <span className="text-[#D64545]">*</span>
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                max="48"
                value={durationHours}
                onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 1)}
                className="w-full neu-inset rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
              />
              <p className="text-[11px] text-[#667085]">
                Deadline will automatically calculate from start time + {durationHours} hour(s).
              </p>
            </div>
          )}

          {/* Start Date & Time (Automatic IST Population) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#202A38]">
                  Start Date (IST) <span className="text-[#D64545]">*</span>
                </label>
                <span className="text-[10px] text-[#667085] font-mono">
                  Today (IST)
                </span>
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full neu-inset rounded-xl px-3 py-2 text-xs font-mono text-[#202A38] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#202A38]">
                  Start Time (IST) <span className="text-[#D64545]">*</span>
                </label>
                <span className="text-[10px] text-[#4169E1] font-mono font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatISTTime12Hr(startTime)} {hasUserEditedStartTime ? '(Manual)' : '(Auto IST)'}
                </span>
              </div>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full neu-inset rounded-xl px-3 py-2 text-xs font-mono text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
              />
              <p className="text-[10px] text-[#667085] mt-1">
                {!hasUserEditedStartTime
                  ? 'Automatically populated with current India time (IST).'
                  : 'Custom start time specified (auto-refresh paused).'}
              </p>
            </div>
          </div>

          {/* Deadline Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#202A38] block mb-1">
                Deadline Date (IST) <span className="text-[#D64545]">*</span>
              </label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full neu-inset rounded-xl px-3 py-2 text-xs font-mono text-[#202A38] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#202A38] block mb-1">
                Deadline Time <span className="text-[#D64545]">*</span>
              </label>
              <input
                type="time"
                required
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full neu-inset rounded-xl px-3 py-2 text-xs font-mono text-[#202A38] focus:outline-none"
              />
            </div>
          </div>

          {/* File Attachments */}
          <div>
            <label className="text-xs font-semibold text-[#202A38] block mb-1">
              File Attachments (PDF, Excel, Word, Scans)
            </label>
            <div className="neu-inset rounded-xl p-3 text-center border border-dashed border-[#CAD2DE]">
              <input
                type="file"
                multiple
                id="file-upload"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-[#4169E1] hover:underline"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload files from device or Drive</span>
              </label>
              <p className="text-[10px] text-[#667085] mt-1">
                Max 15MB per file. Saved to Google Drive Accounts folder.
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="neu-raised-sm rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-[#4169E1] shrink-0" />
                      <span className="truncate font-medium text-[#202A38]">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-[#D64545] hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#CAD2DE]/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-[#667085]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="neu-btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating in Google Sheets...</span>
                </>
              ) : (
                <span>Create & Assign Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
