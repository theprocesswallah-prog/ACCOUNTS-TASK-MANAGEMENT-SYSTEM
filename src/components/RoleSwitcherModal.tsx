/**
 * Role Switcher Modal Component
 * Simulates role-based access control (RBAC) switches between
 * Administrator, Manager, and Accounts Employees to test permissions.
 */

import React from 'react';
import { X, ShieldCheck, UserCheck, Briefcase, Check } from 'lucide-react';
import { Employee, UserRole } from '../types';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  currentUser: Employee;
  onSelectUser: (user: Employee) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  employees,
  currentUser,
  onSelectUser,
}) => {
  if (!isOpen) return null;

  const roleDescriptions: Record<UserRole, string> = {
    Administrator: 'Full system control, manage employees, configure settings, approve extensions, edit & cancel tasks.',
    Manager: 'Create & assign tasks to employees, monitor deadlines, review completion remarks, approve extensions.',
    Employee: 'View assigned tasks, download attachments, update progress status, request deadline extensions, submit completion remarks.',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-raised rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#4169E1]" />
            <h2 className="text-base font-bold text-[#202A38]">
              Switch Active User & Role
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-[#667085] leading-relaxed">
            Select an Accounts Department employee to simulate their specific role and permissions. Actions such as reviewing deadline extensions are strictly enforced based on role.
          </p>

          <div className="space-y-2.5">
            {employees.map((emp) => {
              const isSelected = emp.Employee_ID === currentUser.Employee_ID;
              return (
                <div
                  key={emp.Employee_ID}
                  onClick={() => {
                    onSelectUser(emp);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'neu-inset border border-[#4169E1]/40'
                      : 'neu-raised hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: emp.Avatar_Color || '#4169E1' }}
                    >
                      {emp.Employee_Name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#202A38] text-sm">
                          {emp.Employee_Name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.Role === 'Administrator'
                              ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                              : emp.Role === 'Manager'
                              ? 'bg-[#4338CA]/10 text-[#4338CA]'
                              : 'bg-[#047857]/10 text-[#047857]'
                          }`}
                        >
                          {emp.Role}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#667085] block mt-0.5">
                        {emp.Email}
                      </span>
                      <p className="text-[10px] text-[#667085] mt-1">
                        {roleDescriptions[emp.Role]}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#4169E1] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
