import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Search, 
  FileText, 
  Edit3, 
  Trash2, 
  Copy, 
  Calendar,
  Filter,
  Loader2,
  BookOpen,
  Sparkles,
  Folder,
  Tag,
  Download,
  CheckSquare,
  Square,
  Palette,
  Settings,
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { stripHtml } from '@/lib/utils';
import { SynthesizeDialog } from '../SynthesizeDialog';
import { CategoryManager } from '../CategoryManager';
import { InlineTagEditor } from '../InlineTagEditor';
import { InlineCategoryEditor } from '../InlineCategoryEditor';

interface Content {
  id: string;
  title: string;
  content: string;
  content_type: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface LibraryTabProps {
  onSelectContent: (content: Content) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onSelectContent }) => {
  const [content, setContent] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showSynthesizeDialog, setShowSynthesizeDialog] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const loadContent = async () => {
    if (!user) return;

    try {
      // First load content with categories
      let query = supabase
        .from('content')
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('content_type', filterType);
      }

      if (filterCategory !== 'all') {
        query = query.eq('category_id', filterCategory);
      }

      // Apply sorting - map UI sort fields to DB columns
      const [sortField, sortDirection] = sortBy.split('_');
      const sortFieldMap: Record<string, string> = {
        'created': 'created_at',
        'updated': 'updated_at',
        'title': 'title'
      };
      const dbSortField = sortFieldMap[sortField] || 'created_at';
      query = query.order(dbSortField, { ascending: sortDirection === 'asc' });

      const { data: contentData, error: contentError } = await query;

      if (contentError) throw contentError;

      if (!contentData || contentData.length === 0) {
        setContent([]);
        return;
      }

      // Load tags for all content items
      const contentIds = contentData.map(item => item.id);
      const { data: contentTagsData, error: tagsError } = await supabase
        .from('content_tags')
        .select(`
          content_id,
          tag:tags(id, name, color)
        `)
        .in('content_id', contentIds);

      if (tagsError) {
        console.warn('Error loading tags:', tagsError);
      }

      // Group tags by content_id
      const tagsByContentId: Record<string, any[]> = {};
      if (contentTagsData) {
        contentTagsData.forEach(ct => {
          if (!tagsByContentId[ct.content_id]) {
            tagsByContentId[ct.content_id] = [];
          }
          if (ct.tag) {
            tagsByContentId[ct.content_id].push(ct.tag);
          }
        });
      }

      // Transform data to include tags array
      let transformedData = contentData.map(item => ({
        ...item,
        tags: tagsByContentId[item.id] || []
      }));

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        transformedData = transformedData.filter(item => {
          const plainContent = stripHtml(item.content);
          return item.title.toLowerCase().includes(query) ||
            plainContent.toLowerCase().includes(query) ||
            item.content_type.toLowerCase().includes(query) ||
            item.category?.name.toLowerCase().includes(query) ||
            item.tags?.some((tag: any) => tag.name.toLowerCase().includes(query));
        });
      }

      // Apply tag filter
      if (filterTag !== 'all') {
        transformedData = transformedData.filter(item => 
          item.tags?.some((tag: any) => tag.id === filterTag)
        );
      }

      setContent(transformedData);
    } catch (error: any) {
      console.error('Error loading content:', error);
      toast({
        variant: "destructive",
        title: "Error loading content",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesAndTags = async () => {
    if (!user) return;

    try {
      const [categoriesResult, tagsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('name'),
        supabase
          .from('tags')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('name')
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (tagsResult.error) throw tagsResult.error;

      setCategories(categoriesResult.data || []);
      setTags(tagsResult.data || []);
    } catch (error: any) {
      console.error('Error loading categories and tags:', error);
    }
  };

  useEffect(() => {
    loadContent();
    loadCategoriesAndTags();
  }, [user, filterType, filterCategory, filterTag, sortBy]);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      loadContent();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      setContent(prev => prev.filter(item => item.id !== contentId));
      setDeleteItemId(null);
      toast({
        title: "Content deleted",
        description: "The content has been removed from your library.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting content",
        description: error.message,
      });
    }
  };

  const handleDuplicate = async (item: Content) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .insert({
          user_id: user!.id,
          title: `${item.title} (Copy)`,
          content: item.content,
          content_type: item.content_type,
          source_url: item.source_url,
          metadata: { ...item.metadata, duplicated_from: item.id },
        })
        .select()
        .single();

      if (error) throw error;

      setContent(prev => [data, ...prev]);
      toast({
        title: "Content duplicated",
        description: "A copy has been created in your library.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error duplicating content",
        description: error.message,
      });
    }
  };

  const getContentTypeColor = (type: string) => {
    const colors = {
      article: 'bg-primary/10 text-primary border-primary/20',
      'blog-post': 'bg-secondary/10 text-secondary-foreground border-secondary/20',
      'social-media': 'bg-accent/10 text-accent border-accent/20',
      newsletter: 'bg-muted text-muted-foreground border-muted-foreground/20',
      script: 'bg-destructive/10 text-destructive border-destructive/20',
      notes: 'bg-foreground/10 text-foreground border-foreground/20',
      other: 'bg-muted text-muted-foreground border-muted-foreground/20',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(prev => 
      prev.length === content.length ? [] : content.map(item => item.id)
    );
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      setContent(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      
      toast({
        title: "Content deleted",
        description: `${selectedItems.length} items have been removed from your library.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting content",
        description: error.message,
      });
    }
  };

  const handleExportContent = () => {
    const selectedContent = content.filter(item => selectedItems.includes(item.id));
    const exportData = selectedContent.map(item => ({
      title: item.title,
      content: stripHtml(item.content),
      type: item.content_type,
      category: item.category?.name || 'Uncategorized',
      tags: item.tags?.map(tag => tag.name).join(', ') || '',
      created: item.created_at,
      updated: item.updated_at
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Content exported",
      description: `${selectedItems.length} items have been exported.`,
    });
  };

  const handleTagsChange = (contentId: string, newTags: any[]) => {
    setContent(prev => prev.map(item => 
      item.id === contentId ? { ...item, tags: newTags } : item
    ));
  };

  const handleCategoryChange = (contentId: string, newCategory?: any) => {
    setContent(prev => prev.map(item => 
      item.id === contentId ? { ...item, category: newCategory, category_id: newCategory?.id } : item
    ));
  };

  const getSelectedContent = () => {
    return content.filter(item => selectedItems.includes(item.id));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
          <p className="text-muted-foreground">Loading your content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-2">
          <div className="relative inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Content Library
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-30"></div>
          </div>
          <p className="text-muted-foreground/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Organize and manage all your content in one place
          </p>
        </div>

        {/* Search and Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search - takes full width on mobile, flexible on desktop */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-primary pl-10 h-10"
                />
              </div>
              
              {/* Mobile: Collapsible Filters */}
              {isMobile && (
                <Collapsible open={isFiltersExpanded} onOpenChange={setIsFiltersExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {isFiltersExpanded ? (
                        <ChevronUp className="w-4 h-4 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-3">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border z-50">
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="blog-post">Blog Post</SelectItem>
                          <SelectItem value="social-media">Social Media</SelectItem>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="script">Script</SelectItem>
                          <SelectItem value="notes">Notes</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border z-50">
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
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

                      <Select value={filterTag} onValueChange={setFilterTag}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Tags" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border z-50">
                          <SelectItem value="all">All Tags</SelectItem>
                          {tags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: tag.color }}
                                />
                                <span>{tag.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border z-50">
                          <SelectItem value="created_desc">Newest First</SelectItem>
                          <SelectItem value="created_asc">Oldest First</SelectItem>
                          <SelectItem value="updated_desc">Recently Updated</SelectItem>
                          <SelectItem value="title_asc">Title A-Z</SelectItem>
                          <SelectItem value="title_desc">Title Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              {/* Desktop: Horizontal Filters */}
              {!isMobile && (
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="blog-post">Blog Post</SelectItem>
                      <SelectItem value="social-media">Social Media</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="script">Script</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
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

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50">
                      <SelectItem value="created_desc">Newest</SelectItem>
                      <SelectItem value="created_asc">Oldest</SelectItem>
                      <SelectItem value="updated_desc">Updated</SelectItem>
                      <SelectItem value="title_asc">A-Z</SelectItem>
                      <SelectItem value="title_desc">Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryManager(true)}
                className="whitespace-nowrap"
              >
                <Settings className="w-4 h-4 mr-2" />
                Categories
              </Button>
            </div>

            {/* Bulk Actions - Sticky toolbar when items selected */}
            {selectedItems.length > 0 && (
              <div className="sticky top-0 z-10 mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">
                      {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportContent}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowSynthesizeDialog(true)}
                      className="btn-accent"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Synthesize
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Grid */}
        {content.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No content found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by creating your first piece of content'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={content.length > 0 && selectedItems.length === content.length}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium">
                  Select All ({content.length} items)
                </label>
              </div>
            </div>

            <div className="space-y-6">
              {content.map((item) => (
                <Card 
                  key={item.id} 
                  className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer ${
                    selectedItems.includes(item.id) ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-surface/50'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.card-actions, .inline-editor, .select-checkbox')) return;
                    onSelectContent(item);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Selection Checkbox */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectItem(item.id);
                        }}
                        className="select-checkbox cursor-pointer flex-shrink-0 mt-2"
                      >
                        {selectedItems.includes(item.id) ? (
                          <div className="w-5 h-5 bg-primary text-primary-foreground rounded-md flex items-center justify-center shadow-sm">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-md hover:border-primary/50 transition-colors" />
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 space-y-4">
                        {/* Title and Actions Row */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                              {item.title}
                            </h3>
                            
                            {/* Type Label - More subtle styling */}
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-muted/60 text-muted-foreground border border-muted-foreground/20">
                                {item.content_type.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions - Dropdown Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="card-actions h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border z-50">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectContent(item);
                                }}
                                className="cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(item);
                                }}
                                className="cursor-pointer"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItemId(item.id);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-muted-foreground/80">
                            {stripHtml(item.content).split(/\s+/).length} words
                          </span>
                          {item.source_url && (() => {
                            try {
                              return (
                                <span className="text-muted-foreground/80 truncate">
                                  from {new URL(item.source_url).hostname}
                                </span>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                        </div>

                        {/* Content Preview */}
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {(() => {
                            const plainContent = stripHtml(item.content);
                            return plainContent.length > 300 
                              ? `${plainContent.substring(0, 300)}...` 
                              : plainContent;
                          })()}
                        </p>

                        {/* Category and Tags Row */}
                        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                          <div className="inline-editor flex items-center gap-3 flex-1">
                            <InlineCategoryEditor
                              contentId={item.id}
                              currentCategory={item.category}
                              availableCategories={categories}
                              onCategoryChange={(category) => handleCategoryChange(item.id, category)}
                            />
                            <InlineTagEditor
                              contentId={item.id}
                              currentTags={item.tags || []}
                              availableTags={tags}
                              onTagsChange={(newTags) => handleTagsChange(item.id, newTags)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </>
          )}
        </div>

        {/* Dialogs */}
        <SynthesizeDialog
          open={showSynthesizeDialog}
          onOpenChange={setShowSynthesizeDialog}
          selectedItems={getSelectedContent()}
          onSynthesizeComplete={() => {
            loadContent();
            setSelectedItems([]);
          }}
        />

        <CategoryManager
          open={showCategoryManager}
          onOpenChange={setShowCategoryManager}
          onCategoryChange={() => {
            loadCategoriesAndTags();
            loadContent();
          }}
        />
      </div>
    );
  };