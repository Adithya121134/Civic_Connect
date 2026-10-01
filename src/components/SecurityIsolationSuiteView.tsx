import React, { useState } from 'react';
import { Play, Check, X, RefreshCw, Terminal, ArrowRight } from 'lucide-react';

export const SecurityIsolationSuiteView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<any | null>(null);

  const runSuite = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/v1/test/run-security-suite', { method: 'POST' });
      const data = await res.json();
      setTestSuiteResults(data);
    } catch (err: any) {
      console.error('Failed to run test suite', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#000000] pb-6 gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-[#8A8A8A] uppercase mb-1.5">
            SERVER ISOLATION VERIFICATION &bull; AUTOMATED REGRESSION
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#000000] uppercase">
            SECURITY & ISOLATION SUITE
          </h1>
          <div className="text-lg md:text-xl font-light text-[#666666] tracking-wide mt-0.5">
            6-POINT LIVE HTTP ASSERTIONS &bull; CROSS-DEPARTMENT & OCC CHECKS
          </div>
        </div>

        <button
          onClick={runSuite}
          disabled={isRunning}
          className="px-6 py-3 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] text-xs font-mono font-bold tracking-wider uppercase rounded-[2px] transition-colors flex items-center space-x-2 shrink-0 self-start md:self-auto"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>ASSERTING LIVE BACKEND...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>RUN 6-POINT TEST SUITE</span>
            </>
          )}
        </button>
      </div>

      {/* Results View */}
      {testSuiteResults ? (
        <div className="space-y-6">
          <div className="border border-[#000000] p-4 bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="text-[#8A8A8A] text-[10px] uppercase block">SUITE EXECUTION STATUS</span>
              <div className="flex items-center space-x-2 mt-1">
                {testSuiteResults.allPassed ? (
                  <span className="font-black text-sm text-[#000000] flex items-center space-x-1.5">
                    <Check className="w-4 h-4" />
                    <span>ALL 6 SECURITY ASSERTIONS PASSED ({testSuiteResults.passedCount} / {testSuiteResults.totalTests})</span>
                  </span>
                ) : (
                  <span className="font-black text-sm text-[#000000] flex items-center space-x-1.5">
                    <X className="w-4 h-4" />
                    <span>SUITE FAILED ({testSuiteResults.failedCount} FAILURES)</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-[#666666] text-[11px]">
              EXECUTED AT: {new Date(testSuiteResults.executedAt).toLocaleTimeString()} &bull; ZERO TOKEN BYPASS
            </div>
          </div>

          <div className="divide-y divide-[#E5E5E5] border border-[#000000]">
            {testSuiteResults.results?.map((t: any) => (
              <div
                key={t.testId}
                className="p-4 bg-[#FFFFFF] hover:bg-[#FAFAFA] transition-colors space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-[#000000] px-2 py-0.5 border border-[#000000] bg-[#FAFAFA]">
                      {t.testId}
                    </span>
                    <h3 className="font-bold text-[#000000] text-sm">{t.name}</h3>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-[2px] ${
                    t.passed ? 'bg-[#000000] text-[#FFFFFF]' : 'border border-[#000000] text-[#000000]'
                  }`}>
                    {t.passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                </div>

                <div className="text-xs text-[#666666] font-mono leading-relaxed pl-1">
                  {t.details}
                </div>

                <div className="flex items-center space-x-4 text-[11px] font-mono text-[#404040] pt-1">
                  <span>ACTOR: <strong className="text-[#000000]">{t.actorRole}</strong></span>
                  <span>&bull;</span>
                  <span>ENDPOINT: <strong className="text-[#000000]">{t.endpoint}</strong></span>
                  <span>&bull;</span>
                  <span>OUTCOME: <strong className="text-[#000000]">{t.status || 'VERIFIED'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-[#000000] p-12 text-center bg-[#FAFAFA] space-y-4">
          <Terminal className="w-10 h-10 text-[#666666] mx-auto" />
          <div className="font-mono text-sm font-bold text-[#000000] uppercase">
            LIVE INTEGRITY TEST SUITE READY
          </div>
          <p className="text-xs text-[#666666] max-w-lg mx-auto font-sans leading-relaxed">
            Click &ldquo;RUN 6-POINT TEST SUITE&rdquo; to execute live real-time HTTP requests against the backend server, validating resident portal restrictions, cross-department data isolation, parameter spoofing resistance, and OCC version locking.
          </p>
          <div>
            <button
              onClick={runSuite}
              disabled={isRunning}
              className="px-6 py-2.5 bg-[#000000] text-[#FFFFFF] text-xs font-mono font-bold uppercase hover:bg-[#222222]"
            >
              EXECUTE LIVE TEST SUITE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
