import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { stripHtml } from '@/lib/utils';
import { SynthesizeDialog } from '../SynthesizeDialog';
import { CategoryManager } from '../CategoryManager';

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
  const { toast } = useToast();
  const { user } = useAuth();

  const loadContent = async () => {
    if (!user) return;

    try {
      // First load content with categories
      let query = supabase
        .from('content')
        .select(`
          *,
          category:categories(name, color)
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

        {/* Filters and Search */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters & Search</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryManager(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Categories
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-primary pl-10 h-12 text-base"
                />
              </div>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="input-primary h-12">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
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

              {/* Category Filter */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="input-primary h-12">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
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

              {/* Tag Filter */}
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="input-primary h-12">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
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

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="input-primary h-12">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Newest First</SelectItem>
                  <SelectItem value="created_asc">Oldest First</SelectItem>
                  <SelectItem value="updated_desc">Recently Updated</SelectItem>
                  <SelectItem value="title_asc">Title A-Z</SelectItem>
                  <SelectItem value="title_desc">Title Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {content.map((item) => (
                <Card 
                  key={item.id} 
                  className={`content-card group cursor-pointer relative ${
                    selectedItems.includes(item.id) ? 'content-card-selected' : ''
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.card-actions')) return;
                    onSelectContent(item);
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item.id);
                          }}
                          className="cursor-pointer"
                        >
                          {selectedItems.includes(item.id) ? (
                            <div className="w-5 h-5 bg-primary text-primary-foreground rounded-md flex items-center justify-center shadow-sm">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-md hover:border-primary/50 transition-colors group-hover:border-primary/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
                            {item.title}
                          </CardTitle>
                          <CardDescription className="flex items-center flex-wrap gap-2 mt-2">
                            <Badge className={`${getContentTypeColor(item.content_type)} text-xs px-3 py-1 font-medium`}>
                              {item.content_type.replace('-', ' ')}
                            </Badge>
                            {item.category && (
                              <Badge 
                                variant="outline" 
                                className="text-xs px-3 py-1 border-2"
                                style={{ 
                                  borderColor: item.category.color + '40',
                                  backgroundColor: item.category.color + '10',
                                  color: item.category.color 
                                }}
                              >
                                <Folder className="w-3 h-3 mr-1" />
                                {item.category.name}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground/80 flex items-center bg-muted/40 px-2 py-1 rounded-lg">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(item.created_at), 'MMM d')}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {(() => {
                        const plainContent = stripHtml(item.content);
                        return plainContent.length > 150 
                          ? `${plainContent.substring(0, 150)}...` 
                          : plainContent;
                      })()}
                    </p>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                                <Badge 
                                  key={tag.id}
                                  variant="secondary" 
                                  className="text-xs px-3 py-1 rounded-full font-medium hover:scale-105 transition-transform"
                                  style={{ 
                                    backgroundColor: `${tag.color}15`,
                                    color: tag.color,
                                    borderColor: `${tag.color}30`,
                                    border: '1px solid'
                                  }}
                                >
                                  <Tag className="w-2 h-2 mr-1" />
                                  {tag.name}
                                </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{stripHtml(item.content).split(/\s+/).length} words</span>
                      {item.source_url && (() => {
                        try {
                          return (
                            <span className="truncate ml-2">
                              {new URL(item.source_url).hostname}
                            </span>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>

                    {/* Actions */}
                    <div className="card-actions flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectContent(item);
                        }}
                        className="btn-accent flex-1 h-10 rounded-xl shadow-sm hover:shadow-md"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(item);
                          }}
                          className="flex-1 sm:flex-none h-10 rounded-xl hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
                        >
                          <Copy className="w-4 h-4 sm:mr-0 mr-2" />
                          <span className="sm:hidden">Duplicate</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="hover:bg-destructive hover:text-destructive-foreground flex-1 sm:flex-none h-10 rounded-xl border-destructive/20 text-destructive hover:border-destructive transition-all"
                        >
                          <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                          <span className="sm:hidden">Delete</span>
                        </Button>
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