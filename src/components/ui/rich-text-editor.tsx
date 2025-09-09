import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = React.lazy(() => import('react-quill'));

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'blockquote', 'code-block',
  'link'
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  className,
  readOnly = false,
}) => {
  const quillRef = useRef<any>(null);

  // Debug: log what ReactQuill receives
  useEffect(() => {
    try {
      console.debug('RichTextEditor received value:', (value || '').slice(0, 200));
    } catch {}
  }, [value]);

  // Load Quill CSS
  useEffect(() => {
    const loadQuillCSS = () => {
      if (document.getElementById('quill-css')) return;
      
      const link = document.createElement('link');
      link.id = 'quill-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(link);
    };

    loadQuillCSS();
  }, []);

  return (
    <div className={cn("rich-text-editor", className)}>
      <React.Suspense fallback={
        <div className="h-48 border border-input rounded-md p-4 bg-background">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      }>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          modules={modules}
          formats={formats}
          style={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'calc(var(--radius) - 2px)',
          }}
        />
      </React.Suspense>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        .ql-editor {
          color: hsl(var(--foreground)) !important;
          font-size: 0.875rem;
          line-height: 1.5;
          min-height: 400px !important;
        }
        
        .ql-toolbar {
          border-top: 1px solid hsl(var(--border)) !important;
          border-left: 1px solid hsl(var(--border)) !important;
          border-right: 1px solid hsl(var(--border)) !important;
          border-bottom: none !important;
          background: hsl(var(--background)) !important;
        }
        
        .ql-container {
          border-bottom: 1px solid hsl(var(--border)) !important;
          border-left: 1px solid hsl(var(--border)) !important;
          border-right: 1px solid hsl(var(--border)) !important;
          border-top: none !important;
          min-height: 440px !important;
        }
        
        .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar button:hover {
          background: hsl(var(--accent)) !important;
        }
        
        .ql-toolbar button.ql-active {
          background: hsl(var(--accent)) !important;
        }
        
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground)) !important;
          font-style: normal;
        }
        
        @media (min-width: 768px) {
          .ql-container {
            min-height: 70vh !important;
          }
          .ql-editor {
            min-height: calc(70vh - 40px) !important;
          }
        }
        
        .rich-text-editor {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .rich-text-editor .ql-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .rich-text-editor .ql-editor {
          flex: 1;
        }
        `
      }} />
    </div>
  );
};