/**
 * Extension Request Modal Component
 * Allows employee to submit deadline extension request with mandatory reason and proposed deadline.
 */

import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, Hourglass, Check } from 'lucide-react';
import { Task, Employee } from '../types';
import { formatISTDateTime } from '../services/pointsEngine';
import { api } from '../services/api';

interface ExtensionModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  onRequestSubmitted: () => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUser,
  onRequestSubmitted,
}) => {
  // Tomorrow date default for proposed deadline
  const tomorrow = new Date(Date.now() + 24 * 3600000);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  const [proposedDate, setProposedDate] = useState(tomorrowDateStr);
  const [proposedTime, setProposedTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!reason.trim()) {
      setErrorMessage('A detailed reason for the extension request is mandatory.');
      return;
    }

    const proposedFullStr = `${proposedDate}T${proposedTime}:00`;
    const proposedObj = new Date(proposedFullStr);
    const currentDeadlineObj = new Date(task.Current_Deadline || task.Original_Deadline);

    if (proposedObj.getTime() <= currentDeadlineObj.getTime()) {
      setErrorMessage('Proposed extension deadline must be later than the current deadline.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.requestExtension(
        task.Task_ID,
        reason.trim(),
        proposedFullStr,
        currentUser
      );

      if (res.success) {
        setSuccessMessage('Extension request submitted! Awaiting Manager / Admin approval.');
        setTimeout(() => {
          onRequestSubmitted();
          onClose();
        }, 1000);
      } else {
        setErrorMessage(res.error || 'Failed to submit extension request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-raised rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#D88A16]">
            <Hourglass className="w-4 h-4" />
            <span>Request Deadline Extension</span>
          </div>
          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#16845B]/10 border border-[#16845B]/20 text-[#16845B] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Task Summary */}
          <div className="neu-inset-sm p-3 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#667085]">
              Target Task
            </span>
            <div className="font-bold text-[#202A38] text-sm truncate">
              {task.Task_ID}: {task.Task_Title}
            </div>
            <div className="text-[11px] text-[#667085] flex items-center gap-2">
              <span>Current Effective Deadline:</span>
              <span className="font-mono font-bold text-[#202A38] tabular-nums">
                {formatISTDateTime(task.Current_Deadline || task.Original_Deadline)}
              </span>
            </div>
          </div>

          {/* Proposed Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#202A38] block mb-1">
                Proposed New Date (IST) <span className="text-[#D64545]">*</span>
              </label>
              <input
                type="date"
                required
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full neu-inset rounded-xl px-3 py-2 font-mono text-[#202A38] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-[#202A38] block mb-1">
                Proposed Time <span className="text-[#D64545]">*</span>
              </label>
              <input
                type="time"
                required
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full neu-inset rounded-xl px-3 py-2 font-mono text-[#202A38] focus:outline-none"
              />
            </div>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="font-semibold text-[#202A38] block mb-1">
              Reason for Extension Request <span className="text-[#D64545]">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear manufacturing/accounts blockers, e.g., waiting for vendor GST portal credit reflect, bank server downtime, plant engineering sign-off..."
              className="w-full neu-inset rounded-xl p-3 text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#D88A16]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#CAD2DE]/30 text-[#667085] text-[11px] leading-relaxed">
            <b>Note:</b> Submitting this request will not automatically change the deadline. Your Manager or Administrator must review and approve it. If approved and completed before the new deadline, full 5 points will be awarded.
          </div>

          {/* Actions */}
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
              disabled={isSubmitting}
              className="neu-btn px-5 py-2 rounded-xl font-semibold text-[#D88A16] hover:text-[#202A38] disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Extension Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
