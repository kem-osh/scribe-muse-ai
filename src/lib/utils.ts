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

// Check if content is likely HTML (has HTML tags that aren't just escaped)
export function isLikelyHtml(content: string): boolean {
  // More comprehensive HTML detection
  const htmlTags = /<(?!\/?\s*(?:br|p)\s*\/?>)[a-z][\s\S]*?>/i;
  const hasActualTags = htmlTags.test(content);
  
  // If it has more than just basic tags or has attributes, it's likely HTML
  return hasActualTags || /<[a-z]+\s+[^>]*>/i.test(content);
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

// Main function to render content for preview (handles both HTML and plain text)
export function renderForPreview(content: string): string {
  if (!content) return '';
  
  if (isLikelyHtml(content)) {
    // Content appears to be HTML, just sanitize it
    return sanitizeHtml(content);
  } else {
    // Content is plain text, convert to HTML with proper formatting
    const htmlContent = toHtmlFromPlainText(content);
    return sanitizeHtml(htmlContent);
  }
}
