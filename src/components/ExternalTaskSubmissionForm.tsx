/**
 * External Department Task Submission Portal
 * Dedicated intake form for external departments (Sales, Purchase, Store, Production, Dispatch, etc.)
 * of ALFA INTERCONTINENTAL LIMITED.
 * 
 * Provides an isolated, streamlined submission flow with validation, attachments,
 * instant Task ID generation, and submission receipts.
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
  Sparkles,
  Info,
  Phone,
  Mail,
  User,
  Hash,
  Briefcase
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
  isStandalone?: boolean;
}

export const ExternalTaskSubmissionForm: React.FC<ExternalTaskSubmissionFormProps> = ({
  onBackToDashboard,
  isStandalone = false,
}) => {
  // Form State
  const [department, setDepartment] = useState<ExternalDepartment>('Sales');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterContact, setRequesterContact] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');

  // Dates in IST
  const [startDate] = useState(getISTCurrentDateStr());
  const [startTime] = useState(getISTCurrentTimeStr());
  const [deadlineDate, setDeadlineDate] = useState(() => {
    // Default to tomorrow in IST
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

  // Clear errors when user types
  useEffect(() => {
    if (errorMessage) setErrorMessage('');
  }, [department, requesterName, requesterEmail, taskTitle, taskDescription, deadlineDate, deadlineTime]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds the 15MB limit.`);
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

    // Validation
    if (!requesterName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!requesterEmail.trim() || !requesterEmail.includes('@')) {
      setErrorMessage('Please enter a valid corporate email address.');
      return;
    }
    if (!taskTitle.trim()) {
      setErrorMessage('Please provide a descriptive task title.');
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

    // Deadline validation (must not precede today in IST)
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

    const payload: ExternalTaskRequestPayload = {
      Requesting_Department: department,
      Requester_Name: requesterName.trim(),
      Requester_Email: requesterEmail.trim(),
      Requester_Contact: requesterContact.trim(),
      Reference_Number: referenceNumber.trim(),
      Task_Title: taskTitle.trim(),
      Task_Description: taskDescription.trim(),
      Priority_Requested: priority,
      Requested_Start_Date: startDate,
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

  // Reset form for another submission
  const handleReset = () => {
    setTaskTitle('');
    setTaskDescription('');
    setReferenceNumber('');
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

  // Copy Portal shareable link
  const handleCopyPortalLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('portal', 'submit');
    navigator.clipboard.writeText(url.toString());
    setHasCopiedPortalLink(true);
    setTimeout(() => setHasCopiedPortalLink(false), 2500);
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

          {/* Quick Actions */}
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

            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="neu-btn text-xs font-semibold px-3 py-2 text-[#667085] hover:text-[#202A38] flex items-center gap-1.5 rounded-xl transition-all"
                title="Return to Accounts Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Accounts Dashboard</span>
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
            <span className="font-bold text-[#202A38]">Welcome to the Accounts Intake Desk. </span>
            This form is dedicated for all sister departments (Sales, Purchase, Store, Production, Dispatch, HR) to submit actionable accounting tasks, payment releases, GST/tax clearances, ledger reconciliations, or invoice authorisations. Upon submission, a permanent tracking Task ID is generated.
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
                Your request has been securely recorded into the ALFA central Accounts database and queued for Manager assignment.
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
                Submission Summary Receipt
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#667085] font-medium block">Department:</span>
                  <span className="font-bold text-[#202A38] text-sm">{submittedTask.Requesting_Department || department}</span>
                </div>

                <div>
                  <span className="text-[#667085] font-medium block">Requester:</span>
                  <span className="font-bold text-[#202A38] text-sm">{submittedTask.Requester_Name} ({submittedTask.Requester_Email})</span>
                </div>

                {submittedTask.Reference_Number && (
                  <div>
                    <span className="text-[#667085] font-medium block">Reference Number:</span>
                    <span className="font-bold text-[#202A38] font-mono text-sm">{submittedTask.Reference_Number}</span>
                  </div>
                )}

                <div>
                  <span className="text-[#667085] font-medium block">Priority Requested:</span>
                  <span className={`inline-block font-bold mt-0.5 ${
                    submittedTask.Priority === 'Urgent' ? 'text-[#C93B2B]' :
                    submittedTask.Priority === 'High' ? 'text-[#D88A16]' : 'text-[#4169E1]'
                  }`}>
                    {submittedTask.Priority}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[#667085] font-medium block">Task Subject:</span>
                  <span className="font-bold text-[#202A38] text-sm block mt-0.5">{submittedTask.Task_Title}</span>
                </div>

                <div>
                  <span className="text-[#667085] font-medium block">Requested Completion:</span>
                  <span className="font-bold text-[#202A38] text-sm">
                    {formatISTDate(submittedTask.Deadline_Date)} at {formatISTTime12Hr(submittedTask.Deadline_Time)} IST
                  </span>
                </div>

                <div>
                  <span className="text-[#667085] font-medium block">Attachments:</span>
                  <span className="font-bold text-[#202A38] text-sm">
                    {attachments.length} file{attachments.length === 1 ? '' : 's'} uploaded
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={handleReset}
                className="neu-btn-primary w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Another Request</span>
              </button>

              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="neu-btn w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-[#465366] hover:text-[#202A38] flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Go to Accounts Board</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE 2: SUBMISSION FORM
             ========================================================================= */
          <form onSubmit={handleSubmit} className="neu-flat p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="border-b border-[#CAD2DE]/60 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-[#202A38] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#4169E1]" />
                <span>Submit New Task to Accounts</span>
              </h2>
              <p className="text-xs text-[#667085] mt-1 font-medium">
                All fields marked with an asterisk (<span className="text-[#C93B2B]">*</span>) are mandatory.
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

            {/* Section 1: Requester Details */}
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
                      placeholder="e.g. Deepak Verma"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* Requester Corporate Email */}
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Corporate Email Address <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#667085]" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. deepak.verma@alfa-intercontinental.com"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contact / Phone / Intercom */}
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Phone / Intercom / Extension <span className="text-[10px] text-[#667085] font-normal">(Optional)</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#667085]" />
                    <input
                      type="text"
                      placeholder="e.g. +91 98201 44521 / Ext. 302"
                      value={requesterContact}
                      onChange={(e) => setRequesterContact(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Task Specifications */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#4169E1]" />
                <span>2. Task Specifications & Reference</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Reference / PO / SO / Consignment # <span className="text-[10px] text-[#667085] font-normal">(Optional)</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#667085]" />
                    <input
                      type="text"
                      placeholder="e.g. PO-8812, SO-2026-91"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Task Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#202A38] mb-1.5">
                    Task Title / Subject <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="neu-inset rounded-xl px-3 py-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Customer Credit Limit Approval & Sales Invoice Generation"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none"
                    />
                  </div>
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
                    placeholder="Clearly specify the required action: e.g. 'Clearance required for Dispatch consignment #DISP-9921 to Bajaj Auto Pune plant. Outstanding payment ledger verification needed before releasing tax invoice.'"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-[#202A38] font-medium focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Priority & Deadline */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#4169E1]" />
                <span>3. Priority & Requested Turnaround</span>
              </h3>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-bold text-[#202A38] mb-2">
                  Requested Priority Level <span className="text-[#C93B2B]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Low', 'Medium', 'High', 'Urgent'] as Priority[]).map((p) => {
                    const isSelected = priority === p;
                    const colorClasses = 
                      p === 'Urgent'
                        ? isSelected ? 'border-[#C93B2B] bg-[#C93B2B]/10 text-[#C93B2B] font-bold shadow-sm' : 'text-[#667085]'
                        : p === 'High'
                        ? isSelected ? 'border-[#D88A16] bg-[#D88A16]/10 text-[#D88A16] font-bold shadow-sm' : 'text-[#667085]'
                        : p === 'Medium'
                        ? isSelected ? 'border-[#4169E1] bg-[#4169E1]/10 text-[#4169E1] font-bold shadow-sm' : 'text-[#667085]'
                        : isSelected ? 'border-[#16845B] bg-[#16845B]/10 text-[#16845B] font-bold shadow-sm' : 'text-[#667085]';

                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`py-2.5 px-3 rounded-xl border text-xs text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected ? 'neu-raised' : 'neu-flat hover:bg-white/40 border-[#CAD2DE]/60'
                        } ${colorClasses}`}
                      >
                        <span className="font-bold text-xs">{p}</span>
                        <span className="text-[10px] opacity-75">
                          {p === 'Urgent' ? 'Immediate (< 4h)' : p === 'High' ? 'Same Day' : p === 'Medium' ? 'Standard 24-48h' : 'Routine'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline in IST */}
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

            {/* Section 4: Supporting Attachments */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#4169E1]" />
                  <span>4. Supporting Documents (PDF, Excel, Images)</span>
                </span>
                <span className="text-[10px] text-[#667085] font-normal">Max 15MB each</span>
              </h3>

              {/* Dropzone */}
              <div className="neu-inset rounded-2xl p-4 sm:p-5 text-center border-2 border-dashed border-[#CAD2DE]">
                <UploadCloud className="w-8 h-8 text-[#4169E1] mx-auto mb-2 opacity-80" />
                <p className="text-xs text-[#202A38] font-bold">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Attach invoices, purchase orders, delivery challans, or email approvals.
                </p>

                <label className="inline-block mt-3">
                  <span className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#4169E1] cursor-pointer hover:bg-white/80 transition-all">
                    Choose Documents
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
                    Processing attachments...
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
                <span>Submitted directly to central Google Sheets Accounts database.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="neu-btn-primary w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Task to Accounts Desk</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-4 text-center border-t border-[#CAD2DE]/40 text-xs text-[#667085]">
        <span>ALFA INTERCONTINENTAL LIMITED • Accounts Department Operations Portal • Asia/Kolkata (IST)</span>
      </footer>
    </div>
  );
};
