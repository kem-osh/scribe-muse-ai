import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  FileText, 
  Edit3, 
  Trash2, 
  Copy, 
  Calendar,
  Filter,
  Loader2,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { stripHtml } from '@/lib/utils';

interface Content {
  id: string;
  title: string;
  content: string;
  content_type: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

interface LibraryTabProps {
  onSelectContent: (content: Content) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onSelectContent }) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const { toast } = useToast();
  const { user } = useAuth();

  const loadContent = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('content')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('content_type', filterType);
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

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter
      let filteredData = data || [];
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(item => {
          const plainContent = stripHtml(item.content);
          return item.title.toLowerCase().includes(query) ||
            plainContent.toLowerCase().includes(query) ||
            item.content_type.toLowerCase().includes(query);
        });
      }

      setContent(filteredData);
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

  useEffect(() => {
    loadContent();
  }, [user, filterType, sortBy]);

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
      article: 'bg-blue-100 text-blue-800',
      'blog-post': 'bg-green-100 text-green-800',
      'social-media': 'bg-purple-100 text-purple-800',
      newsletter: 'bg-orange-100 text-orange-800',
      script: 'bg-red-100 text-red-800',
      notes: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || colors.other;
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Content Library</h1>
          <p className="text-muted-foreground">
            Organize and manage all your content in one place
          </p>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {content.map((item) => (
              <Card 
                key={item.id} 
                className="content-card group cursor-pointer hover:shadow-lg transition-all"
                onClick={() => onSelectContent(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{item.title}</CardTitle>
                      <CardDescription className="flex items-center space-x-2 mt-1">
                        <Badge className={getContentTypeColor(item.content_type)}>
                          {item.content_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {(() => {
                      const plainContent = stripHtml(item.content);
                      return plainContent.length > 150 
                        ? `${plainContent.substring(0, 150)}...` 
                        : plainContent;
                    })()}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stripHtml(item.content).split(/\s+/).length} words</span>
                    {item.source_url && (
                      <span className="truncate ml-2">
                        {new URL(item.source_url).hostname}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectContent(item);
                      }}
                      className="btn-accent flex-1 h-10"
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
                        className="flex-1 sm:flex-none h-10"
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
                        className="hover:bg-destructive hover:text-destructive-foreground flex-1 sm:flex-none h-10"
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
        )}
      </div>
    </div>
  );
};