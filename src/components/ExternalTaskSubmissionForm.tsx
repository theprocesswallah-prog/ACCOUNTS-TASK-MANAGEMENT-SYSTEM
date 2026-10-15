/**
 * External Department Task Submission Portal
 * Dedicated intake form for external departments (Sales, Purchase, Store, Production, Dispatch, HR, Quality, etc.)
 * of ALFA INTERCONTINENTAL LIMITED.
 * 
 * Simplified, streamlined submission flow with essential fields only:
 * - Requesting Department
 * - Your Full Name
 * - Task Title / Subject
 * - Detailed Work Description & Instructions for Accounts
 * - Requested Priority (Normal, High, Urgent)
 * - Requested Deadline Date & Time (IST)
 * - Supporting File Attachments (Optional)
 * 
 * Strict Navigation Security:
 * - Case A (External Direct Link): NO dashboard button, NO navigation into internal app.
 * - Case B (Opened from Internal Accounts Dashboard): Shows "Back to Dashboard" button.
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Paperclip,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  UploadCloud,
  ShieldCheck,
  ArrowLeft,
  Info,
  User,
  Briefcase,
  Plus
} from 'lucide-react';
import {
  Priority,
  TaskAttachment,
  EXTERNAL_DEPARTMENTS,
  ExternalDepartment,
  ExternalTaskRequestPayload,
  Task
} from '../types';
import { api } from '../services/api';
import {
  getISTCurrentDateStr,
  getISTCurrentTimeStr,
  formatISTDate,
  formatISTTime12Hr
} from '../services/pointsEngine';

interface ExternalTaskSubmissionFormProps {
  onBackToDashboard?: () => void;
  isInternalOrigin?: boolean;
}

// 3 Simplified Priority Tiers for External Departments
const PRIORITY_TIERS: {
  id: Priority;
  label: string;
  sublabel: string;
  badge: string;
  colorClass: string;
  selectedClass: string;
}[] = [
  {
    id: 'Medium',
    label: 'Normal',
    sublabel: 'Standard 24–48h',
    badge: 'Routine',
    colorClass: 'text-[#4169E1]',
    selectedClass: 'neu-raised border-[#4169E1] bg-[#4169E1]/15 text-[#4169E1] font-bold shadow-sm',
  },
  {
    id: 'High',
    label: 'High',
    sublabel: 'Same Day (< 8h)',
    badge: 'Urgent Ops',
    colorClass: 'text-[#D88A16]',
    selectedClass: 'neu-raised border-[#D88A16] bg-[#D88A16]/15 text-[#D88A16] font-bold shadow-sm',
  },
  {
    id: 'Urgent',
    label: 'Urgent',
    sublabel: 'Immediate (< 4h)',
    badge: 'Critical',
    colorClass: 'text-[#C93B2B]',
    selectedClass: 'neu-raised border-[#C93B2B] bg-[#C93B2B]/15 text-[#C93B2B] font-bold shadow-sm',
  },
];

export const ExternalTaskSubmissionForm: React.FC<ExternalTaskSubmissionFormProps> = ({
  onBackToDashboard,
  isInternalOrigin = false,
}) => {
  // Essential Form State
  const [department, setDepartment] = useState<ExternalDepartment>('Sales');
  const [requesterName, setRequesterName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium'); // Maps to 'Normal'

  // Deadline in IST (defaults to tomorrow at 18:00 IST)
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 3600000);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [deadlineTime, setDeadlineTime] = useState('18:00');

  // Attachments
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Status & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedTask, setSubmittedTask] = useState<Task | null>(null);
  const [hasCopiedId, setHasCopiedId] = useState(false);
  const [hasCopiedPortalLink, setHasCopiedPortalLink] = useState(false);

  // Clear errors when user modifies inputs
  useEffect(() => {
    if (errorMessage) setErrorMessage('');
  }, [department, requesterName, taskTitle, taskDescription, deadlineDate, deadlineTime]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds the 15MB limit.`);
        continue;
      }
      try {
        const uploaded = await api.uploadAttachment(file);
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
    setIsUploading(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Strict validation of required fields
    if (!requesterName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!taskTitle.trim()) {
      setErrorMessage('Please provide a descriptive task title / subject.');
      return;
    }
    if (!taskDescription.trim()) {
      setErrorMessage('Please provide detailed work instructions for Accounts.');
      return;
    }
    if (!deadlineDate) {
      setErrorMessage('Please specify the requested completion deadline date.');
      return;
    }
    if (!deadlineTime) {
      setErrorMessage('Please specify the requested deadline time.');
      return;
    }

    // Deadline validation against current IST
    const currentISTDate = getISTCurrentDateStr();
    if (deadlineDate < currentISTDate) {
      setErrorMessage('Deadline date cannot be in the past.');
      return;
    }
    if (deadlineDate === currentISTDate) {
      const currentISTTime = getISTCurrentTimeStr();
      if (deadlineTime <= currentISTTime) {
        setErrorMessage(`Deadline time (${deadlineTime}) must be later than current IST time (${currentISTTime}).`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Payload preserves backward compatibility with database schema without requiring removed fields
    const payload: ExternalTaskRequestPayload = {
      Requesting_Department: department,
      Requester_Name: requesterName.trim(),
      Requester_Email: '',
      Requester_Contact: '',
      Reference_Number: '',
      Task_Title: taskTitle.trim(),
      Task_Description: taskDescription.trim(),
      Priority_Requested: priority,
      Requested_Start_Date: getISTCurrentDateStr(),
      Requested_Deadline_Date: deadlineDate,
      Requested_Deadline_Time: deadlineTime,
      Attachment_URLs: attachments,
    };

    try {
      const res = await api.submitExternalTask(payload);
      if (res.success && res.data) {
        setSubmittedTask(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to submit task request. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while submitting task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for submitting another task
  const handleReset = () => {
    setTaskTitle('');
    setTaskDescription('');
    setAttachments([]);
    setSubmittedTask(null);
    setErrorMessage('');
  };

  // Copy Task ID to clipboard
  const handleCopyTaskId = () => {
    if (!submittedTask) return;
    navigator.clipboard.writeText(submittedTask.Task_ID);
    setHasCopiedId(true);
    setTimeout(() => setHasCopiedId(false), 2500);
  };

  // Copy clean external shareable link (without internal origin markers)
  const handleCopyPortalLink = () => {
    try {
      const base = window.location.origin + window.location.pathname.replace(/\/task-request\/?$/, '');
      const url = new URL(base.endsWith('/') ? base : base + '/');
      url.searchParams.set('portal', 'external');
      navigator.clipboard.writeText(url.toString());
      setHasCopiedPortalLink(true);
      setTimeout(() => setHasCopiedPortalLink(false), 2500);
    } catch (e) {
      navigator.clipboard.writeText(window.location.href);
      setHasCopiedPortalLink(true);
      setTimeout(() => setHasCopiedPortalLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#E9EDF3] text-[#202A38] font-sans flex flex-col antialiased">
      {/* Top Portal Header */}
      <header className="sticky top-0 z-40 bg-[#E9EDF3]/95 backdrop-blur-md border-b border-[#CAD2DE]/70 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-raised flex items-center justify-center text-[#4169E1] shrink-0">
              <Building2 className="w-5 h-5 text-[#4169E1]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#202A38] leading-tight">
                ALFA INTERCONTINENTAL LIMITED
              </h1>
              <p className="text-[11px] font-semibold text-[#4169E1] flex items-center gap-1.5 mt-0.5">
                <span>Accounts Task Request Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#16845B]" title="Active Portal" />
                <span className="text-[10px] text-[#667085] hidden sm:inline">(Inter-Department Intake)</span>
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPortalLink}
              className="neu-btn text-xs font-semibold px-3 py-2 text-[#4169E1] flex items-center gap-1.5 rounded-xl transition-all"
              title="Copy shareable link for Sales, Purchase, Store, etc."
            >
              {hasCopiedPortalLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16845B]" />
                  <span className="text-[#16845B]">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share Form URL</span>
                </>
              )}
            </button>

            {/* ONLY show Back to Dashboard button when session originated from internal Accounts Dashboard */}
            {isInternalOrigin && onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="neu-btn text-xs font-semibold px-3 py-2 text-[#465366] hover:text-[#202A38] flex items-center gap-1.5 rounded-xl transition-all"
                title="Return to Accounts Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Intro Notice Banner */}
        <div className="neu-flat p-4 sm:p-5 rounded-2xl mb-6 flex items-start gap-3.5 border-l-4 border-l-[#4169E1]">
          <Info className="w-5 h-5 text-[#4169E1] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#465366] leading-relaxed">
            <span className="font-bold text-[#202A38]">Accounts Task Intake Desk. </span>
            This form is dedicated for all sister departments (Sales, Purchase, Store, Production, Dispatch, HR, Quality) to submit task requests to Accounts. Fill out the quick details below to generate an official tracking Task ID.
          </div>
        </div>

        {/* =========================================================================
            STATE 1: SUBMISSION RECEIPT & CONFIRMATION
           ========================================================================= */}
        {submittedTask ? (
          <div className="neu-flat p-6 sm:p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header Badge */}
            <div className="text-center max-w-md mx-auto mb-8">
              <div className="w-16 h-16 rounded-full neu-raised mx-auto mb-4 flex items-center justify-center text-[#16845B]">
                <CheckCircle2 className="w-9 h-9 text-[#16845B]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#202A38] tracking-tight">
                Task Request Submitted Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] mt-1.5 font-medium">
                Your request has been securely recorded into the central Accounts database and queued for Manager assignment.
              </p>
            </div>

            {/* Generated Task ID Card */}
            <div className="neu-inset p-5 sm:p-6 rounded-2xl max-w-lg mx-auto mb-8 text-center border border-[#CAD2DE]/40">
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Your Official Tracking Task ID
              </span>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-2xl sm:text-3xl font-black text-[#4169E1] font-mono tracking-wide">
                  {submittedTask.Task_ID}
                </span>
                <button
                  onClick={handleCopyTaskId}
                  className="neu-btn px-3 py-2 rounded-xl text-xs font-bold text-[#4169E1] flex items-center gap-1.5 transition-all"
                  title="Copy Task ID"
                >
                  {hasCopiedId ? (
                    <>
                      <Check className="w-4 h-4 text-[#16845B]" />
                      <span className="text-[#16845B]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D88A16]/15 text-[#D88A16] border border-[#D88A16]/30">
                  Status: Pending Assignment
                </span>
                <span className="text-xs text-[#667085]">
                  • Awaiting Accounts Manager review
                </span>
              </div>
            </div>

            {/* Request Summary Receipt */}
            <div className="neu-raised p-5 sm:p-6 rounded-2xl max-w-2xl mx-auto mb-8 border border-white/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-4 pb-2 border-b border-[#CAD2DE]/50">
                Submission Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#667085] font-medium block">Department:</span>
                  <span className="font-bold text-[#202A38] text-sm">{submittedTask.Requesting_Department || department}</span>
                </div>

                <div>
                  <span className="text-[#667085] font-medium block">Requester Name:</span>
                  <span className="font-bold text-[#202A38] text-sm">{submittedTask.Requester_Name}</span>
                </div>

                <div>
                  <span className="text-[#667085] font-medium block">Priority Requested:</span>
                  <span className={`inline-block font-bold mt-0.5 ${
                    submittedTask.Priority === 'Urgent' ? 'text-[#C93B2B]' :
                    submittedTask.Priority === 'High' ? 'text-[#D88A16]' : 'text-[#4169E1]'
                  }`}>
                    {submittedTask.Priority === 'Medium' ? 'Normal' : submittedTask.Priority}
                  </span>
                </div>

                <div>
                  <span className="text-[#667085] font-medium block">Requested Completion:</span>
                  <span className="font-bold text-[#202A38] text-sm">
                    {formatISTDate(submittedTask.Deadline_Date)} at {formatISTTime12Hr(submittedTask.Deadline_Time)} IST
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[#667085] font-medium block">Task Subject:</span>
                  <span className="font-bold text-[#202A38] text-sm block mt-0.5">{submittedTask.Task_Title}</span>
                </div>

                {attachments.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-[#667085] font-medium block">Attachments:</span>
                    <span className="font-bold text-[#202A38] text-sm">
                      {attachments.length} file{attachments.length === 1 ? '' : 's'} attached
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Case A (External) shows ONLY Submit Another Task; Case B (Internal) also shows Back to Dashboard */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={handleReset}
                className="neu-btn-primary w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Another Task</span>
              </button>

              {isInternalOrigin && onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="neu-btn w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-[#465366] hover:text-[#202A38] flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Dashboard</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE 2: SIMPLIFIED SUBMISSION FORM
             ========================================================================= */
          <form onSubmit={handleSubmit} className="neu-flat p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="border-b border-[#CAD2DE]/60 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-[#202A38] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#4169E1]" />
                <span>Submit Task Request to Accounts</span>
              </h2>
              <p className="text-xs text-[#667085] mt-1 font-medium">
                Please complete the required details below (<span className="text-[#C93B2B]">*</span> indicates mandatory).
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-[#C93B2B]/10 border border-[#C93B2B]/30 flex items-start gap-3 animate-in fade-in duration-150">
                <AlertCircle className="w-5 h-5 text-[#C93B2B] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-[#C93B2B]">
                  {errorMessage}
                </span>
              </div>
            )}

            {/* Section 1: Requester Identification */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#4169E1]" />
                <span>1. Requester Identification</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Requesting Department */}
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Requesting Department <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-1 flex items-center">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as ExternalDepartment)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] py-2 focus:outline-none cursor-pointer"
                    >
                      {EXTERNAL_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} Department
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Requester Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Your Full Name <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#667085]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Task Details */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#4169E1]" />
                <span>2. Task Details</span>
              </h3>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                  Task Title / Subject <span className="text-[#C93B2B]">*</span>
                </label>
                <div className="neu-inset rounded-xl px-3 py-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Invoice Generation & Dispatch Clearance for Pune Consignment"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                  Detailed Work Description & Instructions for Accounts <span className="text-[#C93B2B]">*</span>
                </label>
                <div className="neu-inset rounded-xl p-3">
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide specific instructions for Accounts: e.g. Customer ledger verification needed for Bajaj Auto PO #8821, verify payment credit before generating e-way bill and releasing delivery challan."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Priority & Turnaround */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#4169E1]" />
                <span>3. Requested Priority & Turnaround</span>
              </h3>

              {/* Priority Selector: Normal, High, Urgent */}
              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-2">
                  Requested Priority <span className="text-[#C93B2B]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRIORITY_TIERS.map((tier) => {
                    const isSelected = priority === tier.id;
                    return (
                      <button
                        type="button"
                        key={tier.id}
                        onClick={() => setPriority(tier.id)}
                        className={`py-3 px-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? tier.selectedClass
                            : 'neu-flat hover:bg-white/40 border-[#CAD2DE]/60 text-[#667085]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-[#202A38]">{tier.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/80 shadow-xs' : 'bg-[#E9EDF3]'
                          } ${tier.colorClass}`}>
                            {tier.badge}
                          </span>
                        </div>
                        <span className="text-[11px] opacity-80">{tier.sublabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline in IST: Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5 flex items-center justify-between">
                    <span>Requested Deadline Date <span className="text-[#C93B2B]">*</span></span>
                    <span className="text-[10px] font-semibold text-[#4169E1]">IST (India Time)</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#667085]" />
                    <input
                      type="date"
                      required
                      min={getISTCurrentDateStr()}
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#202A38] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Requested Deadline Time <span className="text-[#C93B2B]">*</span>
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
            </div>

            {/* Section 4: Supporting Attachments (Optional) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#4169E1]" />
                  <span>4. Supporting File Attachments (Optional)</span>
                </span>
                <span className="text-[10px] text-[#667085] font-normal">Max 15MB each</span>
              </h3>

              {/* Dropzone */}
              <div className="neu-inset rounded-2xl p-4 sm:p-5 text-center border-2 border-dashed border-[#CAD2DE]">
                <UploadCloud className="w-7 h-7 text-[#4169E1] mx-auto mb-2 opacity-80" />
                <p className="text-xs text-[#202A38] font-bold">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Attach invoices, purchase orders, delivery challans, or approvals (PDF, Excel, Images).
                </p>

                <label className="inline-block mt-3">
                  <span className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#4169E1] cursor-pointer hover:bg-white/80 transition-all">
                    Choose Files
                  </span>
                  <input
                    type="file"
                    multiple
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {isUploading && (
                  <p className="text-xs font-semibold text-[#4169E1] mt-2 animate-pulse">
                    Uploading files...
                  </p>
                )}
              </div>

              {/* Attachment Pill List */}
              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="neu-raised px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#4169E1] shrink-0" />
                        <span className="font-medium text-[#202A38] truncate">{att.name}</span>
                        {att.size && (
                          <span className="text-[10px] text-[#667085] shrink-0">
                            ({(att.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-[#C93B2B] hover:text-[#A82B1D] p-1 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Actions */}
            <div className="pt-4 border-t border-[#CAD2DE]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-[#667085] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16845B]" />
                <span>Transmits directly to ALFA Accounts central database.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="neu-btn-primary w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Task...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Task Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-4 text-center border-t border-[#CAD2DE]/40 text-xs text-[#667085]">
        <span>ALFA INTERCONTINENTAL LIMITED • Accounts Task Intake • Asia/Kolkata (IST)</span>
      </footer>
    </div>
  );
};
