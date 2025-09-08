import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { 
  Save, 
  Loader2, 
  RotateCcw, 
  Sparkles, 
  Split,
  Eye,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { stripHtml, renderForPreview } from '@/lib/utils';

interface Content {
  id: string;
  title: string;
  content: string;
  content_type: string;
  source_url?: string;
}

interface EditTabProps {
  selectedContent: Content | null;
}

export const EditTab: React.FC<EditTabProps> = ({ selectedContent }) => {
  const [originalContent, setOriginalContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [tone, setTone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [previewSource, setPreviewSource] = useState<'original' | 'edited'>('edited');
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if there are unsaved changes
  const hasUnsavedChanges = editedContent !== originalContent || editedTitle !== selectedContent?.title;

  useEffect(() => {
    if (selectedContent) {
      setOriginalContent(selectedContent.content);
      setEditedContent(selectedContent.content);
      setEditedTitle(selectedContent.title);
      setAiSuggestion('');
    }
  }, [selectedContent]);

  // Keyboard shortcuts and unsaved changes warning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editedContent !== originalContent || editedTitle !== selectedContent?.title) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editedContent, originalContent, editedTitle, selectedContent?.title]);

  const handleAISuggestion = async () => {
    if (!selectedContent || !editGoal.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide an editing goal.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://hook.eu2.make.com/3s45gpyrmq1yaf9virec2yql51pcqe40', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'edit_suggestion',
          content: editedContent,
          title: editedTitle,
          goal: editGoal,
          tone: tone || 'professional',
          content_type: selectedContent.content_type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestion');
      }

      const data = await response.json();
      setAiSuggestion(data.suggestion || 'No suggestion available');
      
      toast({
        title: "AI suggestion generated",
        description: "Review the suggestion in the panel below.",
      });

    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get AI suggestion. Please try again.",
      });
      setAiSuggestion('Sorry, I could not generate a suggestion at this time. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      setEditedContent(aiSuggestion);
      setAiSuggestion('');
      toast({
        title: "Suggestion applied",
        description: "The AI suggestion has been applied to your content.",
      });
    }
  };

  const handleSave = async () => {
    if (!selectedContent || !user) return;

    setIsSaving(true);

    try {
      // Save version history
      const { error: versionError } = await supabase
        .from('content_versions')
        .insert({
          content_id: selectedContent.id,
          title: editedTitle,
          content: editedContent,
          edit_notes: editGoal || 'Manual edit',
        });

      if (versionError) throw versionError;

      // Update main content
      const { error: updateError } = await supabase
        .from('content')
        .update({
          title: editedTitle,
          content: editedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedContent.id);

      if (updateError) throw updateError;

      setOriginalContent(editedContent);
      
      toast({
        title: "Changes saved",
        description: "Your content has been updated successfully.",
      });

    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        variant: "destructive",
        title: "Error saving",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedContent(originalContent);
    setEditedTitle(selectedContent?.title || '');
    setAiSuggestion('');
  };

  if (!selectedContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Split className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No content selected</h3>
            <p className="text-muted-foreground">
              Select content from your Library to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="px-4 py-2">
          {/* First row: Title, View Mode, Actions */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center space-x-2 min-w-0">
              <h2 className="text-lg font-bold text-foreground">Edit Content</h2>
              {hasUnsavedChanges && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                  Unsaved
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="preview">Preview</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleReset}
                disabled={!hasUnsavedChanges}
                variant="outline"
                size="sm"
                className="h-8 px-3"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="btn-primary h-8 px-3"
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Second row: Title Editor */}
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Content title..."
            className="input-primary h-8 text-sm mb-2"
          />

          {/* Third row: AI Assistant - Compact */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-accent">
              <Sparkles className="w-3 h-3" />
              <span className="font-medium">AI:</span>
            </div>
            <Input
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              placeholder="Editing goal..."
              className="input-primary h-7 text-xs flex-1"
            />
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="input-primary h-7 w-24 text-xs">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="persuasive">Persuasive</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAISuggestion}
              disabled={isLoading || !editGoal.trim()}
              className="btn-accent h-7 px-2 text-xs"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
            </Button>
            {aiSuggestion && (
              <Button
                size="sm"
                onClick={handleApplySuggestion}
                className="btn-accent h-7 px-2 text-xs"
              >
                Apply
              </Button>
            )}
          </div>
          
          {/* AI Suggestion - Collapsible */}
          {aiSuggestion && (
            <div className="mt-2 border border-accent/20 rounded p-2 bg-accent/5 text-xs">
              <div className="whitespace-pre-wrap line-clamp-3">{aiSuggestion}</div>
            </div>
          )}
        </div>
      </div>

      {/* Content Editor - Maximum space (75%+ of viewport) */}
      <div className="flex-1 min-h-0" style={{ minHeight: '75vh' }}>
        <div className="h-full px-4 py-2">
          <div className={`grid gap-2 h-full ${
            viewMode === 'split' 
              ? 'grid-cols-1 xl:grid-cols-2' 
              : 'grid-cols-1'
          }`}>
            {/* Original/Edit Content */}
            {(viewMode === 'split' || viewMode === 'edit') && (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <RichTextEditor
                    value={editedContent}
                    onChange={setEditedContent}
                    placeholder="Edit your content here..."
                    className="h-full"
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground px-1">
                  {stripHtml(editedContent).split(/\s+/).length} words
                </div>
              </div>
            )}

            {/* Preview */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Preview</span>
                  {viewMode === 'split' && (
                    <div className="flex bg-surface rounded p-0.5">
                      <button
                        onClick={() => setPreviewSource('original')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          previewSource === 'original'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setPreviewSource('edited')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          previewSource === 'edited'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Live
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 bg-surface rounded overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="rich-content"
                      dangerouslySetInnerHTML={{
                        __html: renderForPreview(
                          viewMode === 'preview' 
                            ? editedContent 
                            : previewSource === 'edited' 
                              ? editedContent 
                              : originalContent
                        )
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};