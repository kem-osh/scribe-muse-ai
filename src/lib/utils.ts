import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from 'dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Unicode-safe content hashing for duplicate detection
export function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .toLowerCase();
}

export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Strip HTML tags and decode entities for plain text display
export function stripHtml(html: string): string {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and clean up extra whitespace
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  return textContent.replace(/\s+/g, ' ').trim();
}

// Sanitize HTML content for safe rendering
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

// Check if content is likely HTML (has HTML tags)
export function isLikelyHtml(content: string): boolean {
  // Look for actual HTML tags (opening or closing)
  const htmlTagPattern = /<\/?[a-z][a-z0-9]*[^<>]*>/i;
  return htmlTagPattern.test(content);
}

// Check if content looks like Markdown
export function looksLikeMarkdown(content: string): boolean {
  // Look for common Markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headings (# ## ### etc)
    /^\*\s+/m,               // Unordered list with *
    /^-\s+/m,                // Unordered list with -
    /^\d+\.\s+/m,            // Ordered list
    /\*\*[^*]+\*\*/,         // Bold text
    /\*[^*]+\*/,             // Italic text
    /`[^`]+`/,               // Inline code
    /^```/m,                 // Code blocks
    /^\>/m,                  // Blockquotes
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
}

// Convert basic Markdown to HTML
export function simpleMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Convert headers (# ## ### etc)
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Convert bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert line breaks to paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .filter(p => p.trim())
    .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  return html;
}

// Escape HTML entities in plain text
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Convert plain text to HTML with proper paragraph and line break formatting
export function toHtmlFromPlainText(text: string): string {
  if (!text) return '';
  
  // Normalize line endings (handle Windows \r\n)
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Escape HTML entities first
  const escaped = escapeHtml(normalized);
  
  // Split by double newlines to create paragraphs
  const paragraphs = escaped.split(/\n\s*\n/);
  
  return paragraphs
    .filter(p => p.trim()) // Remove empty paragraphs
    .map(paragraph => {
      // Replace single newlines with <br> tags within paragraphs
      const withBreaks = paragraph.trim().replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('');
}

// Convert any content type to HTML for rich text editing
export function toHtmlFromContent(content: string): string {
  if (!content) return '';
  
  if (isLikelyHtml(content)) {
    // Already HTML, just return it
    return content;
  } else if (looksLikeMarkdown(content)) {
    // Convert Markdown to HTML
    return simpleMarkdownToHtml(content);
  } else {
    // Plain text, convert to HTML with proper formatting
    return toHtmlFromPlainText(content);
  }
}

// Main function to render content for preview (handles HTML, Markdown, and plain text)
export function renderForPreview(content: string): string {
  if (!content) return '';
  
  const htmlContent = toHtmlFromContent(content);
  return sanitizeHtml(htmlContent);
}
