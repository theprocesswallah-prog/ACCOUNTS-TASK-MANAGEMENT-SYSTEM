/**
 * Test Suite for Accounts Task Management System
 * Validates Points Calculation, Deadline Compliance, and Extension Approval rules
 * based on prompt requirements Section 10 & 16.
 */

import {
  calculateCompletionPoints,
  getTimeRemainingText,
  getISTCurrentDateStr,
  getISTCurrentTimeStr,
  formatISTTime12Hr
} from './pointsEngine';
import { Task } from '../types';

export function runPointsEngineTests(): { passed: number; failed: number; results: { name: string; success: boolean; details?: string }[] } {
  const results: { name: string; success: boolean; details?: string }[] = [];

  const baseTask: Task = {
    Task_ID: 'AT-2026-TEST1',
    Created_At: '2026-10-14T09:00:00Z',
    Created_By: 'Priya Nair',
    Created_By_Email: 'priya@manufacturing.com',
    Department: 'Accounts & Finance',
    Task_Title: 'Test Invoice Voucher Reconciliation',
    Task_Description: 'Test task',
    Assigned_To: 'Amit Patel',
    Assigned_To_Email: 'amit@manufacturing.com',
    Priority: 'High',
    Task_Type: 'Regular Task',
    Start_Date: '2026-10-14',
    Start_Time: '09:00',
    Deadline_Date: '2026-10-14',
    Deadline_Time: '17:00',
    Is_Hourly_Task: false,
    Status: 'In Progress',
    Attachment_URLs: '[]',
    Original_Deadline: '2026-10-14T17:00:00.000Z',
    Current_Deadline: '2026-10-14T17:00:00.000Z',
    Extension_Status: 'None',
    Updated_At: '2026-10-14T09:00:00Z',
    Is_Archived: false,
  };

  // Test 1: Completed on or before original deadline -> 5 points
  {
    const completedAt = '2026-10-14T16:30:00.000Z'; // 30 mins early
    const res = calculateCompletionPoints(baseTask, completedAt);
    const success = res.points === 5 && res.isOnTime === true;
    results.push({
      name: 'Scenario 7: Completed on or before original applicable deadline awards exactly 5 points',
      success,
      details: success ? undefined : `Expected 5 points, got ${res.points}`,
    });
  }

  // Test 2: Completed after original deadline -> 0 points
  {
    const completedAt = '2026-10-14T17:30:00.000Z'; // 30 mins late
    const res = calculateCompletionPoints(baseTask, completedAt);
    const success = res.points === 0 && res.isOnTime === false;
    results.push({
      name: 'Scenario 8: Completed after applicable deadline awards 0 points',
      success,
      details: success ? undefined : `Expected 0 points, got ${res.points}`,
    });
  }

  // Test 3: Approved extension - completed on or before approved extension -> 5 points
  {
    const extTask: Task = {
      ...baseTask,
      Extension_Status: 'Approved',
      Approved_Extension_Deadline: '2026-10-15T12:00:00.000Z',
      Current_Deadline: '2026-10-15T12:00:00.000Z',
    };
    const completedAt = '2026-10-15T11:45:00.000Z';
    const res = calculateCompletionPoints(extTask, completedAt);
    const success = res.points === 5 && res.isOnTime === true;
    results.push({
      name: 'Scenario 10: Completed before approved extended deadline awards 5 points',
      success,
      details: success ? undefined : `Expected 5 points, got ${res.points}`,
    });
  }

  // Test 4: Approved extension - completed after approved extension -> 0 points
  {
    const extTask: Task = {
      ...baseTask,
      Extension_Status: 'Approved',
      Approved_Extension_Deadline: '2026-10-15T12:00:00.000Z',
      Current_Deadline: '2026-10-15T12:00:00.000Z',
    };
    const completedAt = '2026-10-15T13:00:00.000Z';
    const res = calculateCompletionPoints(extTask, completedAt);
    const success = res.points === 0 && res.isOnTime === false;
    results.push({
      name: 'Scenario 11: Completed after approved extended deadline awards 0 points',
      success,
      details: success ? undefined : `Expected 0 points, got ${res.points}`,
    });
  }

  // Test 5: Completed with extension request pending, but after original effective deadline -> 0 points
  {
    const pendingTask: Task = {
      ...baseTask,
      Extension_Status: 'Requested',
      Current_Deadline: '2026-10-14T17:00:00.000Z',
    };
    const completedAt = '2026-10-14T18:00:00.000Z';
    const res = calculateCompletionPoints(pendingTask, completedAt);
    const success = res.points === 0 && res.isOnTime === false;
    results.push({
      name: 'Rule 10: Extension pending but completed after current deadline awards 0 points',
      success,
      details: success ? undefined : `Expected 0 points, got ${res.points}`,
    });
  }

  // Test 6: Remaining time text formatting
  {
    const futureDate = new Date(Date.now() + 90 * 60000); // 1.5 hours in future
    const res = getTimeRemainingText(futureDate);
    const success = !res.isOverdue && res.isDueSoon === true;
    results.push({
      name: 'Remaining time countdown identifies Due Soon (< 2 hours)',
      success,
      details: success ? undefined : `isDueSoon should be true`,
    });
  }

  // Test 7: IST Current Date format YYYY-MM-DD
  {
    const dStr = getISTCurrentDateStr();
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(dStr);
    results.push({
      name: 'Asia/Kolkata date format returns valid YYYY-MM-DD string',
      success: isValid,
      details: isValid ? undefined : `Invalid date format: ${dStr}`,
    });
  }

  // Test 8: IST Current Time format HH:mm and 12-hour AM/PM formatting
  {
    const tStr = getISTCurrentTimeStr();
    const isValidTime = /^\d{2}:\d{2}$/.test(tStr);
    const formatted12 = formatISTTime12Hr(tStr);
    const isValid12 = /^\d{2}:\d{2}\s(AM|PM)$/.test(formatted12);
    results.push({
      name: 'Asia/Kolkata time format returns valid 24-hr and 12-hr values',
      success: isValidTime && isValid12,
      details: (isValidTime && isValid12) ? undefined : `Time: ${tStr}, 12Hr: ${formatted12}`,
    });
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { passed, failed, results };
}
