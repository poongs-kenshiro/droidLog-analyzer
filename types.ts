export enum LogType {
  FATAL = 'FATAL',
  ANR = 'ANR',
  EXCEPTION = 'EXCEPTION',
  ERROR = 'ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface LogEntry {
  id: string;
  type: LogType;
  timestamp?: string;
  process?: string;
  message: string;
  fullContext: string; // The surrounding lines
  lineNumber: number;
}

export interface AnalysisResult {
  markdown: string;
}

export interface AIState {
  loading: boolean;
  error: string | null;
  result: string | null;
}
