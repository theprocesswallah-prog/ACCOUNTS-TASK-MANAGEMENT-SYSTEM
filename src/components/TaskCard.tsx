/**
 * TaskCard Component
 * Displays task information with distinct visual states,
 * Neumorphic surface styling, IST deadline format, remaining time badge,
 * and quick action triggers.
 */

import React from 'react';
import {
  Clock,
  User,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Hourglass,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Task, Priority } from '../types';
import { formatISTDateTime, getTimeRemainingText } from '../services/pointsEngine';

interface TaskCardProps {
  task: Task;
  onViewDetails: (task: Task) => void;
  onRequestExtension?: (task: Task) => void;
  onCompleteTask?: (task: Task) => void;
  onAssignTask?: (task: Task) => void;
  isLargeScreen?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onViewDetails,
  onRequestExtension,
  onCompleteTask,
  onAssignTask,
  isLargeScreen = false,
}) => {
  // Parse attachments
  let attachmentCount = 0;
  try {
    if (task.Attachment_URLs) {
      const parsed = typeof task.Attachment_URLs === 'string' ? JSON.parse(task.Attachment_URLs) : task.Attachment_URLs;
      if (Array.isArray(parsed)) attachmentCount = parsed.length;
    }
  } catch (e) {
    if (task.Attachment_URLs && task.Attachment_URLs.length > 5) attachmentCount = 1;
  }

  // Calculate remaining time
  const remaining = getTimeRemainingText(task.Current_Deadline || task.Original_Deadline);

  // Determine state labels and badge classes
  let statusBadgeColor = 'text-[#202A38] bg-[#E5EBF2]';
  let statusIcon = <Clock className="w-3.5 h-3.5" />;
  let visualStateLabel: string = task.Status;

  if (task.Status === 'Completed') {
    statusBadgeColor = 'text-[#16845B] bg-[#16845B]/10';
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B]" />;
    visualStateLabel = 'Completed';
  } else if (task.Status === 'Pending Assignment') {
    statusBadgeColor = 'text-[#D88A16] bg-[#D88A16]/15 border border-[#D88A16]/30';
    statusIcon = <Hourglass className="w-3.5 h-3.5 text-[#D88A16]" />;
    visualStateLabel = 'Needs Assignment';
  } else if (remaining.isOverdue) {
    statusBadgeColor = 'text-[#D64545] bg-[#D64545]/10';
    statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-[#D64545]" />;
    visualStateLabel = 'Overdue';
  } else if (task.Extension_Status === 'Requested') {
    statusBadgeColor = 'text-[#D88A16] bg-[#D88A16]/10';
    statusIcon = <Hourglass className="w-3.5 h-3.5 text-[#D88A16]" />;
    visualStateLabel = 'Extension Requested';
  } else if (task.Extension_Status === 'Approved') {
    statusBadgeColor = 'text-[#4169E1] bg-[#4169E1]/10';
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-[#4169E1]" />;
    visualStateLabel = 'Extension Approved';
  } else if (remaining.isDueSoon) {
    statusBadgeColor = 'text-[#D88A16] bg-[#D88A16]/10';
    statusIcon = <Clock className="w-3.5 h-3.5 text-[#D88A16]" />;
    visualStateLabel = 'Due Soon';
  } else if (task.Status === 'In Progress') {
    statusBadgeColor = 'text-[#4169E1] bg-[#4169E1]/10';
    statusIcon = <Clock className="w-3.5 h-3.5 text-[#4169E1]" />;
    visualStateLabel = 'In Progress';
  } else if (task.Status === 'Assigned') {
    statusBadgeColor = 'text-[#667085] bg-[#CAD2DE]/30';
    visualStateLabel = 'Upcoming';
  }

  // Priority colors
  const priorityMap: Record<Priority, { text: string; bg: string }> = {
    Urgent: { text: 'text-[#D64545]', bg: 'bg-[#D64545]/10' },
    High: { text: 'text-[#D88A16]', bg: 'bg-[#D88A16]/10' },
    Medium: { text: 'text-[#4169E1]', bg: 'bg-[#4169E1]/10' },
    Low: { text: 'text-[#667085]', bg: 'bg-[#CAD2DE]/30' },
  };
  const priorityStyle = priorityMap[task.Priority] || priorityMap.Medium;

  return (
    <div
      className={`neu-raised rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg relative overflow-hidden group ${
        remaining.isOverdue && task.Status !== 'Completed' ? 'ring-2 ring-[#D64545]/30' : ''
      }`}
    >
      {/* Top Meta Line: ID, Type, Priority, Status */}
      <div>
        <div className="flex items-center justify-between gap-2 text-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#4169E1] tracking-wide">
              {task.Task_ID}
            </span>
            <span className="text-[#CAD2DE]">|</span>
            <span className="text-[#667085] font-medium text-[11px]">
              {task.Task_Type === 'Hourly Task'
                ? `Hourly (${task.Estimated_Duration_Hours || 1}h)`
                : 'Regular'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {task.Request_Source === 'External' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4169E1]/15 text-[#4169E1] border border-[#4169E1]/20">
                {task.Requesting_Department || 'Dept'}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${priorityStyle.text} ${priorityStyle.bg}`}
            >
              {task.Priority}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 ${statusBadgeColor}`}
            >
              {statusIcon}
              <span>{visualStateLabel}</span>
            </span>
          </div>
        </div>

        {/* Task Title */}
        <h3
          onClick={() => onViewDetails(task)}
          className={`font-bold text-[#202A38] leading-snug cursor-pointer group-hover:text-[#4169E1] transition-colors mb-2 line-clamp-2 ${
            isLargeScreen ? 'text-lg' : 'text-base'
          }`}
          title={task.Task_Title}
        >
          {task.Task_Title}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-[#667085] line-clamp-2 mb-4 leading-relaxed">
          {task.Task_Description || 'No additional instructions specified.'}
        </p>

        {/* Extension Approved Banner if applicable */}
        {task.Extension_Status === 'Approved' && task.Approved_Extension_Deadline && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-[#4169E1]/5 border border-[#4169E1]/20 flex items-center justify-between text-[11px] text-[#4169E1]">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
              Approved Extended Deadline:
            </span>
            <span className="font-semibold font-mono tabular-nums">
              {formatISTDateTime(task.Approved_Extension_Deadline)}
            </span>
          </div>
        )}

        {/* Assignment & Created By */}
        <div className="pt-3 border-t border-[#CAD2DE]/40 grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#667085] block font-semibold">
              Assigned To
            </span>
            <span className="font-semibold text-[#202A38] truncate block">
              {task.Assigned_To}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#667085] block font-semibold">
              Created By
            </span>
            <span className="text-[#667085] truncate block">
              {task.Created_By}
            </span>
          </div>
        </div>

        {/* Deadline & Time Remaining */}
        <div className="neu-inset-sm rounded-xl p-2.5 mb-4 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#667085] shrink-0" />
            <div>
              <span className="text-[10px] text-[#667085] block leading-none">
                Deadline (IST)
              </span>
              <span className="font-mono text-xs font-semibold text-[#202A38] tabular-nums">
                {formatISTDateTime(task.Current_Deadline || task.Original_Deadline)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`font-mono font-bold text-xs tabular-nums block ${
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
      </div>

      {/* Footer Actions & Attachment Indicator */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          {attachmentCount > 0 && (
            <span
              className="text-[11px] text-[#667085] font-medium flex items-center gap-1"
              title={`${attachmentCount} attachment(s)`}
            >
              <Paperclip className="w-3.5 h-3.5 text-[#4169E1]" />
              <span className="font-mono">{attachmentCount}</span>
            </span>
          )}

          {task.Points_Awarded !== undefined && task.Points_Awarded !== null && task.Status === 'Completed' && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                task.Points_Awarded > 0
                  ? 'text-[#16845B] bg-[#16845B]/10'
                  : 'text-[#D64545] bg-[#D64545]/10'
              }`}
            >
              +{task.Points_Awarded} pts
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {task.Status === 'Pending Assignment' ? (
            onAssignTask && (
              <button
                onClick={() => onAssignTask(task)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold neu-btn text-[#4169E1] hover:bg-[#4169E1] hover:text-white transition-all shadow-sm"
                title="Review and Assign this Task"
              >
                Review & Assign
              </button>
            )
          ) : (
            <>
              {task.Status !== 'Completed' && onCompleteTask && (
                <button
                  onClick={() => onCompleteTask(task)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold neu-btn text-[#16845B] hover:text-white hover:bg-[#16845B] transition-colors"
                  title="Mark Task as Completed"
                >
                  Complete
                </button>
              )}

              {task.Status !== 'Completed' && onRequestExtension && (
                <button
                  onClick={() => onRequestExtension(task)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold neu-btn text-[#D88A16] hover:text-[#202A38] transition-colors"
                  title="Request Deadline Extension"
                >
                  Extend
                </button>
              )}
            </>
          )}

          <button
            onClick={() => onViewDetails(task)}
            className="p-1.5 rounded-lg neu-btn text-[#4169E1] hover:text-[#3658C7]"
            title="View Full Task Details & Audit Trail"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
