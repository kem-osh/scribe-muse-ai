import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { renderForPreview } from '@/lib/utils';
import { Eye } from 'lucide-react';

interface ContentPreviewProps {
  title: string;
  content: string;
  contentType: string;
  sourceUrl?: string;
}

export const ContentPreview: React.FC<ContentPreviewProps> = ({
  title,
  content,
  contentType,
  sourceUrl,
}) => {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // ~200 words per minute

  if (!title.trim() && !content.trim()) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
          <Eye className="w-8 h-8 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Live Preview</h3>
          <p className="text-xs text-muted-foreground/70">
            Start typing to see how your content will look
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg leading-tight">
            {title || 'Untitled'}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {contentType}
          </Badge>
        </div>
        {sourceUrl && (
          <p className="text-xs text-muted-foreground break-all">
            Source: {sourceUrl}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span>{readingTime} min read</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div 
          className="rich-content prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderForPreview(content) }}
        />
      </CardContent>
    </Card>
  );
};