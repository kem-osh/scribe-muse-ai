import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Link2, FileText, Loader2, CheckCircle, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeContent, sha256Hex } from '@/lib/utils';

export const CreateTab: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('article');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;

    setIsLoading(true);

    try {
      // Generate content hash for duplicate detection (Unicode-safe)
      const normalizedContent = normalizeContent(content);
      const fullHash = await sha256Hex(normalizedContent);
      const contentHash = fullHash.substring(0, 32);

      // Check for existing content with same hash (duplicate detection)
      const { data: existingContent, error: checkError } = await supabase
        .from('content')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingContent) {
        toast({
          variant: "destructive",
          title: "Duplicate content detected",
          description: `Similar content already exists: "${existingContent.title}"`,
        });
        return;
      }

      // Save directly to Supabase (no webhook)
      const { data, error } = await supabase
        .from('content')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          content_type: contentType,
          source_url: sourceUrl.trim() || null,
          content_hash: contentHash,
          metadata: {
            created_via: 'create_tab',
            word_count: normalizedContent.split(/\s+/).length,
          },
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Content saved successfully!",
        description: `"${title}" has been added to your library.`,
      });

      // Reset form
      setTitle('');
      setContent('');
      setSourceUrl('');
      setContentType('article');

    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        variant: "destructive",
        title: "Error saving content",
        description: error.message || "Failed to save content. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle text files
    if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsText(file);
    } else {
      toast({
        variant: "destructive",
        title: "Unsupported file type",
        description: "Please upload a text file (.txt, .md, etc.)",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(file => file.type.startsWith('text/'));
    
    if (textFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
        if (!title) {
          setTitle(textFile.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsText(textFile);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4 mb-2">
          <div className="relative inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Create Content
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-30"></div>
          </div>
          <p className="text-muted-foreground/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Upload files, paste text, or import from URLs to add content to your library
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Metadata */}
            <Card className="lg:col-span-1 order-2 lg:order-1 content-card border-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg text-primary">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold">Content Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter content title"
                    required
                    className="input-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-type">Content Type</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="input-primary">
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

                <div className="space-y-2">
                  <Label htmlFor="source-url">Source URL (Optional)</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="source-url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="input-primary pl-10"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                      isDragOver
                        ? 'border-accent bg-accent/10'
                        : 'border-muted hover:border-accent/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop a text file here, or
                    </p>
                    <input
                      type="file"
                      accept=".txt,.md,.markdown"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card className="lg:col-span-2 order-1 lg:order-2 content-card border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center space-x-2 text-primary">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Edit3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold">Content Editor *</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type your content here..."
                  required
                  className="input-primary min-h-[300px] sm:min-h-[400px] resize-none text-base"
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {content.length > 0 && (
                    <span>{content.trim().split(/\s+/).length} words</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-stretch sm:justify-end">
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isLoading}
              className="btn-accent px-8 w-full sm:w-auto h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Content...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Save to Library</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};