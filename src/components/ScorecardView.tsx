/**
 * Employee Scorecard & Leaderboard Component
 * Displays real-time points, on-time completion rates, approved extensions,
 * and ranking for the industrial accounts department.
 */

import React from 'react';
import { Award, TrendingUp, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { EmployeeScorecard, Employee } from '../types';

interface ScorecardViewProps {
  scorecards: EmployeeScorecard[];
  currentUser: Employee;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  scorecards,
  currentUser,
  onRefresh,
  isLoading,
}) => {
  // Sort by total points descending
  const sortedScorecards = [...scorecards].sort((a, b) => b.Total_Points - a.Total_Points);

  // Department totals
  const totalDepartmentPoints = scorecards.reduce((sum, s) => sum + s.Total_Points, 0);
  const totalCompletedTasks = scorecards.reduce((sum, s) => sum + s.Total_Tasks_Completed, 0);
  const totalOnTimeTasks = scorecards.reduce((sum, s) => sum + s.On_Time_Completions, 0);
  const deptOnTimeRate = totalCompletedTasks > 0 ? Math.round((totalOnTimeTasks / totalCompletedTasks) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="neu-raised rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-[#4169E1]" />
            <h1 className="text-xl font-bold text-[#202A38]">
              Accounts Team Scorecard & Leaderboard
            </h1>
          </div>
          <p className="text-xs text-[#667085] leading-relaxed max-w-2xl">
            Points are calculated on the server at completion. On-time completions and approved extensions earn +5 points. Late completions earn 0 points.
          </p>
        </div>

        {/* Quick Dept Stats */}
        <div className="flex items-center gap-3">
          <div className="neu-inset-sm px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-[#667085] block">
              Dept Points
            </span>
            <span className="font-mono text-lg font-bold text-[#4169E1] tabular-nums">
              {totalDepartmentPoints}
            </span>
          </div>
          <div className="neu-inset-sm px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-[#667085] block">
              On-Time Rate
            </span>
            <span className="font-mono text-lg font-bold text-[#16845B] tabular-nums">
              {deptOnTimeRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="neu-raised rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#202A38] uppercase tracking-wider">
            Employee Performance Rankings
          </h2>
          <span className="text-xs text-[#667085]">
            Updated in Google Sheets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#CAD2DE]/30 text-[11px] font-bold text-[#667085] uppercase tracking-wider bg-[#E9EDF3]/50">
                <th className="py-3 px-4 text-center w-12">Rank</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4 text-center">Assigned</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">On-Time</th>
                <th className="py-3 px-4 text-center">Late</th>
                <th className="py-3 px-4 text-center">Approved Ext.</th>
                <th className="py-3 px-4 text-center">On-Time Rate</th>
                <th className="py-3 px-6 text-right">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CAD2DE]/20 text-xs text-[#202A38]">
              {sortedScorecards.map((sc, index) => {
                const onTimeRate =
                  sc.Total_Tasks_Completed > 0
                    ? Math.round((sc.On_Time_Completions / sc.Total_Tasks_Completed) * 100)
                    : 100;
                const isCurrentUser = sc.Employee_Name === currentUser.Employee_Name;

                return (
                  <tr
                    key={sc.Employee_ID || sc.Employee_Name}
                    className={`hover:bg-white/40 transition-colors ${
                      isCurrentUser ? 'bg-[#4169E1]/5 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      {index === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#D88A16]/20 text-[#D88A16]">
                          1
                        </span>
                      ) : index === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#CAD2DE] text-[#202A38]">
                          2
                        </span>
                      ) : index === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#B45309]/15 text-[#B45309]">
                          3
                        </span>
                      ) : (
                        <span className="text-[#667085]">{index + 1}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full neu-inset-sm flex items-center justify-center text-xs font-bold text-[#4169E1]">
                          {sc.Employee_Name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-[#202A38] block leading-tight">
                            {sc.Employee_Name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-[#4169E1] font-semibold">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[#667085]">
                      {sc.Total_Tasks_Assigned}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums font-semibold text-[#202A38]">
                      {sc.Total_Tasks_Completed}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[#16845B] font-semibold">
                      {sc.On_Time_Completions}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[#D64545] font-semibold">
                      {sc.Late_Completions}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[#4169E1]">
                      {sc.Approved_Extension_Completions}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono tabular-nums font-bold text-xs">
                        <span
                          className={
                            onTimeRate >= 90
                              ? 'text-[#16845B]'
                              : onTimeRate >= 75
                              ? 'text-[#D88A16]'
                              : 'text-[#D64545]'
                          }
                        >
                          {onTimeRate}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right font-mono text-sm font-bold text-[#4169E1] tabular-nums">
                      {sc.Total_Points} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Reference Card */}
      <div className="neu-inset-sm rounded-2xl p-5 space-y-2 text-xs">
        <h3 className="font-bold text-[#202A38] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#16845B]" />
          Industrial Manufacturing Accounts Scoring Governance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[#667085]">
          <div className="neu-raised-sm p-3 rounded-xl bg-white/50">
            <b className="text-[#16845B] block mb-1">Standard On-Time: +5 Points</b>
            Completed on or before original deadline. Verified against server timestamp in Asia/Kolkata.
          </div>
          <div className="neu-raised-sm p-3 rounded-xl bg-white/50">
            <b className="text-[#4169E1] block mb-1">Approved Extension: +5 Points</b>
            Completed on or before the approved extended deadline authorized by Manager / Administrator.
          </div>
          <div className="neu-raised-sm p-3 rounded-xl bg-white/50">
            <b className="text-[#D64545] block mb-1">Late or Expired: 0 Points</b>
            Completed after the applicable effective deadline. No duplicate points allowed on resubmission.
          </div>
        </div>
      </div>
    </div>
  );
};
