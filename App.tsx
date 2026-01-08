import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadIcon, BugIcon, SparklesIcon, AlertIcon, CheckIcon } from './components/Icons';
import { parseLogContent } from './services/logParser';
import { analyzeLogEntry } from './services/geminiService';
import { LogEntry, LogType, AIState } from './types';
import MarkdownRenderer from './components/MarkdownRenderer';

const SAMPLE_LOG = `
01-22 10:30:45.123  1000  1000 E AndroidRuntime: FATAL EXCEPTION: main
01-22 10:30:45.123  1000  1000 E AndroidRuntime: Process: com.example.shopapp, PID: 1000
01-22 10:30:45.123  1000  1000 E AndroidRuntime: java.lang.NullPointerException: Attempt to invoke virtual method 'void android.widget.TextView.setText(java.lang.CharSequence)' on a null object reference
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at com.example.shopapp.ui.MainActivity.updateCartCount(MainActivity.java:142)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at com.example.shopapp.ui.MainActivity.onCreate(MainActivity.java:42)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.Activity.performCreate(Activity.java:8000)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1307)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:3478)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.ActivityThread.handleLaunchActivity(ActivityThread.java:3692)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.servertransaction.LaunchActivityItem.execute(LaunchActivityItem.java:85)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.servertransaction.TransactionExecutor.executeCallbacks(TransactionExecutor.java:135)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.servertransaction.TransactionExecutor.execute(TransactionExecutor.java:95)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.ActivityThread$H.handleMessage(ActivityThread.java:2126)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.os.Handler.dispatchMessage(Handler.java:106)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.os.Looper.loop(Looper.java:236)
01-22 10:30:45.123  1000  1000 E AndroidRuntime: 	at android.app.ActivityThread.main(ActivityThread.java:7861)

01-22 10:35:12.500  2000  2020 E ActivityManager: ANR in com.social.feed
01-22 10:35:12.500  2000  2020 E ActivityManager: PID: 5541
01-22 10:35:12.500  2000  2020 E ActivityManager: Reason: Input dispatching timed out (Waiting because no window has focus but there is a focused application that may eventually add a window when it finishes starting up.)
01-22 10:35:12.500  2000  2020 E ActivityManager: Load: 5.4 / 4.1 / 3.8
01-22 10:35:12.500  2000  2020 E ActivityManager: CPU usage from 0ms to 8465ms later (2024-01-22 10:35:03.987 to 2024-01-22 10:35:12.452):
01-22 10:35:12.500  2000  2020 E ActivityManager:   50% 5541/com.social.feed: 45% user + 5% kernel / faults: 1234 minor
01-22 10:35:12.500  2000  2020 E ActivityManager:   10% 2000/system_server: 5% user + 5% kernel
01-22 10:35:12.500  2000  2020 E ActivityManager:   0.1% 100/kworker/u16:3: 0% user + 0.1% kernel

01-22 10:45:00.100  5000  5000 W System.err: java.net.SocketTimeoutException: timeout
01-22 10:45:00.100  5000  5000 W System.err: 	at com.android.okhttp.okio.Okio$2.read(Okio.java:144)
01-22 10:45:00.100  5000  5000 W System.err: 	at com.android.okhttp.internal.http.HttpConnection$FixedLengthSource.read(HttpConnection.java:450)
01-22 10:45:00.100  5000  5000 W System.err: 	at com.android.okhttp.internal.http.HttpEngine.readResponse(HttpEngine.java:613)
01-22 10:45:00.100  5000  5000 W System.err: 	at com.android.okhttp.internal.huc.HttpURLConnectionImpl.execute(HttpURLConnectionImpl.java:475)
01-22 10:45:00.100  5000  5000 W System.err: 	at com.android.okhttp.internal.huc.HttpURLConnectionImpl.getResponse(HttpURLConnectionImpl.java:411)
`;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [aiStates, setAiStates] = useState<Record<string, AIState>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsParsing(true);
    setLogs([]);
    setSelectedLogId(null);
    setAiStates({});

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Offload to next tick to allow UI to update loading state
      setTimeout(() => {
        const parsedLogs = parseLogContent(content);
        setLogs(parsedLogs);
        if (parsedLogs.length > 0) {
          setSelectedLogId(parsedLogs[0].id);
        }
        setIsParsing(false);
      }, 100);
    };
    reader.onerror = () => {
      alert("Error reading file");
      setIsParsing(false);
    };
    reader.readAsText(uploadedFile);
  };

  const handleLoadSample = () => {
    setIsParsing(true);
    // Create a dummy file object just for the UI state
    setFile(new File([SAMPLE_LOG], "sample_dumpstate.txt", { type: "text/plain" }));
    setLogs([]);
    setSelectedLogId(null);
    setAiStates({});

    setTimeout(() => {
      const parsedLogs = parseLogContent(SAMPLE_LOG);
      setLogs(parsedLogs);
      if (parsedLogs.length > 0) {
        setSelectedLogId(parsedLogs[0].id);
      }
      setIsParsing(false);
    }, 500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fakeEvent = {
        target: { files: [e.dataTransfer.files[0]] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(fakeEvent);
    }
  };

  const triggerAnalysis = async (entry: LogEntry) => {
    setAiStates(prev => ({
      ...prev,
      [entry.id]: { loading: true, error: null, result: null }
    }));

    try {
      const result = await analyzeLogEntry(entry.fullContext, entry.type);
      setAiStates(prev => ({
        ...prev,
        [entry.id]: { loading: false, error: null, result }
      }));
    } catch (err) {
      setAiStates(prev => ({
        ...prev,
        [entry.id]: { loading: false, error: 'Failed to analyze', result: null }
      }));
    }
  };

  const selectedEntry = useMemo(() => 
    logs.find(log => log.id === selectedLogId), 
  [logs, selectedLogId]);

  const getLogColor = (type: LogType) => {
    switch (type) {
      case LogType.FATAL: return 'text-bug-fatal border-bug-fatal';
      case LogType.ANR: return 'text-bug-anr border-bug-anr';
      case LogType.EXCEPTION: return 'text-bug-exception border-bug-exception';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const getLogBg = (type: LogType, active: boolean) => {
    if (active) return 'bg-gray-700/50';
    switch (type) {
      case LogType.FATAL: return 'hover:bg-red-900/10';
      case LogType.ANR: return 'hover:bg-orange-900/10';
      case LogType.EXCEPTION: return 'hover:bg-yellow-900/10';
      default: return 'hover:bg-gray-800';
    }
  };

  // Rendering
  if (!file) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div 
          className="max-w-xl w-full bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 p-12 flex flex-col items-center text-center hover:border-blue-500 transition-colors cursor-pointer group relative"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-blue-500 group-hover:text-blue-400 mb-6 transition-colors">
            <UploadIcon />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">DroidLog Analyzer</h1>
          <p className="text-slate-400 mb-8">
            Drag & Drop your dumpstate.txt or logcat.txt here, or click to browse.
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".txt,.log"
          />
          <div className="flex gap-4 text-sm text-slate-500 mb-8">
            <span className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">FATAL</span>
            <span className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">ANR</span>
            <span className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">Exceptions</span>
          </div>

          <div className="w-full border-t border-slate-700/50 pt-8 flex flex-col items-center">
             <span className="text-slate-500 text-xs mb-3 uppercase tracking-wider font-semibold">No file? Try with sample data</span>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 handleLoadSample();
               }}
               className="bg-slate-700 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg text-sm font-medium"
             >
               <SparklesIcon />
               Load Sample Crash Log
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <BugIcon />
          <h1 className="font-bold text-lg tracking-tight">DroidLog Analyzer</h1>
          <span className="bg-slate-800 text-xs px-2 py-0.5 rounded text-slate-400 border border-slate-700">
            {file.name}
          </span>
        </div>
        <button 
          onClick={() => setFile(null)}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Close File
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar List */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected Issues ({logs.length})</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isParsing ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <span className="text-sm">Parsing large file...</span>
              </div>
            ) : logs.length === 0 ? (
               <div className="p-8 text-center text-slate-500 text-sm">
                 No major issues detected (FATAL, ANR, Exception).
               </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id}
                  onClick={() => setSelectedLogId(log.id)}
                  className={`p-4 border-b border-slate-800 cursor-pointer transition-colors ${getLogBg(log.type, selectedLogId === log.id)}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold border px-1.5 py-0.5 rounded ${getLogColor(log.type)}`}>
                      {log.type}
                    </span>
                    {log.timestamp && <span className="text-xs text-slate-500 font-mono">{log.timestamp}</span>}
                  </div>
                  <div className="text-sm text-slate-300 font-mono line-clamp-2 break-all">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Detail View */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Toolbar */}
              <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/30 shrink-0">
                 <div className="flex items-center gap-4 text-sm font-mono text-slate-400">
                    <span>Line: {selectedEntry.lineNumber}</span>
                    {selectedEntry.process && <span>Process: {selectedEntry.process}</span>}
                 </div>
                 
                 <button 
                  onClick={() => triggerAnalysis(selectedEntry)}
                  disabled={aiStates[selectedEntry.id]?.loading}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    aiStates[selectedEntry.id]?.loading 
                      ? 'bg-blue-500/10 text-blue-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20'
                  }`}
                 >
                   {aiStates[selectedEntry.id]?.loading ? (
                     <>Analyzing...</>
                   ) : (
                     <>
                       <SparklesIcon />
                       Analyze with AI
                     </>
                   )}
                 </button>
              </div>

              {/* Split View: Content & AI */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* AI Result Card */}
                {aiStates[selectedEntry.id] && (
                  <div className="bg-slate-900/80 rounded-xl border border-blue-500/30 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-blue-900/20 to-transparent p-3 border-b border-blue-500/20 flex items-center gap-2">
                       <SparklesIcon />
                       <span className="font-semibold text-blue-200">Gemini Insights</span>
                    </div>
                    <div className="p-6">
                      {aiStates[selectedEntry.id].loading && (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        </div>
                      )}
                      
                      {aiStates[selectedEntry.id].error && (
                        <div className="text-red-400 flex items-center gap-2">
                          <AlertIcon />
                          {aiStates[selectedEntry.id].error}
                        </div>
                      )}

                      {aiStates[selectedEntry.id].result && (
                         <div className="text-slate-300 text-sm leading-relaxed">
                            <MarkdownRenderer content={aiStates[selectedEntry.id].result!} />
                         </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Raw Log Viewer */}
                <div className="bg-[#0d1117] rounded-lg border border-slate-800 overflow-hidden">
                  <div className="px-4 py-2 bg-[#161b22] border-b border-slate-800 text-xs text-slate-500 font-mono uppercase">
                    Raw Stack Trace
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {selectedEntry.fullContext}
                  </pre>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
               <BugIcon />
               <p className="mt-4">Select an issue from the sidebar to view details.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;