/**
 * ALFA INTERCONTINENTAL LIMITED — Accounts & Finance
 * Initial seed structures & types
 * 
 * NOTE: Demo records have been completely removed.
 * Real records are dynamically loaded from Google Sheets.
 */

import { Task, Employee, TaskHistory, ExtensionRequest, EmployeeScorecard, AppConfig } from '../types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    Employee_ID: 'EMP-001',
    Employee_Name: 'Ahmed Arshi',
    Email: 'ahmed.arshi@alfaic.org',
    Department: 'Accounts & Finance',
    Role: 'Administrator',
    Is_Active: true,
    Created_At: '2026-01-01T09:00:00Z',
    Avatar_Color: '#1E3A8A',
  },
  {
    Employee_ID: 'EMP-002',
    Employee_Name: 'Kapil Malani',
    Email: 'kapil.malani@alfaic.org',
    Department: 'Accounts & Finance',
    Role: 'Manager',
    Is_Active: true,
    Created_At: '2026-01-01T09:00:00Z',
    Avatar_Color: '#4338CA',
  },
  {
    Employee_ID: 'EMP-003',
    Employee_Name: 'Gaurav',
    Email: 'accounts@alfaic.org',
    Department: 'Accounts & Finance',
    Role: 'Employee',
    Is_Active: true,
    Created_At: '2026-01-01T09:00:00Z',
    Avatar_Color: '#047857',
  },
  {
    Employee_ID: 'EMP-004',
    Employee_Name: 'Madhu Saini',
    Email: 'madhu.saini@alfaic.org',
    Department: 'Accounts & Finance',
    Role: 'Employee',
    Is_Active: true,
    Created_At: '2026-01-01T09:00:00Z',
    Avatar_Color: '#B45309',
  },
];

// True zero-state empty arrays for tasks, requests, history, and scorecards
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_EXTENSION_REQUESTS: ExtensionRequest[] = [];
export const INITIAL_TASK_HISTORY: TaskHistory[] = [];
export const INITIAL_SCORECARDS: EmployeeScorecard[] = [];
export const INITIAL_CONFIG: AppConfig[] = [];
