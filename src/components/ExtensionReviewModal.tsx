/**
 * Extension Review Modal Component (Administrator / Manager Interface)
 * Allows authorized managers to inspect reason, compare deadlines, and approve or reject.
 */

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Calendar, User, Clock, ShieldAlert } from 'lucide-react';
import { ExtensionRequest, Employee } from '../types';
import { formatISTDateTime } from '../services/pointsEngine';
import { api } from '../services/api';

interface ExtensionReviewModalProps {
  request: ExtensionRequest | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  onReviewCompleted: () => void;
}

export const ExtensionReviewModal: React.FC<ExtensionReviewModalProps> = ({
  request,
  isOpen,
  onClose,
  currentUser,
  onReviewCompleted,
}) => {
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvedDate, setApprovedDate] = useState('');
  const [approvedTime, setApprovedTime] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pre-fill approved date/time with requested values when request changes
  React.useEffect(() => {
    if (request && isOpen) {
      try {
        const d = new Date(request.Requested_Deadline);
        setApprovedDate(d.toISOString().split('T')[0]);
        setApprovedTime(d.toTimeString().slice(0, 5));
      } catch (e) {
        setApprovedDate('');
        setApprovedTime('');
      }
      setDecision('Approved');
      setComments('');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const isAuthorized = currentUser.Role === 'Administrator' || currentUser.Role === 'Manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMessage('Access Denied: Only Administrator or Accounts Manager can approve or reject deadline extensions.');
      return;
    }

    let finalApprovedDeadline = request.Requested_Deadline;
    if (decision === 'Approved' && approvedDate && approvedTime) {
      finalApprovedDeadline = `${approvedDate}T${approvedTime}:00`;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await api.reviewExtension(
        request.Request_ID,
        decision,
        finalApprovedDeadline,
        comments.trim(),
        currentUser
      );

      if (res.success) {
        setSuccessMessage(`Extension request ${decision.toLowerCase()} successfully.`);
        setTimeout(() => {
          onReviewCompleted();
          onClose();
        }, 1000);
      } else {
        setErrorMessage(res.error || 'Review submission failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-raised rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#202A38]">
              Review Extension Request
            </h2>
            <p className="text-xs text-[#667085]">
              Request ID: {request.Request_ID} · Task: {request.Task_ID}
            </p>
          </div>
          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {!isAuthorized && (
            <div className="p-3 rounded-xl bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                You are currently logged in as an <b>Employee</b>. Only <b>Managers</b> or <b>Administrators</b> have permission to review extensions. Switch roles in top bar to test approval.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#16845B]/10 border border-[#16845B]/20 text-[#16845B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Request Information Card */}
          <div className="neu-inset-sm p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#202A38]">
                Requested By: {request.Requested_By}
              </span>
              <span className="text-[#667085] font-mono text-[10px]">
                {formatISTDateTime(request.Requested_At)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#CAD2DE]/30">
              <div>
                <span className="text-[#667085] block">Current Deadline:</span>
                <span className="font-mono font-semibold text-[#202A38]">
                  {formatISTDateTime(request.Old_Deadline)}
                </span>
              </div>
              <div>
                <span className="text-[#667085] block">Requested Deadline:</span>
                <span className="font-mono font-bold text-[#4169E1]">
                  {formatISTDateTime(request.Requested_Deadline)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-[#667085] block">
                Employee Reason:
              </span>
              <p className="text-[#202A38] bg-white/60 p-2 rounded-lg mt-1 leading-relaxed">
                "{request.Reason}"
              </p>
            </div>
          </div>

          {/* Review Decision Segmented Buttons */}
          <div>
            <label className="font-semibold text-[#202A38] block mb-1.5">
              Manager Decision
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 neu-inset rounded-xl">
              <button
                type="button"
                onClick={() => setDecision('Approved')}
                className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  decision === 'Approved'
                    ? 'neu-raised text-[#16845B]'
                    : 'text-[#667085] hover:text-[#202A38]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Extension</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('Rejected')}
                className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  decision === 'Rejected'
                    ? 'neu-raised text-[#D64545]'
                    : 'text-[#667085] hover:text-[#202A38]'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Extension</span>
              </button>
            </div>
          </div>

          {/* If Approved: Allow confirming or modifying approved deadline */}
          {decision === 'Approved' && (
            <div className="neu-inset-sm p-3 rounded-xl space-y-2">
              <span className="font-semibold text-[#16845B] block text-[11px]">
                Confirm or Adjust Approved Deadline
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={approvedDate}
                  onChange={(e) => setApprovedDate(e.target.value)}
                  className="w-full neu-inset rounded-lg px-2.5 py-1.5 font-mono text-[#202A38] focus:outline-none"
                />
                <input
                  type="time"
                  required
                  value={approvedTime}
                  onChange={(e) => setApprovedTime(e.target.value)}
                  className="w-full neu-inset rounded-lg px-2.5 py-1.5 font-mono text-[#202A38] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Review Comments */}
          <div>
            <label className="font-semibold text-[#202A38] block mb-1">
              Review Comments / Instructions
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Approved. Priority raw materials need ITC confirmation by tomorrow 5 PM."
              className="w-full neu-inset rounded-xl p-2.5 text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="neu-btn px-4 py-2 rounded-xl font-semibold text-[#667085]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAuthorized}
              className={`neu-btn px-5 py-2 rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50 ${
                decision === 'Approved' ? 'text-[#16845B]' : 'text-[#D64545]'
              }`}
            >
              {isSubmitting
                ? 'Submitting Decision...'
                : `Confirm ${decision}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
