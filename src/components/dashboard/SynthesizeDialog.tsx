import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { callClaudeSynthesize } from '@/lib/claudeUtils';

interface Content {
  id: string;
  title: string;
  content: string;
  content_type: string;
}

interface SynthesizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Content[];
  onSynthesizeComplete: () => void;
}

export const SynthesizeDialog: React.FC<SynthesizeDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  onSynthesizeComplete
}) => {
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState('professional');
  const [targetType, setTargetType] = useState('article');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSynthesize = async () => {
    if (!goal.trim() || !title.trim() || selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide a goal, title, and select at least one content item.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call Claude API directly instead of using webhooks
      const result = await callClaudeSynthesize({
        contents: selectedItems.map(item => ({
          title: item.title,
          content: item.content,
          content_type: item.content_type,
        })),
        goal,
        tone,
        target_type: targetType,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const synthesizedContent = result.synthesized_content || result.response;
      
      if (!synthesizedContent) {
        throw new Error('No synthesized content received from Claude AI');
      }

      // Save synthesized content to database
      const { error } = await supabase
        .from('content')
        .insert({
          user_id: user!.id,
          title,
          content: synthesizedContent,
          content_type: targetType,
          metadata: {
            synthesized_from: selectedItems.map(item => item.id),
            synthesis_goal: goal,
            synthesis_tone: tone
          }
        });

      if (error) throw error;

      toast({
        title: "Content synthesized successfully",
        description: "Your new content has been created from the selected items using Claude AI.",
      });

      onSynthesizeComplete();
      onOpenChange(false);
      
      // Reset form
      setGoal('');
      setTitle('');
      setTone('professional');
      setTargetType('article');

    } catch (error: any) {
      console.error('Error synthesizing content with Claude AI:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to synthesize content using Claude AI. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span>Synthesize Content</span>
          </DialogTitle>
          <DialogDescription>
            Combine multiple content items into one cohesive piece using AI
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-6">
            {/* Selected Items */}
            <div>
              <Label className="text-sm font-medium">Selected Items ({selectedItems.length})</Label>
              <div className="mt-2 space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.content_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.content.length > 100 ? `${item.content.substring(0, 100)}...` : item.content}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesis Goal */}
            <div>
              <Label htmlFor="goal">Synthesis Goal *</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what you want to achieve by combining these contents..."
                className="input-primary mt-1"
                rows={3}
              />
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">New Content Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title for the synthesized content..."
                className="input-primary mt-1"
              />
            </div>

            {/* Tone and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="input-primary mt-1">
                    <SelectValue />
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

              <div>
                <Label htmlFor="targetType">Target Content Type</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger className="input-primary mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="blog-post">Blog Post</SelectItem>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSynthesize}
            disabled={isLoading || !goal.trim() || !title.trim() || selectedItems.length === 0}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Synthesize Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};