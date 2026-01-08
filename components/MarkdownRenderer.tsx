import React from 'react';

// A very lightweight markdown renderer for the AI response
// In a real production app, use 'react-markdown'
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded text-sm font-mono text-blue-200">$1</code>')
      .replace(/\n/g, '<br />');
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockContent = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre key={`code-${index}`} className="bg-gray-900 p-4 rounded-md my-4 overflow-x-auto text-sm font-mono border border-gray-700">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      codeBlockContent.push(line);
    } else if (line.trim().startsWith('# ')) {
      elements.push(<h1 key={index} className="text-2xl font-bold mt-6 mb-2 text-blue-400">{line.replace('# ', '')}</h1>);
    } else if (line.trim().startsWith('## ')) {
      elements.push(<h2 key={index} className="text-xl font-bold mt-5 mb-2 text-blue-300">{line.replace('## ', '')}</h2>);
    } else if (line.trim().startsWith('### ')) {
      elements.push(<h3 key={index} className="text-lg font-bold mt-4 mb-2 text-blue-200">{line.replace('### ', '')}</h3>);
    } else if (line.trim().startsWith('- ')) {
       elements.push(<li key={index} className="ml-4 mb-1 text-gray-300" dangerouslySetInnerHTML={{ __html: formatText(line.replace('- ', '')) }} />);
    } else {
      if (line.trim().length > 0) {
        elements.push(<p key={index} className="mb-2 leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: formatText(line) }} />);
      }
    }
  });

  return <div className="markdown-body">{elements}</div>;
};

export default MarkdownRenderer;