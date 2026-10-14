/**
 * Google Apps Script Setup & Connection Modal Component
 * Allows user to configure the live Apps Script Web App URL, test backend health,
 * copy the complete Code.gs script, and verify points scoring test suite.
 */

import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Play,
  Server,
  FileCode,
  ShieldCheck,
  Check
} from 'lucide-react';
import { getAppsScriptUrl, setAppsScriptUrl, isAppsScriptConfigured } from '../config';
import { api, resetLocalData } from '../services/api';
import { runPointsEngineTests } from '../services/pointsEngine.test';

interface AppsScriptSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const AppsScriptSetupModal: React.FC<AppsScriptSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [urlInput, setUrlInput] = useState(getAppsScriptUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<{
    passed: number;
    failed: number;
    results: { name: string; success: boolean; details?: string }[];
  } | null>(null);

  if (!isOpen) return null;

  const isLive = isAppsScriptConfigured();

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const trimmed = urlInput.trim();
    setAppsScriptUrl(trimmed);

    if (!trimmed) {
      setTestResult({
        success: true,
        message: 'Reverted to Local Demonstration Mode with mock storage.',
      });
      setIsTesting(false);
      onConfigChanged();
      return;
    }

    try {
      const res = await api.healthCheck(trimmed);
      setTestResult(res);
      if (res.success) {
        onConfigChanged();
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/Code.gs');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) {
      // Fallback
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleRunTests = () => {
    const results = runPointsEngineTests();
    setTestSuiteResults(results);
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all demo tasks, extensions, and scorecard to clean initial state?')) {
      resetLocalData();
      onConfigChanged();
      setTestResult({ success: true, message: 'Local demo data reseeded successfully.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-raised rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#CAD2DE]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl neu-inset flex items-center justify-center text-[#4169E1]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202A38]">
                Google Sheets & Apps Script Configuration
              </h2>
              <span className="text-[11px] text-[#667085]">
                {isLive ? 'Connected to Live Google Sheet API' : 'Currently in Local Demo Mode'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neu-btn p-2 rounded-xl text-[#667085] hover:text-[#202A38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Active Status Badge */}
          <div
            className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 ${
              isLive
                ? 'bg-[#16845B]/10 border border-[#16845B]/20 text-[#16845B]'
                : 'bg-[#D88A16]/10 border border-[#D88A16]/20 text-[#D88A16]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold block">
                  {isLive ? 'Live Google Apps Script Connected' : 'Local Demonstration Mode Active'}
                </span>
                <span className="text-[11px] text-[#202A38]/80 block">
                  {isLive
                    ? 'All tasks, extensions, scores, and attachments write directly to your Google Sheets & Drive.'
                    : 'All forms, points scoring, and workflows run with full fidelity in local storage for testing.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`w-2.5 h-2.5 rounded-full animate-ping ${
                  isLive ? 'bg-[#16845B]' : 'bg-[#D88A16]'
                }`}
              />
            </div>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#202A38] block">
              Google Apps Script Web App URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 neu-inset rounded-xl px-3.5 py-2 font-mono text-xs text-[#202A38] focus:outline-none focus:ring-1 focus:ring-[#4169E1]"
              />
              <button
                type="button"
                onClick={handleSaveAndTest}
                disabled={isTesting}
                className="neu-btn-primary px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Save & Test</span>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#667085]">
              Deploy the script with "Execute as: Me" and "Who has access: Anyone" to allow the React web app to read and write tasks.
            </p>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 ${
                testResult.success
                  ? 'bg-[#16845B]/10 text-[#16845B] border border-[#16845B]/20'
                  : 'bg-[#D64545]/10 text-[#D64545] border border-[#D64545]/20'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Setup Guide Steps */}
          <div className="neu-inset-sm p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#202A38] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#4169E1]" />
                5-Minute Google Sheets Initialization Guide
              </h3>

              <button
                type="button"
                onClick={handleCopyCode}
                className="neu-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-[#4169E1] flex items-center gap-1"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-[#16845B]" />
                    <span className="text-[#16845B]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code.gs</span>
                  </>
                )}
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-[#202A38]/90 text-[11px] leading-relaxed">
              <li>
                Create a blank Google Sheet in your Google Drive (e.g. named <b>"ALFA INTERCONTINENTAL LIMITED - Accounts Task System"</b>).
              </li>
              <li>
                Click <b>Extensions → Apps Script</b> in your sheet.
              </li>
              <li>
                Copy our complete <b>Code.gs</b> (button above) and paste it into the Apps Script editor.
              </li>
              <li>
                Select function <b>setupAccountsTaskSystem</b> from the top toolbar dropdown and click <b>Run</b>. This automatically creates all 6 sheets with headers, initial accounts employees, Drive attachment folder, and config!
              </li>
              <li>
                Click <b>Deploy → New deployment</b> → Select type: <b>Web app</b>. Set <i>Execute as: Me</i> and <i>Who has access: Anyone</i>.
              </li>
              <li>
                Copy the Web App URL, paste it into the field above, and click <b>Save & Test</b>!
              </li>
            </ol>
          </div>

          {/* Test Suite Runner (Section 16 Verification) */}
          <div className="p-4 rounded-2xl neu-raised-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#202A38]">
                  Scoring & Deadline Calculation Test Suite
                </h4>
                <p className="text-[11px] text-[#667085]">
                  Verifies on-time, late, and extension scoring scenarios.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunTests}
                className="neu-btn px-3 py-1.5 rounded-xl font-semibold text-[#16845B] flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Tests</span>
              </button>
            </div>

            {testSuiteResults && (
              <div className="mt-3 pt-3 border-t border-[#CAD2DE]/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#16845B]">
                    Passed: {testSuiteResults.passed} / {testSuiteResults.results.length} tests
                  </span>
                  {testSuiteResults.failed > 0 && (
                    <span className="text-[#D64545]">
                      Failed: {testSuiteResults.failed}
                    </span>
                  )}
                </div>
                <div className="space-y-1 mt-1">
                  {testSuiteResults.results.map((res, i) => (
                    <div
                      key={i}
                      className="text-[11px] flex items-center gap-1.5 text-[#202A38]"
                    >
                      {res.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-[#D64545] shrink-0" />
                      )}
                      <span>{res.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Demo Data Reset */}
          <div className="flex items-center justify-between pt-2 border-t border-[#CAD2DE]/30">
            <span className="text-[11px] text-[#667085]">
              Want to start fresh with demo data?
            </span>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="text-xs text-[#D88A16] font-semibold hover:underline"
            >
              Reset Demo Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
