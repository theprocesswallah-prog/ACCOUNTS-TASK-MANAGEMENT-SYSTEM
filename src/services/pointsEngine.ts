/**
 * Points Engine & Deadline Evaluation
 * Implements strict rules specified in Section 10 of prompt.
 * Evaluates completion against original or approved extended deadline in Asia/Kolkata (IST).
 */

import { Task } from '../types';

export interface PointsCalculationResult {
  points: number;
  reason: string;
  isOnTime: boolean;
  effectiveDeadline: Date;
  completedAt: Date;
  differenceMinutes: number; // positive = early/on-time, negative = late
}

/**
 * Normalizes date input (ISO or YYYY-MM-DD HH:mm or Date) into a valid timestamp
 */
export function parseDateSafe(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  
  // If string contains date and time like "2026-10-15 17:30"
  if (typeof input === 'string') {
    const clean = input.trim().replace(' ', 'T');
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
  }
  
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Computes India Standard Time (IST, UTC+05:30) Date object representation
 */
export function getISTNow(): Date {
  const now = new Date();
  // Get UTC time + 5 hours 30 mins
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 3600000;
  return new Date(utc + istOffset);
}

/**
 * Returns current date in Asia/Kolkata timezone formatted as "YYYY-MM-DD"
 */
export function getISTCurrentDateStr(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value || '2026';
  const m = parts.find((p) => p.type === 'month')?.value || '01';
  const d = parts.find((p) => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

/**
 * Returns current time in Asia/Kolkata timezone formatted as "HH:mm" (24-hour)
 */
export function getISTCurrentTimeStr(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  let h = parts.find((p) => p.type === 'hour')?.value || '00';
  if (h === '24') h = '00';
  const m = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Formats 24-hr time or Date string to 12-hour AM/PM in Asia/Kolkata
 */
export function formatISTTime12Hr(dateOrTimeStr?: string | Date): string {
  if (!dateOrTimeStr) {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (typeof dateOrTimeStr === 'string' && dateOrTimeStr.includes(':') && !dateOrTimeStr.includes('T') && !dateOrTimeStr.includes('-')) {
    const [hStr, mStr] = dateOrTimeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }
  const d = parseDateSafe(dateOrTimeStr);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date string or Date into a human readable IST date: e.g. "14 Oct 2026"
 */
export function formatISTDate(input: string | Date | undefined | null): string {
  if (!input) return '—';
  const d = parseDateSafe(input);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date into a human readable IST string: e.g. "14 Oct 2026, 05:30 PM IST"
 */
export function formatISTDateTime(input: string | Date | undefined | null): string {
  if (!input) return '—';
  const d = parseDateSafe(input);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats time remaining until deadline
 */
export function getTimeRemainingText(deadlineInput: string | Date): {
  text: string;
  isOverdue: boolean;
  isDueSoon: boolean; // within 2 hours
  minutesRemaining: number;
} {
  const deadline = parseDateSafe(deadlineInput);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const minutesRemaining = Math.floor(diffMs / 60000);

  if (diffMs <= 0) {
    const pastMinutes = Math.abs(minutesRemaining);
    if (pastMinutes < 60) {
      return {
        text: `Overdue by ${pastMinutes}m`,
        isOverdue: true,
        isDueSoon: false,
        minutesRemaining,
      };
    }
    const pastHours = Math.floor(pastMinutes / 60);
    const remainingMins = pastMinutes % 60;
    if (pastHours < 24) {
      return {
        text: `Overdue by ${pastHours}h ${remainingMins}m`,
        isOverdue: true,
        isDueSoon: false,
        minutesRemaining,
      };
    }
    const pastDays = Math.floor(pastHours / 24);
    return {
      text: `Overdue by ${pastDays}d ${pastHours % 24}h`,
      isOverdue: true,
      isDueSoon: false,
      minutesRemaining,
    };
  }

  // Future deadline
  const isDueSoon = minutesRemaining <= 120; // 2 hours
  if (minutesRemaining < 60) {
    return {
      text: `${minutesRemaining}m left`,
      isOverdue: false,
      isDueSoon,
      minutesRemaining,
    };
  }
  const hours = Math.floor(minutesRemaining / 60);
  const mins = minutesRemaining % 60;
  if (hours < 24) {
    return {
      text: `${hours}h ${mins}m left`,
      isOverdue: false,
      isDueSoon,
      minutesRemaining,
    };
  }
  const days = Math.floor(hours / 24);
  return {
    text: `${days}d ${hours % 24}h left`,
    isOverdue: false,
    isDueSoon,
    minutesRemaining,
  };
}

/**
 * Calculates points awarded on completion according to Section 10 rules
 */
export function calculateCompletionPoints(
  task: Task,
  completedAtInput?: string | Date
): PointsCalculationResult {
  const completedAt = completedAtInput ? parseDateSafe(completedAtInput) : new Date();

  // If task has an approved extension, the applicable deadline is Approved_Extension_Deadline
  let applicableDeadlineStr = task.Original_Deadline || `${task.Deadline_Date}T${task.Deadline_Time || '18:00'}`;
  let hadApprovedExtension = false;

  if (task.Extension_Status === 'Approved' && task.Approved_Extension_Deadline) {
    applicableDeadlineStr = task.Approved_Extension_Deadline;
    hadApprovedExtension = true;
  }

  const effectiveDeadline = parseDateSafe(applicableDeadlineStr);
  const diffMs = effectiveDeadline.getTime() - completedAt.getTime();
  // Allow a tiny 60-second grace buffer for network transit latency
  const differenceMinutes = Math.floor((diffMs + 60000) / 60000);
  const isOnTime = differenceMinutes >= 0;

  if (isOnTime) {
    if (hadApprovedExtension) {
      return {
        points: 5,
        reason: 'Completed on or before approved extended deadline (+5 pts)',
        isOnTime: true,
        effectiveDeadline,
        completedAt,
        differenceMinutes,
      };
    }
    return {
      points: 5,
      reason: 'Completed on or before original deadline (+5 pts)',
      isOnTime: true,
      effectiveDeadline,
      completedAt,
      differenceMinutes,
    };
  }

  // Late completion
  if (task.Extension_Status === 'Requested') {
    return {
      points: 0,
      reason: 'Completed after deadline while extension request was pending approval (0 pts)',
      isOnTime: false,
      effectiveDeadline,
      completedAt,
      differenceMinutes,
    };
  }

  if (hadApprovedExtension) {
    return {
      points: 0,
      reason: 'Completed after approved extended deadline (0 pts)',
      isOnTime: false,
      effectiveDeadline,
      completedAt,
      differenceMinutes,
    };
  }

  return {
    points: 0,
    reason: 'Completed after original deadline (0 pts)',
    isOnTime: false,
    effectiveDeadline,
    completedAt,
    differenceMinutes,
  };
}
