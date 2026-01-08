import { LogEntry, LogType } from '../types';

// Regex patterns for common Android log issues
const PATTERNS = {
  FATAL: /FATAL EXCEPTION:/,
  ANR: /ANR in/,
  EXCEPTION: /Exception:/, // Generic Java exception
  ERROR: / uncaught error/i, // Generic uncaught error
};

export const parseLogContent = (content: string): LogEntry[] => {
  const lines = content.split('\n');
  const entries: LogEntry[] = [];
  
  // To avoid duplicate captures of the same stack trace, we skip lines if we are inside a captured block
  let skipUntilIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntilIndex) continue;

    const line = lines[i];
    let type: LogType | null = null;

    if (PATTERNS.FATAL.test(line)) type = LogType.FATAL;
    else if (PATTERNS.ANR.test(line)) type = LogType.ANR;
    else if (PATTERNS.EXCEPTION.test(line)) type = LogType.EXCEPTION;
    else if (PATTERNS.ERROR.test(line)) type = LogType.ERROR;

    if (type) {
      // Capture context: 5 lines before, 50 lines after (or until next empty line sequence which implies end of stack)
      const startLine = Math.max(0, i - 5);
      // Heuristic: Stack traces usually don't go longer than 60 lines, or we stop if we hit another timestamp/process header that looks unrelated
      // For simplicity, we grab a chunk.
      const endLine = Math.min(lines.length, i + 60);
      
      const contextLines = lines.slice(startLine, endLine);
      const fullContext = contextLines.join('\n');
      
      // Attempt to extract timestamp and process from the specific line
      // Format usually: MM-DD HH:MM:SS.ms PID TID Level Tag: Message
      const metaParts = line.split(/\s+/);
      const timestamp = metaParts.length > 2 ? `${metaParts[0]} ${metaParts[1]}` : undefined;
      const process = metaParts.length > 4 ? metaParts[4].replace(':', '') : undefined;

      entries.push({
        id: `entry-${i}-${Date.now()}`,
        type,
        lineNumber: i + 1,
        message: line.trim().substring(0, 200), // Truncate message for summary
        fullContext,
        timestamp,
        process
      });

      // Skip ahead to avoid detecting "Exception" inside the same stack trace we just captured
      skipUntilIndex = i + 20; 
    }
  }

  return entries;
};