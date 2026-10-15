/**
 * Accounts Task Management System - Type Definitions
 * Aligned with Google Sheets Database Schema & Multi-Department Intake Architecture
 */

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskType = 'Regular Task' | 'Hourly Task';

export type TaskStatus = 
  | 'Pending Assignment'
  | 'Assigned'
  | 'Acknowledged'
  | 'In Progress'
  | 'Blocked'
  | 'Extension Requested'
  | 'Completed'
  | 'Cancelled';

export type ExtensionStatus = 'None' | 'Requested' | 'Approved' | 'Rejected';

export type UserRole = 'Administrator' | 'Manager' | 'Employee';

export type RequestSource = 'Internal' | 'External';

export const EXTERNAL_DEPARTMENTS = [
  'Sales',
  'Purchase',
  'Store',
  'Production',
  'Dispatch',
  'HR & Administration',
  'Quality',
  'Other'
] as const;

export type ExternalDepartment = typeof EXTERNAL_DEPARTMENTS[number];

export interface TaskAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  driveFileId?: string;
}

export interface Task {
  Task_ID: string;
  Created_At: string; // ISO string or IST formatted string
  Created_By: string;
  Created_By_Email: string;
  Department: string;
  Task_Title: string;
  Task_Description: string;
  Assigned_To: string;
  Assigned_To_Email: string;
  Priority: Priority;
  Task_Type: TaskType;
  Start_Date: string; // YYYY-MM-DD
  Start_Time: string; // HH:mm
  Deadline_Date: string; // YYYY-MM-DD
  Deadline_Time: string; // HH:mm
  Is_Hourly_Task: boolean;
  Estimated_Duration_Hours?: number;
  Status: TaskStatus;
  Attachment_URLs: string; // JSON array or comma separated URLs
  Completion_Notes?: string;
  Completed_At?: string;
  Completed_By?: string;
  Original_Deadline: string; // ISO / YYYY-MM-DD HH:mm
  Current_Deadline: string; // Effective deadline
  Extension_Status: ExtensionStatus;
  Approved_Extension_Deadline?: string;
  Approved_By?: string;
  Approved_At?: string;
  Points_Awarded?: number;
  Points_Reason?: string;
  Updated_At: string;
  Is_Archived: boolean;

  // Multi-department Intake Architecture Fields
  Request_Source?: RequestSource;
  Requesting_Department?: string;
  Requester_Name?: string;
  Requester_Email?: string;
  Requester_Contact?: string;
  Reference_Number?: string;
  Requested_Priority?: Priority;
  Requested_Start_Date?: string;
  Requested_Deadline?: string;
  Assigned_By?: string;
  Assigned_At?: string;
  Assignment_Notes?: string;
}

export interface ExternalTaskRequestPayload {
  Requesting_Department: string;
  Requester_Name: string;
  Requester_Email?: string;
  Requester_Contact?: string;
  Task_Title: string;
  Task_Description: string;
  Priority_Requested: Priority;
  Requested_Start_Date?: string;
  Requested_Deadline_Date: string;
  Requested_Deadline_Time: string;
  Reference_Number?: string;
  Attachment_URLs?: TaskAttachment[];
}

export interface TaskAssignmentPayload {
  Task_ID: string;
  Assigned_To: string;
  Assigned_To_Email?: string;
  Priority?: Priority;
  Task_Type?: TaskType;
  Start_Date?: string;
  Start_Time?: string;
  Deadline_Date?: string;
  Deadline_Time?: string;
  Is_Hourly_Task?: boolean;
  Estimated_Duration_Hours?: number;
  Assignment_Notes?: string;
}

export interface Employee {
  Employee_ID: string;
  Employee_Name: string;
  Email: string;
  Department: string;
  Role: UserRole;
  Is_Active: boolean;
  Created_At: string;
  Avatar_Color?: string;
}

export interface TaskHistory {
  History_ID: string;
  Task_ID: string;
  Action: string;
  Old_Value: string;
  New_Value: string;
  Performed_By: string;
  Performed_By_Email: string;
  Timestamp: string;
  Remarks: string;
}

export interface ExtensionRequest {
  Request_ID: string;
  Task_ID: string;
  Task_Title?: string;
  Requested_By: string;
  Requested_By_Email?: string;
  Requested_At: string;
  Old_Deadline: string;
  Requested_Deadline: string;
  Reason: string;
  Status: 'Pending' | 'Approved' | 'Rejected';
  Reviewed_By?: string;
  Reviewed_At?: string;
  Review_Comments?: string;
}

export interface EmployeeScorecard {
  Employee_ID: string;
  Employee_Name: string;
  Email?: string;
  Total_Tasks_Assigned: number;
  Total_Tasks_Completed: number;
  On_Time_Completions: number;
  Late_Completions: number;
  Approved_Extension_Completions: number;
  Total_Points: number;
  Updated_At: string;
}

export interface AppConfig {
  Config_Key: string;
  Config_Value: string;
  Description: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

export interface TaskFilterOptions {
  searchQuery?: string;
  assignedTo?: string;
  status?: TaskStatus | 'All';
  priority?: Priority | 'All';
  taskType?: TaskType | 'All';
  extensionStatus?: ExtensionStatus | 'All';
  dateFilter?: 'All' | 'Today' | 'Due Soon' | 'Overdue';
}
