import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, Plus, Tag, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface InlineTagEditorProps {
  contentId: string;
  currentTags: Tag[];
  availableTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  className?: string;
}

export const InlineTagEditor: React.FC<InlineTagEditorProps> = ({
  contentId,
  currentTags,
  availableTags,
  onTagsChange,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const addTag = async (tag: Tag) => {
    try {
      // Check if tag is already assigned
      if (currentTags.some(t => t.id === tag.id)) return;

      const { error } = await supabase
        .from('content_tags')
        .insert({
          content_id: contentId,
          tag_id: tag.id
        });

      if (error) throw error;

      onTagsChange([...currentTags, tag]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding tag",
        description: error.message,
      });
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('content_tags')
        .delete()
        .eq('content_id', contentId)
        .eq('tag_id', tagId);

      if (error) throw error;

      onTagsChange(currentTags.filter(t => t.id !== tagId));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error removing tag",
        description: error.message,
      });
    }
  };

  const createAndAddTag = async () => {
    if (!newTagName.trim() || !user) return;

    setIsCreating(true);
    try {
      // Create new tag
      const { data: newTag, error: createError } = await supabase
        .from('tags')
        .insert({
          name: newTagName.trim(),
          user_id: user.id,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add to content
      await addTag(newTag);
      
      setNewTagName('');
      setOpen(false);
      
      toast({
        title: "Tag created",
        description: `Tag "${newTag.name}" has been created and added.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating tag",
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {/* Current Tags */}
      {currentTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs px-2 py-1 rounded-full font-medium group cursor-pointer"
          style={{
            backgroundColor: `${tag.color}15`,
            color: tag.color,
            borderColor: `${tag.color}30`,
            border: '1px solid'
          }}
        >
          <Tag className="w-2 h-2 mr-1" />
          {tag.name}
          <X 
            className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 rounded-full p-0.5" 
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag.id);
            }}
          />
        </Badge>
      ))}

      {/* Add Tag Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs border-dashed hover:border-primary/50"
          >
            <Plus className="w-3 h-3 mr-1" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Command>
            <CommandInput 
              placeholder="Search tags..." 
              value={newTagName}
              onValueChange={setNewTagName}
            />
            <CommandEmpty className="py-2 px-3">
              {newTagName.trim() && (
                <Button
                  size="sm"
                  onClick={createAndAddTag}
                  disabled={isCreating}
                  className="w-full"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create "{newTagName.trim()}"
                </Button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {availableTags
                .filter(tag => !currentTags.some(t => t.id === tag.id))
                .map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => {
                      addTag(tag);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};