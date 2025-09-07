import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  Twitter, 
  Linkedin, 
  FileText, 
  Globe, 
  Loader2,
  CheckCircle,
  Clock,
  ExternalLink,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Content {
  id: string;
  title: string;
  content: string;
  content_type: string;
}

interface PublishRecord {
  id: string;
  content: Content;
  platform: string;
  status: string;
  platform_id?: string;
  published_at?: string;
  created_at: string;
}

const platforms = [
  { id: 'twitter', name: 'Twitter', icon: Twitter, description: 'Share as tweets or thread' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, description: 'Professional post or article' },
  { id: 'medium', name: 'Medium', icon: FileText, description: 'Blog article' },
  { id: 'blog', name: 'Personal Blog', icon: Globe, description: 'Your website' },
];

export const PublishTab: React.FC = () => {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [customizations, setCustomizations] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [userContent, setUserContent] = useState<Content[]>([]);
  const [publishHistory, setPublishHistory] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load user content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (contentError) throw contentError;

      // Load publish history with content details
      const { data: history, error: historyError } = await supabase
        .from('publish_history')
        .select(`
          *,
          content:content_id (id, title, content, content_type)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      setUserContent(content || []);
      setPublishHistory(history || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedContent && selectedPlatform) {
      generatePreview();
    }
  }, [selectedContent, selectedPlatform, customizations]);

  const generatePreview = () => {
    if (!selectedContent) return;

    let formatted = selectedContent.content;

    // Platform-specific formatting
    switch (selectedPlatform) {
      case 'twitter':
        // Truncate for Twitter
        if (formatted.length > 250) {
          formatted = formatted.substring(0, 247) + '...';
        }
        break;
      case 'linkedin':
        // Add professional formatting
        formatted = `${selectedContent.title}\n\n${formatted}\n\n#professional #content`;
        break;
      case 'medium':
        // Add title and medium-style formatting
        formatted = `# ${selectedContent.title}\n\n${formatted}`;
        break;
    }

    // Apply custom modifications
    if (customizations.trim()) {
      formatted += `\n\n---\n${customizations}`;
    }

    setPreviewContent(formatted);
  };

  const handlePublish = async () => {
    if (!selectedContent || !selectedPlatform || !user) return;

    setIsPublishing(true);

    try {
      // Send to webhook
      const response = await fetch('https://hook.eu2.make.com/3s45gpyrmq1yaf9virec2yql51pcqe40', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'publish',
          content: previewContent,
          title: selectedContent.title,
          platform: selectedPlatform,
          content_type: selectedContent.content_type,
          content_id: selectedContent.id,
          user_id: user.id,
        }),
      });

      let platformId = null;
      let status = 'pending';

      if (response.ok) {
        const result = await response.json();
        platformId = result.platform_id;
        status = result.status || 'published';
      }

      // Record in database
      const { data, error } = await supabase
        .from('publish_history')
        .insert({
          content_id: selectedContent.id,
          platform: selectedPlatform,
          status,
          platform_id: platformId,
          published_at: status === 'published' ? new Date().toISOString() : null,
        })
        .select(`
          *,
          content:content_id (id, title, content, content_type)
        `)
        .single();

      if (error) throw error;

      // Update local state
      setPublishHistory(prev => [data, ...prev]);

      toast({
        title: "Content published!",
        description: `Successfully published to ${platforms.find(p => p.id === selectedPlatform)?.name}`,
      });

      // Reset form
      setSelectedContent(null);
      setSelectedPlatform('');
      setCustomizations('');
      setPreviewContent('');

    } catch (error: any) {
      console.error('Error publishing:', error);
      toast({
        variant: "destructive",
        title: "Publishing failed",
        description: error.message || "Failed to publish content. Please try again.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    if (platformData) {
      const Icon = platformData.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <Globe className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
          <p className="text-muted-foreground">Loading publish data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Publish Content</h1>
          <p className="text-muted-foreground">
            Distribute your content across multiple platforms
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Publishing Form */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6 order-2 xl:order-1">
            {/* Content Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedContent?.id || ''}
                  onValueChange={(value) => {
                    const content = userContent.find(c => c.id === value);
                    setSelectedContent(content || null);
                  }}
                >
                  <SelectTrigger className="input-primary h-12">
                    <SelectValue placeholder="Choose content to publish" />
                  </SelectTrigger>
                  <SelectContent>
                    {userContent.map((content) => (
                      <SelectItem key={content.id} value={content.id}>
                        <div className="flex items-center space-x-2">
                          <span>{content.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {content.content_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Platform Selection */}
            {selectedContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Choose Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {platforms.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = selectedPlatform === platform.id;
                      
                      return (
                        <div
                          key={platform.id}
                          onClick={() => setSelectedPlatform(platform.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:border-accent/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="w-6 h-6 text-accent flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium">{platform.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {platform.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customizations */}
            {selectedPlatform && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customizations (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={customizations}
                    onChange={(e) => setCustomizations(e.target.value)}
                    placeholder="Add hashtags, mentions, or additional content..."
                    className="input-primary text-base"
                    rows={4}
                  />
                </CardContent>
              </Card>
            )}

            {/* Preview & Publish */}
            {previewContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 text-lg">
                    <span>Preview</span>
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="btn-accent h-12 sm:h-auto w-full sm:w-auto"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-surface rounded-lg p-4 border">
                    <div className="whitespace-pre-wrap text-sm">
                      {previewContent}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {previewContent.length} characters
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Publish History */}
          <div className="order-1 xl:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <History className="w-5 h-5" />
                  <span>Recent Publications</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {publishHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No publications yet
                    </p>
                  ) : (
                    publishHistory.map((record) => (
                      <div
                        key={record.id}
                        className="p-3 border border-border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {getPlatformIcon(record.platform)}
                            <span className="text-sm font-medium">
                              {platforms.find(p => p.id === record.platform)?.name}
                            </span>
                          </div>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                        <p className="text-sm truncate">
                          {record.content?.title}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {format(new Date(record.created_at), 'MMM d, HH:mm')}
                          </span>
                          {record.platform_id && (
                            <ExternalLink className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};