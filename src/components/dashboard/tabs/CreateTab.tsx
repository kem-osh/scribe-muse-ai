import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Link2, FileText, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
      // Generate content hash for duplicate detection
      const contentHash = btoa(content.trim()).substring(0, 32);

      // Send to webhook
      const webhookResponse = await fetch('https://hook.eu2.make.com/gg9miys772hoitii1dt9u5ud5uiolug3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          contentType,
          sourceUrl: sourceUrl.trim() || null,
          contentHash,
          userId: user.id,
        }),
      });

      if (!webhookResponse.ok) {
        console.warn('Webhook failed, but continuing to save to database');
      }

      // Save to Supabase
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
            word_count: content.trim().split(/\s+/).length,
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Create Content</h1>
          <p className="text-muted-foreground">
            Upload files, paste text, or import from URLs to add content to your library
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metadata */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Details</span>
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
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Content *</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type your content here..."
                  required
                  className="input-primary min-h-[400px] resize-none"
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
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isLoading}
              className="btn-accent px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Content
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};