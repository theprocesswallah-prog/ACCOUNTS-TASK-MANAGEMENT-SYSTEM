/**
 * Unified API Client for Accounts Task Management System
 * ALFA INTERCONTINENTAL LIMITED
 * 
 * Direct, permanent connection to Google Sheets via Google Apps Script Web App API.
 * Mock/demo fallback arrays have been completely removed.
 * All task reads, writes, status changes, assignments, extensions, and scoring
 * reflect real records in the centralized Google Spreadsheet.
 */

import {
  Task,
  Employee,
  TaskHistory,
  ExtensionRequest,
  EmployeeScorecard,
  ApiResponse,
  Priority,
  TaskType,
  TaskStatus,
  ExternalTaskRequestPayload,
  TaskAssignmentPayload,
} from '../types';
import { getAppsScriptUrl } from '../config';
import { getISTCurrentDateStr, getISTCurrentTimeStr } from './pointsEngine';

const STORAGE_ACTIVE_USER = 'accounts_task_active_user';

// Clean up any stale mock/demo keys from older versions of the app in user browsers
try {
  localStorage.removeItem('accounts_tasks_data_v1');
  localStorage.removeItem('accounts_employees_data_v1');
  localStorage.removeItem('accounts_extensions_data_v1');
  localStorage.removeItem('accounts_history_data_v1');
  localStorage.removeItem('accounts_scorecards_data_v1');
  localStorage.removeItem('accounts_config_data_v1');
  localStorage.removeItem('accounts_task_demo_mode');
  localStorage.removeItem('accounts_task_apps_script_url');
} catch (e) {
  // Safe ignore in restricted/cookie-blocked environments
}

/**
 * Returns currently selected active user for internal Accounts sessions.
 * Defaults to Ahmed Arshi (Accounts HOD) from the official spreadsheet schema.
 */
export function getActiveUser(): Employee {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_USER);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.Employee_ID && parsed.Employee_Name) {
        return parsed;
      }
    }
  } catch (e) {}

  return {
    Employee_ID: 'EMP-001',
    Employee_Name: 'Ahmed Arshi',
    Email: 'ahmed.arshi@alfaic.org',
    Department: 'Accounts & Finance',
    Role: 'Administrator',
    Is_Active: true,
    Created_At: new Date().toISOString(),
    Avatar_Color: '#1E3A8A',
  };
}

/**
 * Persists the selected active user in browser storage
 */
export function setActiveUser(emp: Employee): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_USER, JSON.stringify(emp));
  } catch (e) {}
}

/**
 * Clears local user cache to force fresh pull from Google Sheets
 */
export function resetLocalData(): void {
  try {
    localStorage.removeItem(STORAGE_ACTIVE_USER);
    localStorage.removeItem('accounts_task_apps_script_url');
  } catch (e) {}
}

/**
 * Executes remote Apps Script Web App HTTP call with reliable CORS & timeout handling
 */
async function callAppsScript<T = any>(
  method: 'GET' | 'POST',
  action: string,
  payload: any = {},
  user: Partial<Employee> = getActiveUser(),
  retryCount: number = 2
): Promise<ApiResponse<T>> {
  const baseUrl = getAppsScriptUrl();
  if (!baseUrl) {
    return { success: false, error: 'Google Apps Script backend URL is not configured.' };
  }

  const controller = new AbortController();
  // 40s timeout to handle mobile cellular networks and Apps Script cold-starts
  const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    let response: Response;
    if (method === 'GET') {
      const url = new URL(baseUrl);
      url.searchParams.set('action', action);
      if (user?.Email) {
        url.searchParams.set('userEmail', user.Email);
      }
      if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach((k) => {
          if (payload[k] !== undefined && payload[k] !== null) {
            url.searchParams.set(k, String(payload[k]));
          }
        });
      }
      response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        signal: controller.signal,
      });
    } else {
      // POST requests use text/plain;charset=utf-8 to bypass CORS preflight in Google Apps Script
      response = await fetch(baseUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
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
      if (retryCount > 0) {
        const delay = (3 - retryCount) * 1500;
        await new Promise((res) => setTimeout(res, delay));
        return callAppsScript<T>(method, action, payload, user, retryCount - 1);
      }
      return {
        success: false,
        error: `Server HTTP error ${response.status}: ${response.statusText}`,
      };
    }

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      if (retryCount > 0) {
        await new Promise((res) => setTimeout(res, 1500));
        return callAppsScript<T>(method, action, payload, user, retryCount - 1);
      }
      return {
        success: false,
        error: 'Google Sheets backend returned a service response page. The spreadsheet may be temporarily busy. Please retry in a moment.',
      };
    }
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (retryCount > 0) {
      await new Promise((res) => setTimeout(res, 1500));
      return callAppsScript<T>(method, action, payload, user, retryCount - 1);
    }
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request to Google Sheets backend timed out.' };
    }
    return {
      success: false,
      error: error.message || 'Unable to connect to Google Sheets backend.',
    };
  }
}

/**
 * Real API Service connected directly to Google Sheets
 */
export const api = {
  /**
   * Health check to verify Apps Script backend connectivity and latency
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
      const res = await fetch(pingUrl.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            success: true,
            message: `Connected to Google Sheets in ${elapsed}ms! Server IST: ${json.serverTimeIST || 'OK'}`,
            latencyMs: elapsed,
          };
        }
        return { success: false, message: json.error || 'Server returned unsuccessful response.' };
      }
      return { success: false, message: `Server replied with HTTP status ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Connection failed: ${e.message}` };
    }
  },

  /**
   * Coordinated fetch of all dashboard data without causing Apps Script concurrency lock contention.
   * Fetches bootstrap data (employees, active tasks, scorecards, extensions) and allTasks sequentially.
   */
  async syncDashboardData(): Promise<{
    allTasks: Task[];
    employees: Employee[];
    extensions: ExtensionRequest[];
    scorecards: EmployeeScorecard[];
    serverTimeIST?: string;
    error?: string;
  }> {
    // 1. Fetch bootstrap (contains employees, scorecards, extensions, active tasks)
    const bootRes = await callAppsScript<{
      employees: Employee[];
      scorecards: EmployeeScorecard[];
      pendingExtensions: ExtensionRequest[];
      activeTasks: Task[];
      serverTimeIST?: string;
    }>('GET', 'getAppBootstrap', {}, getActiveUser(), 2);

    let allTasks: Task[] = [];
    let employees: Employee[] = [];
    let extensions: ExtensionRequest[] = [];
    let scorecards: EmployeeScorecard[] = [];
    let serverTimeIST: string | undefined;

    if (bootRes.success && bootRes.data) {
      employees = (bootRes.data.employees || []).filter(
        (e) => e.Employee_Name && e.Employee_Name.trim().length > 0 && e.Is_Active !== false
      );
      scorecards = (bootRes.data.scorecards || []).filter(
        (s) => s.Employee_Name && s.Employee_Name.trim().length > 0
      );
      extensions = bootRes.data.pendingExtensions || [];
      serverTimeIST = bootRes.data.serverTimeIST;
      allTasks = bootRes.data.activeTasks || [];

      // Sequentially fetch full task archive if available
      try {
        const tasksRes = await callAppsScript<Task[]>('GET', 'getAllTasks', {}, getActiveUser(), 1);
        if (tasksRes.success && Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
          allTasks = tasksRes.data;
        }
      } catch (e) {
        // Safe ignore, activeTasks from bootstrap is already active
      }

      return {
        allTasks,
        employees,
        extensions,
        scorecards,
        serverTimeIST,
      };
    }

    // Fallback: If bootstrap failed, try getAllTasks directly
    const fallbackRes = await callAppsScript<Task[]>('GET', 'getAllTasks', {}, getActiveUser(), 2);
    if (fallbackRes.success && Array.isArray(fallbackRes.data)) {
      return {
        allTasks: fallbackRes.data,
        employees,
        extensions,
        scorecards,
        serverTimeIST,
      };
    }

    // If both failed, return error property gracefully instead of throwing
    return {
      allTasks: [],
      employees: [],
      extensions: [],
      scorecards: [],
      error: bootRes.error || fallbackRes.error || 'Failed to connect to Google Sheets backend.',
    };
  },

  /**
   * Returns employees list from Google Sheets EMPLOYEES tab
   */
  async getEmployees(): Promise<Employee[]> {
    const res = await callAppsScript<{ employees: Employee[] }>('GET', 'getAppBootstrap');
    if (res.success && res.data?.employees && Array.isArray(res.data.employees)) {
      return res.data.employees.filter(
        (e) => e.Employee_Name && e.Employee_Name.trim().length > 0 && e.Is_Active !== false
      );
    }
    if (res.error) {
      throw new Error(`Failed to load employees: ${res.error}`);
    }
    return [];
  },

  /**
   * Returns active tasks from Google Sheets TASKS tab (excludes Completed, Cancelled, Archived)
   */
  async getActiveTasks(): Promise<Task[]> {
    const res = await callAppsScript<Task[]>('GET', 'getActiveTasks');
    if (res.success && Array.isArray(res.data)) {
      return res.data.filter(
        (t) => t.Status !== 'Completed' && t.Status !== 'Cancelled' && !t.Is_Archived
      );
    }
    if (res.error) {
      throw new Error(`Failed to load active tasks: ${res.error}`);
    }
    return [];
  },

  /**
   * Returns all tasks from Google Sheets (for task list, reports, audit)
   */
  async getAllTasks(): Promise<Task[]> {
    const res = await callAppsScript<Task[]>('GET', 'getAllTasks');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    if (res.error) {
      throw new Error(`Failed to load tasks: ${res.error}`);
    }
    return [];
  },

  /**
   * Creates an internal Accounts Task
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
    const res = await callAppsScript<any>('POST', 'createTask', taskData, user);
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to create task in Google Sheets.',
    };
  },

  /**
   * Inter-department External Task Submission (Intake Portal)
   * Receives task submission from Sales, Purchase, Store, Production, Dispatch, HR, Quality, etc.
   * Generates atomic Task_ID in Google Sheets, sets status to 'Pending Assignment', assigned to 'Unassigned'.
   * Never falls back to local storage or substitutes mock data.
   */
  async submitExternalTask(
    payload: ExternalTaskRequestPayload
  ): Promise<ApiResponse<Task>> {
    const authUser: Partial<Employee> = {
      Employee_ID: 'EXT-REQ',
      Employee_Name: payload.Requester_Name,
      Email: payload.Requester_Email || '',
      Department: payload.Requesting_Department,
      Role: 'Employee',
      Is_Active: true,
      Created_At: new Date().toISOString(),
    };

    const res = await callAppsScript<any>('POST', 'submitExternalTask', payload, authUser);

    if (res.success && res.data) {
      const taskId = res.data.Task_ID;
      const deadlineTime = payload.Requested_Deadline_Time || '18:00';
      const deadlineDate = payload.Requested_Deadline_Date;
      const originalDeadline = `${deadlineDate}T${deadlineTime}:00`;
      const nowIso = new Date().toISOString();
      const startDate = payload.Requested_Start_Date || getISTCurrentDateStr();
      const startTime = getISTCurrentTimeStr();

      const createdTask: Task = {
        Task_ID: taskId,
        Created_At: nowIso,
        Created_By: payload.Requester_Name,
        Created_By_Email: payload.Requester_Email || '',
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

        // Intake metadata
        Request_Source: 'External',
        Requesting_Department: payload.Requesting_Department,
        Requester_Name: payload.Requester_Name,
        Requester_Email: payload.Requester_Email || '',
        Requester_Contact: payload.Requester_Contact || '',
        Reference_Number: payload.Reference_Number || '',
        Requested_Priority: payload.Priority_Requested,
        Requested_Start_Date: startDate,
        Requested_Deadline: originalDeadline,
      };

      return {
        success: true,
        data: createdTask,
        message: res.message || `Task ${taskId} submitted successfully. Awaiting Accounts assignment.`,
      };
    }

    return {
      success: false,
      error: res.error || 'Failed to submit external task to Google Sheets backend.',
    };
  },

  /**
   * Assigns an incoming external task to an Accounts employee
   */
  async assignTask(
    payload: TaskAssignmentPayload,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    const res = await callAppsScript<Task>('POST', 'assignTask', payload, user);
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to assign task in Google Sheets.',
    };
  },

  /**
   * Updates task status in Google Sheets
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    notes: string = '',
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    const res = await callAppsScript<Task>(
      'POST',
      'updateTaskStatus',
      { Task_ID: taskId, Status: newStatus, Notes: notes },
      user
    );
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to update task status in Google Sheets.',
    };
  },

  /**
   * Requests a deadline extension
   */
  async requestExtension(
    taskId: string,
    requestedDeadline: string,
    reason: string,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<ExtensionRequest>> {
    const res = await callAppsScript<ExtensionRequest>(
      'POST',
      'requestTaskExtension',
      { Task_ID: taskId, Requested_Deadline: requestedDeadline, Reason: reason },
      user
    );
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to request extension in Google Sheets.',
    };
  },

  /**
   * Reviews and approves/rejects an extension request
   */
  async reviewExtension(
    requestId: string,
    decision: 'Approved' | 'Rejected',
    reviewComments: string,
    approvedDeadline?: string,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<ExtensionRequest>> {
    const res = await callAppsScript<ExtensionRequest>(
      'POST',
      'reviewTaskExtension',
      {
        Request_ID: requestId,
        Decision: decision,
        Review_Comments: reviewComments,
        Approved_Deadline: approvedDeadline,
      },
      user
    );
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to review extension in Google Sheets.',
    };
  },

  /**
   * Completes a task with server-side points scoring in Google Sheets
   */
  async completeTask(
    taskId: string,
    completionNotes: string,
    attachments: any[] = [],
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    const res = await callAppsScript<Task>(
      'POST',
      'completeTask',
      {
        Task_ID: taskId,
        Completion_Notes: completionNotes,
        Attachment_URLs: attachments,
        Completed_By: user.Employee_Name,
      },
      user
    );
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to complete task in Google Sheets.',
    };
  },

  /**
   * Cancels a task in Google Sheets
   */
  async cancelTask(
    taskId: string,
    reason: string,
    user: Employee = getActiveUser()
  ): Promise<ApiResponse<Task>> {
    const res = await callAppsScript<Task>(
      'POST',
      'cancelTask',
      { Task_ID: taskId, Reason: reason },
      user
    );
    if (res.success) {
      return res;
    }
    return {
      success: false,
      error: res.error || 'Failed to cancel task in Google Sheets.',
    };
  },

  /**
   * Uploads file attachment to Google Drive folder
   */
  async uploadAttachment(
    file: File,
    user: Partial<Employee> = getActiveUser()
  ): Promise<{ name: string; url: string; size: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const res = await callAppsScript(
            'POST',
            'uploadAttachment',
            { name: file.name, type: file.type, base64: base64Data },
            user as Employee
          );
          if (res.success && res.data?.url) {
            resolve({ name: file.name, url: res.data.url, size: file.size });
            return;
          }
        } catch (e) {
          console.warn('Apps Script Drive upload failed, falling back to data URI', e);
        }
        // Fallback to data URI if Drive upload isn't accessible
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
   * Returns extension requests list from Google Sheets EXTENSION_REQUESTS tab
   */
  async getExtensionRequests(): Promise<ExtensionRequest[]> {
    const res = await callAppsScript<ExtensionRequest[]>('GET', 'getExtensionRequests');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    if (res.error) {
      throw new Error(`Failed to load extension requests: ${res.error}`);
    }
    return [];
  },

  /**
   * Returns real-time employee scorecards from Google Sheets EMPLOYEE_SCORECARD tab
   */
  async getScorecards(): Promise<EmployeeScorecard[]> {
    const res = await callAppsScript<EmployeeScorecard[]>('GET', 'getEmployeeScorecard');
    if (res.success && Array.isArray(res.data)) {
      return res.data.filter((s) => s.Employee_Name && s.Employee_Name.trim().length > 0);
    }
    if (res.error) {
      throw new Error(`Failed to load scorecards: ${res.error}`);
    }
    return [];
  },

  /**
   * Returns audit trail history from Google Sheets TASK_HISTORY tab
   */
  async getTaskHistory(taskId?: string): Promise<TaskHistory[]> {
    const res = await callAppsScript<TaskHistory[]>('GET', 'getTaskHistory', taskId ? { taskId } : {});
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    if (res.error) {
      throw new Error(`Failed to load task history: ${res.error}`);
    }
    return [];
  },
};
