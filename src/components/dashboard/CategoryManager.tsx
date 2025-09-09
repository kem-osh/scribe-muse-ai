import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit3, Trash2, Folder, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryChange: () => void;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#6366F1'
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  open,
  onOpenChange,
  onCategoryChange
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#3B82F6' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      loadCategories();
    }
  }, [open, user]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading categories",
        description: error.message,
      });
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide a category name.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: newCategory.name,
            description: newCategory.description,
            color: newCategory.color,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "Category updated",
          description: "The category has been updated successfully.",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            user_id: user!.id,
            name: newCategory.name,
            description: newCategory.description,
            color: newCategory.color,
          });

        if (error) throw error;

        toast({
          title: "Category created",
          description: "The category has been created successfully.",
        });
      }

      setNewCategory({ name: '', description: '', color: '#3B82F6' });
      setEditingCategory(null);
      loadCategories();
      onCategoryChange();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving category",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Category deleted",
        description: "The category has been removed.",
      });

      loadCategories();
      onCategoryChange();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting category",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setNewCategory({ name: '', description: '', color: '#3B82F6' });
    setEditingCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Folder className="w-5 h-5 text-primary" />
            <span>Manage Categories</span>
          </DialogTitle>
          <DialogDescription>
            Create and organize categories to better organize your content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create/Edit Form */}
          <div className="border border-border rounded-lg p-4 bg-surface">
            <h3 className="font-medium mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Category name..."
                  className="input-primary mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Optional description..."
                  className="input-primary mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <div className="flex space-x-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCategory({ ...newCategory, color })}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          newCategory.color === color 
                            ? 'border-foreground scale-110' 
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveCategory}
                  disabled={isLoading || !newCategory.name.trim()}
                  className="btn-primary"
                >
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
                {editingCategory && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Categories List */}
          <div>
            <h3 className="font-medium mb-3">Your Categories ({categories.length})</h3>
            <ScrollArea className="max-h-64">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No categories yet. Create your first one above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};