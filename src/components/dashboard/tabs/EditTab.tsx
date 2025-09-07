import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (selectedContent) {
      setOriginalContent(selectedContent.content);
      setEditedContent(selectedContent.content);
      setEditedTitle(selectedContent.title);
      setAiSuggestion('');
    }
  }, [selectedContent]);

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
      {/* Header */}
      <div className="border-b border-border bg-surface/50 p-4 sm:p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Edit Content</h1>
              <p className="text-sm text-muted-foreground">Make improvements with AI assistance</p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-full sm:w-32 h-12 sm:h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Split View</SelectItem>
                  <SelectItem value="edit">Edit Only</SelectItem>
                  <SelectItem value="preview">Preview Only</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex space-x-2">
                <Button onClick={handleReset} variant="outline" size="sm" className="flex-1 sm:flex-none h-12 sm:h-auto">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="btn-accent flex-1 sm:flex-none h-12 sm:h-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Title Editor */}
          <div className="mb-4">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="input-primary h-12 text-base"
            />
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto p-4">
          <div className={`grid h-full gap-4 ${
            viewMode === 'split' 
              ? 'grid-cols-1 lg:grid-cols-2' 
              : 'grid-cols-1'
          }`}>
            {/* Original/Edit Content */}
            {(viewMode === 'split' || viewMode === 'edit') && (
              <Card className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {viewMode === 'split' ? 'Edit Content' : 'Content Editor'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="input-primary flex-1 resize-none text-base"
                    placeholder="Edit your content here..."
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {editedContent.split(/\s+/).length} words
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <Card className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {viewMode === 'split' ? 'Original Content' : 'Content Preview'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="h-full p-4 bg-surface rounded-lg overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">
                        {viewMode === 'preview' ? editedContent : originalContent}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <div className="border-t border-border bg-surface/50 p-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Sparkles className="w-5 h-5" />
                <span>AI Assistant</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="edit-goal">Editing Goal</Label>
                  <Input
                    id="edit-goal"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    placeholder="Make it more engaging"
                    className="input-primary h-12 text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="input-primary h-12">
                      <SelectValue placeholder="Select tone" />
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
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <Button
                    onClick={handleAISuggestion}
                    disabled={isLoading || !editGoal.trim()}
                    className="btn-accent w-full h-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Get Suggestion
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {aiSuggestion && (
                <div className="border border-accent/20 rounded-lg p-4 bg-accent/5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-accent">AI Suggestion</h4>
                    <Button
                      size="sm"
                      onClick={handleApplySuggestion}
                      className="btn-accent h-10"
                    >
                      Apply
                    </Button>
                  </div>
                  <div className="text-sm whitespace-pre-wrap bg-background rounded p-3">
                    {aiSuggestion}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};