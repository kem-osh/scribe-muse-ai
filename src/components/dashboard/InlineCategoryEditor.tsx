import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface InlineCategoryEditorProps {
  contentId: string;
  currentCategory?: Category;
  availableCategories: Category[];
  onCategoryChange: (category?: Category) => void;
  className?: string;
}

export const InlineCategoryEditor: React.FC<InlineCategoryEditorProps> = ({
  contentId,
  currentCategory,
  availableCategories,
  onCategoryChange,
  className
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateCategory = async (categoryId?: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ category_id: categoryId || null })
        .eq('id', contentId);

      if (error) throw error;

      const newCategory = categoryId 
        ? availableCategories.find(c => c.id === categoryId)
        : undefined;

      onCategoryChange(newCategory);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating category",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const removeCategory = async () => {
    await updateCategory();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {currentCategory ? (
        <Badge
          variant="outline"
          className="text-xs px-2 py-1 border-2 group cursor-pointer"
          style={{
            borderColor: currentCategory.color + '40',
            backgroundColor: currentCategory.color + '10',
            color: currentCategory.color
          }}
        >
          <Folder className="w-3 h-3 mr-1" />
          {currentCategory.name}
          <X 
            className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 rounded-full p-0.5" 
            onClick={(e) => {
              e.stopPropagation();
              removeCategory();
            }}
          />
        </Badge>
      ) : (
        <Select 
          value={currentCategory?.id || "none"} 
          onValueChange={(value) => updateCategory(value === "none" ? undefined : value)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-auto h-6 px-2 text-xs border-dashed hover:border-primary/50">
            <SelectValue placeholder="Add category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {availableCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};