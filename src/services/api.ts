/**
 * Unified API Client for Accounts Task Management System
 * Communicates with Google Apps Script Web App when configured,
 * or runs full-fidelity local state persistence with identical schemas and points scoring.
 */

import {
  Task,
  Employee,
  TaskHistory,
  ExtensionRequest,
  EmployeeScorecard,
  AppConfig,
  ApiResponse,
  Priority,
  TaskType,
  TaskStatus,
  ExternalTaskRequestPayload,
  TaskAssignmentPayload,
} from '../types';
import { getAppsScriptUrl, isAppsScriptConfigured } from '../config';
import {
  INITIAL_TASKS,
  INITIAL_EMPLOYEES,
  INITIAL_EXTENSION_REQUESTS,
  INITIAL_TASK_HISTORY,
  INITIAL_SCORECARDS,
  INITIAL_CONFIG,
} from './seedData';
import { calculateCompletionPoints, getISTCurrentDateStr, getISTCurrentTimeStr } from './pointsEngine';

const STORAGE_KEYS = {
  TASKS: 'accounts_tasks_data_v1',
  EMPLOYEES: 'accounts_employees_data_v1',
  EXTENSIONS: 'accounts_extensions_data_v1',
  HISTORY: 'accounts_history_data_v1',
  SCORECARDS: 'accounts_scorecards_data_v1',
  CONFIG: 'accounts_config_data_v1',
  ACTIVE_USER: 'accounts_active_user_v1',
};

// Initialize LocalStorage with seed data if not present
function initializeLocalStore() {
  if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXTENSIONS)) {
    localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(INITIAL_EXTENSION_REQUESTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_TASK_HISTORY));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCORECARDS)) {
    localStorage.setItem(STORAGE_KEYS.SCORECARDS, JSON.stringify(INITIAL_SCORECARDS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_USER)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(INITIAL_EMPLOYEES[0]));
  }
}

initializeLocalStore();

export function getActiveUser(): Employee {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_EMPLOYEES[0];
}

export function setActiveUser(emp: Employee): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(emp));
}

export function resetLocalData(): void {
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
  localStorage.removeItem(STORAGE_KEYS.EXTENSIONS);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.SCORECARDS);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  initializeLocalStore();
}

/**
 * Executes remote Apps Script Web App call with timeout
 */
async function callAppsScript<T = any>(
  method: 'GET' | 'POST',
  action: string,
  payload: any = {},
  user: Employee = getActiveUser()
): Promise<ApiResponse<T>> {
  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    throw new Error('Google Apps Script URL is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    let response: Response;
    if (method === 'GET') {
      const url = new URL(baseUrl);
      url.searchParams.set('action', action);
      url.searchParams.set('userEmail', user.Email);
      if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach((k) => url.searchParams.set(k, String(payload[k])));
      }
      response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });
    } else {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Preferred for Apps Script CORS
        },
        body: JSON.stringify({
          action,
          payload,
          authUser: user,
          requestId: 'REQ-' + Date.now(),
        }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request to Google Apps Script timed out.' };
    }
    return { success: false, error: error.message || 'Network error occurred.' };
  }
}

/**
 * API Service Object
 */
export const api = {
  /**
   * Health check to test Apps Script URL
   */
  async healthCheck(customUrl?: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const url = customUrl || getAppsScriptUrl();
    if (!url) {
      return { success: false, message: 'Apps Script URL is not configured.' };
    }

    const start = performance.now();
    try {
      const pingUrl = new URL(url);
      pingUrl.searchParams.set('action', 'healthCheck');
      const res = await fetch(pingUrl.toString(), { method: 'GET' });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            success: true,
            message: `Connected successfully in ${elapsed}ms! Server IST: ${json.serverTimeIST || 'OK'}`,
            latencyMs: elapsed,
          };
        }
      }
      return { success: false, message: `Server replied with status ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Connection failed: ${e.message}` };
    }
  },

  /**
   * Returns employees list
   */
  async getEmployees(): Promise<Employee[]> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<{ employees: Employee[] }>('GET', 'getAppBootstrap');
        if (res.success && res.data?.employees && res.data.employees.length > 0) {
          return res.data.employees;
        }
      } catch (e) {
        console.warn('Apps Script fetch failed, using local store', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
  },

  /**
   * 7. GET ACTIVE TASKS
   * Excludes completed and cancelled tasks.
   */
  async getActiveTasks(): Promise<Task[]> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<Task[]>('GET', 'getActiveTasks');
        if (res.success && Array.isArray(res.data)) {
          // Double safeguard to guarantee completed/cancelled are not on live active board
          return res.data.filter((t) => t.Status !== 'Completed' && t.Status !== 'Cancelled' && !t.Is_Archived);
        }
      } catch (e) {
        console.warn('Live active tasks fetch failed, falling back', e);
      }
    }

    // Local storage path
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = raw ? JSON.parse(raw) : INITIAL_TASKS;
    return tasks.filter((t) => t.Status !== 'Completed' && t.Status !== 'Cancelled' && !t.Is_Archived);
  },

  /**
   * Returns all tasks (for reports, completed list, audit)
   */
  async getAllTasks(): Promise<Task[]> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<Task[]>('GET', 'getAllTasks');
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (e) {
        console.warn('Live all tasks fetch failed', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    return raw ? JSON.parse(raw) : INITIAL_TASKS;
  },

  /**
   * 6. CREATE TASK
   */
  async createTask(
    taskData: {
      Task_Title: string;
      Task_Description: string;
      Assigned_To: string;
      Assigned_To_Email?: string;
      Priority: Priority;
      Task_Type: TaskType;
      Start_Date: string;
      Start_Time: string;
      Deadline_Date: string;
      Deadline_Time: string;
      Is_Hourly_Task: boolean;
      Estimated_Duration_Hours?: number;
      Attachment_URLs?: any[];
      Department?: string;
    },
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<Task>('POST', 'createTask', taskData, user);
        if (res.success) return res;
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    // Local store implementation
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = raw ? JSON.parse(raw) : INITIAL_TASKS;

    const currentYear = new Date().getFullYear();
    const nextSeq = tasks.length + 1;
    const padded = String(nextSeq).padStart(5, '0');
    const taskId = `AT-${currentYear}-${padded}`;

    const originalDeadline = `${taskData.Deadline_Date}T${taskData.Deadline_Time || '18:00'}:00`;
    const nowIso = new Date().toISOString();

    const newTask: Task = {
      Task_ID: taskId,
      Created_At: nowIso,
      Created_By: user.Employee_Name,
      Created_By_Email: user.Email,
      Department: taskData.Department || 'Accounts & Finance',
      Task_Title: taskData.Task_Title,
      Task_Description: taskData.Task_Description || '',
      Assigned_To: taskData.Assigned_To,
      Assigned_To_Email: taskData.Assigned_To_Email || '',
      Priority: taskData.Priority,
      Task_Type: taskData.Task_Type,
      Start_Date: taskData.Start_Date,
      Start_Time: taskData.Start_Time,
      Deadline_Date: taskData.Deadline_Date,
      Deadline_Time: taskData.Deadline_Time,
      Is_Hourly_Task: taskData.Is_Hourly_Task,
      Estimated_Duration_Hours: taskData.Estimated_Duration_Hours || 0,
      Status: 'Assigned',
      Attachment_URLs: typeof taskData.Attachment_URLs === 'string'
        ? taskData.Attachment_URLs
        : JSON.stringify(taskData.Attachment_URLs || []),
      Original_Deadline: originalDeadline,
      Current_Deadline: originalDeadline,
      Extension_Status: 'None',
      Request_Source: 'Internal',
      Updated_At: nowIso,
      Is_Archived: false,
    };

    tasks.unshift(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    // Audit history entry
    this.recordLocalHistory(
      taskId,
      'Task Created',
      '',
      `Assigned to ${taskData.Assigned_To}`,
      user,
      `Created: ${taskData.Task_Title}`
    );

    // Increment assigned in scorecard
    this.updateLocalScorecardStat(taskData.Assigned_To, 'Total_Tasks_Assigned');

    return {
      success: true,
      data: newTask,
      message: `Task ${taskId} created successfully.`,
    };
  },

  /**
   * 6B. SUBMIT EXTERNAL TASK REQUEST (Inter-department Intake Portal)
   * Receives task submission from Sales, Purchase, Store, Production, Dispatch, etc.
   * Generates atomic Task_ID, sets status to 'Pending Assignment', assigned to 'Unassigned'.
   */
  async submitExternalTask(
    payload: ExternalTaskRequestPayload
  ): Promise<ApiResponse<Task>> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<Task>('POST', 'submitExternalTask', payload, {
          Employee_ID: 'EXT-REQ',
          Employee_Name: payload.Requester_Name,
          Email: payload.Requester_Email,
          Department: payload.Requesting_Department,
          Role: 'Employee',
          Is_Active: true,
          Created_At: new Date().toISOString(),
        });
        if (res.success) return res;
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    // Local store implementation
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = raw ? JSON.parse(raw) : INITIAL_TASKS;

    const currentYear = new Date().getFullYear();
    const nextSeq = tasks.length + 1;
    const padded = String(nextSeq).padStart(5, '0');
    const taskId = `AT-${currentYear}-${padded}`;

    const deadlineTime = payload.Requested_Deadline_Time || '18:00';
    const deadlineDate = payload.Requested_Deadline_Date;
    const originalDeadline = `${deadlineDate}T${deadlineTime}:00`;
    const nowIso = new Date().toISOString();
    const startDate = payload.Requested_Start_Date || getISTCurrentDateStr();
    const startTime = getISTCurrentTimeStr();

    const newTask: Task = {
      Task_ID: taskId,
      Created_At: nowIso,
      Created_By: payload.Requester_Name,
      Created_By_Email: payload.Requester_Email,
      Department: 'Accounts & Finance',
      Task_Title: payload.Task_Title,
      Task_Description: payload.Task_Description,
      Assigned_To: 'Unassigned',
      Assigned_To_Email: '',
      Priority: payload.Priority_Requested,
      Task_Type: 'Regular Task',
      Start_Date: startDate,
      Start_Time: startTime,
      Deadline_Date: deadlineDate,
      Deadline_Time: deadlineTime,
      Is_Hourly_Task: false,
      Estimated_Duration_Hours: 0,
      Status: 'Pending Assignment',
      Attachment_URLs: typeof payload.Attachment_URLs === 'string'
        ? payload.Attachment_URLs
        : JSON.stringify(payload.Attachment_URLs || []),
      Original_Deadline: originalDeadline,
      Current_Deadline: originalDeadline,
      Extension_Status: 'None',
      Updated_At: nowIso,
      Is_Archived: false,

      // Multi-department intake fields
      Request_Source: 'External',
      Requesting_Department: payload.Requesting_Department,
      Requester_Name: payload.Requester_Name,
      Requester_Email: payload.Requester_Email,
      Requester_Contact: payload.Requester_Contact || '',
      Reference_Number: payload.Reference_Number || '',
      Requested_Priority: payload.Priority_Requested,
      Requested_Start_Date: startDate,
      Requested_Deadline: originalDeadline,
    };

    tasks.unshift(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    // Audit history entry
    this.recordLocalHistory(
      taskId,
      'External Task Request Submitted',
      '',
      `Pending Assignment (${payload.Requesting_Department})`,
      {
        Employee_ID: 'EXT-REQ',
        Employee_Name: payload.Requester_Name,
        Email: payload.Requester_Email,
        Department: payload.Requesting_Department,
        Role: 'Employee',
        Is_Active: true,
        Created_At: nowIso,
      },
      `Submitted by ${payload.Requester_Name} from ${payload.Requesting_Department}. Ref: ${payload.Reference_Number || 'N/A'}`
    );

    return {
      success: true,
      data: newTask,
      message: `Task ${taskId} submitted successfully. Awaiting Accounts assignment.`,
    };
  },

  /**
   * 6C. ASSIGN TASK TO ACCOUNTS EMPLOYEE
   * Performed by Accounts Manager / Admin to review incoming request and assign ownership.
   */
  async assignTask(
    assignment: TaskAssignmentPayload,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<Task>('POST', 'assignTask', assignment, user);
        if (res.success) return res;
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = raw ? JSON.parse(raw) : INITIAL_TASKS;
    const idx = tasks.findIndex((t) => t.Task_ID === assignment.Task_ID);
    if (idx === -1) return { success: false, error: 'Task not found.' };

    const task = tasks[idx];
    const prevAssignee = task.Assigned_To;
    const nowIso = new Date().toISOString();

    task.Assigned_To = assignment.Assigned_To;
    task.Assigned_To_Email = assignment.Assigned_To_Email || '';
    if (assignment.Priority) task.Priority = assignment.Priority;
    if (assignment.Task_Type) task.Task_Type = assignment.Task_Type;
    if (assignment.Start_Date) task.Start_Date = assignment.Start_Date;
    if (assignment.Start_Time) task.Start_Time = assignment.Start_Time;
    if (assignment.Deadline_Date) task.Deadline_Date = assignment.Deadline_Date;
    if (assignment.Deadline_Time) task.Deadline_Time = assignment.Deadline_Time;
    if (typeof assignment.Is_Hourly_Task === 'boolean') task.Is_Hourly_Task = assignment.Is_Hourly_Task;
    if (assignment.Estimated_Duration_Hours !== undefined) task.Estimated_Duration_Hours = assignment.Estimated_Duration_Hours;

    const newDeadline = `${task.Deadline_Date}T${task.Deadline_Time || '18:00'}:00`;
    task.Current_Deadline = newDeadline;
    if (!task.Original_Deadline) task.Original_Deadline = newDeadline;

    task.Status = 'Assigned';
    task.Assigned_By = user.Employee_Name;
    task.Assigned_At = nowIso;
    task.Assignment_Notes = assignment.Assignment_Notes || '';
    task.Updated_At = nowIso;

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    // Audit trail
    this.recordLocalHistory(
      task.Task_ID,
      'Task Assigned',
      prevAssignee || 'Unassigned',
      `Assigned to ${assignment.Assigned_To}`,
      user,
      `Assigned by ${user.Employee_Name}. Notes: ${assignment.Assignment_Notes || 'None'}`
    );

    // Update employee scorecard assigned count
    this.updateLocalScorecardStat(assignment.Assigned_To, 'Total_Tasks_Assigned');

    return {
      success: true,
      data: task,
      message: `Task ${task.Task_ID} assigned to ${assignment.Assigned_To}.`,
    };
  },

  /**
   * CANCEL TASK (by Accounts Manager or Administrator)
   */
  async cancelTask(
    taskId: string,
    reason: string = '',
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    if (isAppsScriptConfigured()) {
      try {
        return await callAppsScript('POST', 'cancelTask', { Task_ID: taskId, Reason: reason }, user);
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = raw ? JSON.parse(raw) : INITIAL_TASKS;
    const idx = tasks.findIndex((t) => t.Task_ID === taskId);
    if (idx === -1) return { success: false, error: 'Task not found.' };

    const oldStatus = tasks[idx].Status;
    tasks[idx].Status = 'Cancelled';
    tasks[idx].Updated_At = new Date().toISOString();
    tasks[idx].Completion_Notes = reason ? `Cancelled: ${reason}` : 'Cancelled by Accounts Desk';
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    this.recordLocalHistory(
      taskId,
      'Task Cancelled',
      oldStatus,
      'Cancelled',
      user,
      reason || 'Cancelled by Accounts Desk'
    );

    return {
      success: true,
      data: tasks[idx],
      message: `Task ${taskId} cancelled.`,
    };
  },

  /**
   * 8. UPDATE TASK STATUS
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    remarks: string = '',
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    if (isAppsScriptConfigured()) {
      try {
        return await callAppsScript('POST', 'updateTaskStatus', { Task_ID: taskId, Status: newStatus, Remarks: remarks }, user);
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = raw ? JSON.parse(raw) : INITIAL_TASKS;
    const idx = tasks.findIndex((t) => t.Task_ID === taskId);
    if (idx === -1) return { success: false, error: 'Task not found' };

    const oldStatus = tasks[idx].Status;
    if (oldStatus === 'Completed') {
      return { success: false, error: 'Completed task cannot be modified.' };
    }

    tasks[idx].Status = newStatus;
    tasks[idx].Updated_At = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    this.recordLocalHistory(taskId, 'Status Changed', oldStatus, newStatus, user, remarks || `Status set to ${newStatus}`);

    return {
      success: true,
      data: tasks[idx],
      message: `Status updated to ${newStatus}`,
    };
  },

  /**
   * 9. REQUEST DEADLINE EXTENSION
   */
  async requestExtension(
    taskId: string,
    reason: string,
    requestedDeadline: string,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<ExtensionRequest>> {
    if (isAppsScriptConfigured()) {
      try {
        return await callAppsScript('POST', 'requestTaskExtension', { Task_ID: taskId, Reason: reason, Requested_Deadline: requestedDeadline }, user);
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = rawTasks ? JSON.parse(rawTasks) : INITIAL_TASKS;
    const task = tasks.find((t) => t.Task_ID === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const rawExt = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    const extensions: ExtensionRequest[] = rawExt ? JSON.parse(rawExt) : INITIAL_EXTENSION_REQUESTS;

    const reqId = `EXT-${String(extensions.length + 1).padStart(5, '0')}`;
    const newReq: ExtensionRequest = {
      Request_ID: reqId,
      Task_ID: taskId,
      Task_Title: task.Task_Title,
      Requested_By: user.Employee_Name,
      Requested_By_Email: user.Email,
      Requested_At: new Date().toISOString(),
      Old_Deadline: task.Current_Deadline,
      Requested_Deadline: requestedDeadline,
      Reason: reason,
      Status: 'Pending',
    };

    extensions.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(extensions));

    // Update task status
    task.Status = 'Extension Requested';
    task.Extension_Status = 'Requested';
    task.Updated_At = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    this.recordLocalHistory(
      taskId,
      'Extension Requested',
      `Current: ${task.Current_Deadline}`,
      `Requested: ${requestedDeadline}`,
      user,
      reason
    );

    return {
      success: true,
      data: newReq,
      message: 'Extension request submitted successfully.',
    };
  },

  /**
   * 9. REVIEW EXTENSION (Approve / Reject)
   */
  async reviewExtension(
    requestId: string,
    decision: 'Approved' | 'Rejected',
    approvedDeadline?: string,
    comments?: string,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse> {
    if (user.Role !== 'Administrator' && user.Role !== 'Manager') {
      return { success: false, error: 'Permission Denied: Only Manager or Administrator can review extensions.' };
    }

    if (isAppsScriptConfigured()) {
      try {
        return await callAppsScript(
          'POST',
          'reviewTaskExtension',
          {
            Request_ID: requestId,
            Decision: decision,
            Approved_Deadline: approvedDeadline,
            Review_Comments: comments,
          },
          user
        );
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const rawExt = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    const extensions: ExtensionRequest[] = rawExt ? JSON.parse(rawExt) : INITIAL_EXTENSION_REQUESTS;
    const ext = extensions.find((e) => e.Request_ID === requestId);
    if (!ext) return { success: false, error: 'Extension request not found.' };

    ext.Status = decision;
    ext.Reviewed_By = user.Employee_Name;
    ext.Reviewed_At = new Date().toISOString();
    ext.Review_Comments = comments || '';
    localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(extensions));

    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = rawTasks ? JSON.parse(rawTasks) : INITIAL_TASKS;
    const task = tasks.find((t) => t.Task_ID === ext.Task_ID);

    if (task) {
      task.Status = 'In Progress';
      if (decision === 'Approved') {
        const finalDeadline = approvedDeadline || ext.Requested_Deadline;
        task.Current_Deadline = finalDeadline;
        task.Approved_Extension_Deadline = finalDeadline;
        task.Approved_By = user.Employee_Name;
        task.Approved_At = new Date().toISOString();
        task.Extension_Status = 'Approved';
        this.recordLocalHistory(
          task.Task_ID,
          'Extension Approved',
          ext.Old_Deadline,
          finalDeadline,
          user,
          comments || 'Extension approved'
        );
      } else {
        task.Extension_Status = 'Rejected';
        this.recordLocalHistory(
          task.Task_ID,
          'Extension Rejected',
          'Requested',
          'Rejected',
          user,
          comments || 'Extension rejected'
        );
      }
      task.Updated_At = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }

    return { success: true, message: `Extension ${decision.toLowerCase()} successfully.` };
  },

  /**
   * 10. COMPLETE TASK & CALCULATE POINTS
   * Removes immediately from active board, records points and scorecard atomically.
   */
  async completeTask(
    taskId: string,
    completionNotes: string,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<Task>(
          'POST',
          'completeTask',
          { Task_ID: taskId, Completion_Notes: completionNotes, Completed_By: user.Employee_Name },
          user
        );
        return res;
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: Task[] = rawTasks ? JSON.parse(rawTasks) : INITIAL_TASKS;
    const idx = tasks.findIndex((t) => t.Task_ID === taskId);
    if (idx === -1) return { success: false, error: 'Task not found.' };

    const task = tasks[idx];
    if (task.Status === 'Completed') {
      return { success: false, error: 'Task is already marked Completed. Duplicate scoring prevented.' };
    }

    const nowIso = new Date().toISOString();
    const scoring = calculateCompletionPoints(task, nowIso);

    task.Status = 'Completed';
    task.Completed_At = nowIso;
    task.Completed_By = user.Employee_Name;
    task.Completion_Notes = completionNotes;
    task.Points_Awarded = scoring.points;
    task.Points_Reason = scoring.reason;
    task.Updated_At = nowIso;

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    // Audit history entry
    this.recordLocalHistory(
      taskId,
      'Task Completed',
      'In Progress',
      `Completed (${scoring.points} pts awarded)`,
      user,
      `${scoring.reason}. Notes: ${completionNotes}`
    );

    // Update Scorecard
    const hadApprovedExt = task.Extension_Status === 'Approved';
    this.updateLocalScorecardOnCompletion(task.Assigned_To, scoring.isOnTime, hadApprovedExt, scoring.points);

    return {
      success: true,
      data: task,
      message: `Task completed! Awarded ${scoring.points} points.`,
    };
  },

  /**
   * Upload attachment simulation or Google Drive upload
   */
  async uploadAttachment(file: File, user: Employee = getActiveUser()): Promise<{ name: string; url: string; size: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        if (isAppsScriptConfigured()) {
          try {
            const res = await callAppsScript(
              'POST',
              'uploadAttachment',
              { name: file.name, type: file.type, base64: base64Data },
              user
            );
            if (res.success && res.data?.url) {
              resolve({ name: file.name, url: res.data.url, size: file.size });
              return;
            }
          } catch (e) {
            console.warn('Apps Script upload failed, using data URI', e);
          }
        }
        // Fallback data URL or blob
        resolve({
          name: file.name,
          url: reader.result as string,
          size: file.size,
        });
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Returns extension requests list
   */
  async getExtensionRequests(): Promise<ExtensionRequest[]> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<ExtensionRequest[]>('GET', 'getExtensionRequests');
        if (res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
    }
    const raw = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    return raw ? JSON.parse(raw) : INITIAL_EXTENSION_REQUESTS;
  },

  /**
   * Returns employee scorecards
   */
  async getScorecards(): Promise<EmployeeScorecard[]> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<EmployeeScorecard[]>('GET', 'getEmployeeScorecard');
        if (res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
    }
    const raw = localStorage.getItem(STORAGE_KEYS.SCORECARDS);
    return raw ? JSON.parse(raw) : INITIAL_SCORECARDS;
  },

  /**
   * Returns task audit history
   */
  async getTaskHistory(taskId?: string): Promise<TaskHistory[]> {
    if (isAppsScriptConfigured()) {
      try {
        const res = await callAppsScript<TaskHistory[]>('GET', 'getTaskHistory', { taskId });
        if (res.success && Array.isArray(res.data)) return res.data;
      } catch (e) {}
    }
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const history: TaskHistory[] = raw ? JSON.parse(raw) : INITIAL_TASK_HISTORY;
    if (taskId) {
      return history.filter((h) => h.Task_ID === taskId);
    }
    return history;
  },

  // Helper local operations
  recordLocalHistory(
    taskId: string,
    action: string,
    oldValue: string,
    newValue: string,
    user: Employee,
    remarks: string
  ) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const history: TaskHistory[] = raw ? JSON.parse(raw) : INITIAL_TASK_HISTORY;
      const historyId = `HIST-${String(history.length + 1).padStart(5, '0')}`;
      history.unshift({
        History_ID: historyId,
        Task_ID: taskId,
        Action: action,
        Old_Value: oldValue || '',
        New_Value: newValue || '',
        Performed_By: user.Employee_Name,
        Performed_By_Email: user.Email,
        Timestamp: new Date().toISOString(),
        Remarks: remarks || '',
      });
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {}
  },

  updateLocalScorecardStat(employeeName: string, field: 'Total_Tasks_Assigned') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCORECARDS);
      const scorecards: EmployeeScorecard[] = raw ? JSON.parse(raw) : INITIAL_SCORECARDS;
      const sc = scorecards.find((s) => s.Employee_Name === employeeName);
      if (sc) {
        sc[field] += 1;
        sc.Updated_At = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.SCORECARDS, JSON.stringify(scorecards));
      }
    } catch (e) {}
  },

  updateLocalScorecardOnCompletion(
    employeeName: string,
    isOnTime: boolean,
    hadApprovedExtension: boolean,
    points: number
  ) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCORECARDS);
      const scorecards: EmployeeScorecard[] = raw ? JSON.parse(raw) : INITIAL_SCORECARDS;
      let sc = scorecards.find((s) => s.Employee_Name === employeeName);
      if (!sc) {
        sc = {
          Employee_ID: `EMP-${scorecards.length + 1}`,
          Employee_Name: employeeName,
          Total_Tasks_Assigned: 1,
          Total_Tasks_Completed: 0,
          On_Time_Completions: 0,
          Late_Completions: 0,
          Approved_Extension_Completions: 0,
          Total_Points: 0,
          Updated_At: new Date().toISOString(),
        };
        scorecards.push(sc);
      }

      sc.Total_Tasks_Completed += 1;
      if (isOnTime) {
        sc.On_Time_Completions += 1;
        if (hadApprovedExtension) {
          sc.Approved_Extension_Completions += 1;
        }
      } else {
        sc.Late_Completions += 1;
      }
      sc.Total_Points += points;
      sc.Updated_At = new Date().toISOString();

      localStorage.setItem(STORAGE_KEYS.SCORECARDS, JSON.stringify(scorecards));
    } catch (e) {}
  },
};
