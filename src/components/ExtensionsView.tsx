/**
 * Extensions Management View Component
 * Lists all deadline extension requests (Pending, Approved, Rejected)
 * with review action for Managers and Administrators.
 */

import React, { useState } from 'react';
import {
  Clock,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ExtensionRequest, Employee } from '../types';
import { formatISTDateTime } from '../services/pointsEngine';

interface ExtensionsViewProps {
  extensions: ExtensionRequest[];
  currentUser: Employee;
  onOpenReview: (request: ExtensionRequest) => void;
  onRefresh: () => void;
}

export const ExtensionsView: React.FC<ExtensionsViewProps> = ({
  extensions,
  currentUser,
  onOpenReview,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [search, setSearch] = useState('');

  const isManagerOrAdmin = currentUser.Role === 'Administrator' || currentUser.Role === 'Manager';

  const filteredExtensions = extensions.filter((ext) => {
    if (filterStatus !== 'All' && ext.Status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = ext.Request_ID.toLowerCase().includes(q);
      const matchTaskId = ext.Task_ID.toLowerCase().includes(q);
      const matchEmp = ext.Requested_By.toLowerCase().includes(q);
      const matchReason = ext.Reason.toLowerCase().includes(q);
      if (!matchId && !matchTaskId && !matchEmp && !matchReason) return false;
    }
    return true;
  });

  const pendingCount = extensions.filter((e) => e.Status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="neu-raised rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hourglass className="w-5 h-5 text-[#D88A16]" />
            <h1 className="text-xl font-bold text-[#202A38]">
              Deadline Extension Governance
            </h1>
          </div>
          <p className="text-xs text-[#667085] leading-relaxed max-w-xl">
            Employees submit extension requests when manufacturing, vendor, or bank delays occur. Approvals change the effective deadline and preserve 5-point eligibility.
          </p>
        </div>

        {/* Role Notice & Pending Count */}
        <div className="flex items-center gap-3">
          <div className="neu-inset-sm px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-[#667085] block">
              Pending Review
            </span>
            <span className="font-mono text-lg font-bold text-[#D88A16] tabular-nums">
              {pendingCount}
            </span>
          </div>

          <div className="neu-raised-sm px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
            {isManagerOrAdmin ? (
              <span className="text-[#16845B] font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16845B]" />
                Review Authorized ({currentUser.Role})
              </span>
            ) : (
              <span className="text-[#667085] font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#D88A16]" />
                Viewing as Employee
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="neu-raised rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'neu-inset text-[#4169E1]'
                  : 'text-[#667085] hover:text-[#202A38]'
              }`}
            >
              {status}
              {status === 'Pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#D88A16] text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="w-full neu-inset rounded-xl px-8 py-1.5 text-xs text-[#202A38] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Requests List */}
      {filteredExtensions.length > 0 ? (
        <div className="space-y-3.5">
          {filteredExtensions.map((ext) => (
            <div
              key={ext.Request_ID}
              className="neu-raised rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#4169E1]">
                    {ext.Request_ID}
                  </span>
                  <span className="text-[#CAD2DE]">·</span>
                  <span className="font-mono text-xs text-[#202A38] font-bold">
                    {ext.Task_ID}
                  </span>
                  {ext.Task_Title && (
                    <>
                      <span className="text-[#CAD2DE]">·</span>
                      <span className="text-xs font-semibold text-[#202A38] truncate max-w-sm">
                        {ext.Task_Title}
                      </span>
                    </>
                  )}
                  <span
                    className={`ml-auto sm:ml-2 px-2 py-0.5 rounded text-[11px] font-bold ${
                      ext.Status === 'Pending'
                        ? 'bg-[#D88A16]/10 text-[#D88A16]'
                        : ext.Status === 'Approved'
                        ? 'bg-[#16845B]/10 text-[#16845B]'
                        : 'bg-[#D64545]/10 text-[#D64545]'
                    }`}
                  >
                    {ext.Status}
                  </span>
                </div>

                <p className="text-xs text-[#202A38] leading-relaxed">
                  <b>Reason:</b> {ext.Reason}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#667085] pt-1 font-mono tabular-nums">
                  <div>
                    Requested by: <b className="text-[#202A38]">{ext.Requested_By}</b>
                  </div>
                  <div>
                    Current Deadline: <span className="text-[#202A38]">{formatISTDateTime(ext.Old_Deadline)}</span>
                  </div>
                  <div>
                    Requested: <span className="text-[#4169E1] font-bold">{formatISTDateTime(ext.Requested_Deadline)}</span>
                  </div>
                </div>

                {ext.Review_Comments && (
                  <p className="text-[11px] text-[#4169E1] italic pt-1">
                    <b>Reviewer Note ({ext.Reviewed_By}):</b> "{ext.Review_Comments}"
                  </p>
                )}
              </div>

              {/* Action Button for Manager */}
              {ext.Status === 'Pending' && isManagerOrAdmin && (
                <button
                  onClick={() => onOpenReview(ext)}
                  className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap self-end md:self-auto"
                >
                  <span>Review Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="neu-raised rounded-2xl p-12 text-center max-w-md mx-auto">
          <CheckCircle2 className="w-10 h-10 text-[#16845B] mx-auto mb-2" />
          <h2 className="text-base font-bold text-[#202A38] mb-1">
            No Extension Requests
          </h2>
          <p className="text-xs text-[#667085]">
            There are currently no extension requests matching this filter.
          </p>
        </div>
      )}
    </div>
  );
};
