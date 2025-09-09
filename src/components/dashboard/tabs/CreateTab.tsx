import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ContentPreview } from '@/components/dashboard/create/ContentPreview';
import { useAutosaveDraft } from '@/hooks/useAutosaveDraft';
import { Save, Upload, FileText, Type, AlertTriangle, RotateCcw, Keyboard, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeContent, sha256Hex, toHtmlFromContent, stripHtml } from '@/lib/utils';

const CONTENT_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email', label: 'Email' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'ad_copy', label: 'Ad Copy' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'press_release', label: 'Press Release' },
  { value: 'product_description', label: 'Product Description' },
  { value: 'other', label: 'Other' },
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  content: z.string().min(1, 'Content is required'),
  contentType: z.string().min(1, 'Content type is required'),
  sourceUrl: z.string().optional().refine(
    (val) => !val || val === '' || /^https?:\/\/.+/.test(val),
    'Source URL must be a valid URL starting with http:// or https://'
  ),
});

type FormData = z.infer<typeof formSchema>;

export const CreateTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editorMode, setEditorMode] = useState<'plain' | 'rich'>('plain');
  const [duplicateWarning, setDuplicateWarning] = useState<{ title: string; id: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      contentType: 'article',
      sourceUrl: '',
    },
  });

  const { watch, setValue, formState: { isValid, isDirty } } = form;
  const watchedValues = watch();
  const { saveDraft, loadDraft, clearDraft, hasDraft } = useAutosaveDraft(watchedValues.contentType);

  // Focus title on mount
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Load draft on mount or content type change
  useEffect(() => {
    const draft = loadDraft();
    if (draft && !isDirty) {
      setValue('title', draft.title);
      setValue('content', draft.content);
      setValue('contentType', draft.contentType);
      setValue('sourceUrl', draft.sourceUrl);
      toast({
        title: "Draft restored",
        description: "Your previous work has been restored",
        action: <Button variant="ghost" size="sm" onClick={clearDraft}>Clear</Button>
      });
    }
  }, [loadDraft, setValue, isDirty, clearDraft, toast]);

  // Autosave with debounce
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      saveDraft({
        title: watchedValues.title,
        content: watchedValues.content,
        contentType: watchedValues.contentType,
        sourceUrl: watchedValues.sourceUrl || '',
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [watchedValues, isDirty, saveDraft]);

  // Handle editor mode switching
  const handleEditorModeChange = useCallback((mode: string) => {
    const currentContent = watchedValues.content;
    
    if (mode === 'rich' && editorMode === 'plain') {
      // Convert plain text to HTML
      const htmlContent = toHtmlFromContent(currentContent);
      setValue('content', htmlContent, { shouldDirty: true });
    } else if (mode === 'plain' && editorMode === 'rich') {
      // Convert HTML to plain text
      const plainContent = stripHtml(currentContent);
      setValue('content', plainContent, { shouldDirty: true });
    }
    
    setEditorMode(mode as 'plain' | 'rich');
  }, [watchedValues.content, editorMode, setValue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isValid && !isSubmitting) {
          form.handleSubmit(onSubmit)();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isValid, isSubmitting, form]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // File handling
  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const validTypes = ['text/plain', 'text/markdown', 'text/html', '.txt', '.md', '.html'];
    const isValidType = validTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type.replace('text/', '.'))
    );

    if (!isValidType) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a text file (.txt, .md, .html)",
      });
      return;
    }

    try {
      const content = await file.text();
      const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      setValue('title', title, { shouldDirty: true });
      setValue('content', content, { shouldDirty: true });
      
      toast({
        title: "File imported",
        description: `Imported content from ${file.name}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "Failed to read file content",
      });
    }
  }, [setValue, toast]);

  // Paste content handler
  const handlePasteContent = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setValue('content', text.trim(), { shouldDirty: true });
        toast({
          title: "Content pasted",
          description: "Content has been pasted from clipboard",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Paste failed",
        description: "Unable to access clipboard",
      });
    }
  }, [setValue, toast]);

  // Check for duplicates
  const checkForDuplicates = async (content: string): Promise<{ title: string; id: string } | null> => {
    if (!user) return null;

    try {
      const normalizedContent = normalizeContent(content);
      const contentHash = await sha256Hex(normalizedContent);

      const { data } = await supabase
        .from('content')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('content_hash', contentHash)
        .limit(1);

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return null;
    }
  };

  // Form submission
  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to save content",
      });
      return;
    }

    setIsSubmitting(true);
    setDuplicateWarning(null);

    try {
      // Check for duplicates
      const duplicate = await checkForDuplicates(data.content);
      if (duplicate) {
        setDuplicateWarning(duplicate);
        toast({
          variant: "destructive",
          title: "Duplicate content detected",
          description: `Similar content already exists: "${duplicate.title}"`,
        });
        setIsSubmitting(false);
        return;
      }

      // Save to database
      const normalizedContent = normalizeContent(data.content);
      const contentHash = await sha256Hex(normalizedContent);

      const { error } = await supabase
        .from('content')
        .insert({
          title: data.title,
          content: data.content,
          content_type: data.contentType,
          source_url: data.sourceUrl || null,
          content_hash: contentHash,
          user_id: user.id,
        });

      if (error) throw error;

      // Clear form and draft
      form.reset();
      clearDraft();
      setDuplicateWarning(null);

      toast({
        title: "Content saved!",
        description: "Your content has been saved to your library",
        action: (
          <Button variant="ghost" size="sm" onClick={() => {
            // Could add tab switching logic here in future
            toast({ title: "Feature coming soon", description: "Auto-navigation to library" });
          }}>
            View in Library
          </Button>
        )
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save content. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = watchedValues.content?.trim() ? watchedValues.content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="create-tab h-full flex flex-col">
      <div 
        className={`flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 transition-colors ${
          isDragOver ? 'bg-primary/5 border-primary/20' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Form Section */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Create Content</h2>
              <p className="text-sm text-muted-foreground">Add new content to your library</p>
            </div>
            {hasDraft && (
              <Badge variant="secondary" className="animate-fade-in">
                Draft saved
              </Badge>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Duplicate Warning */}
              {duplicateWarning && (
                <Alert className="border-destructive/50 animate-fade-in">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Similar content exists: <strong>{duplicateWarning.title}</strong>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto ml-2"
                      onClick={() => setDuplicateWarning(null)}
                    >
                      Continue anyway
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={titleInputRef}
                        placeholder="Enter a descriptive title..."
                        className="input-primary"
                      />
                    </FormControl>
                    <FormDescription>
                      Keep it clear and under 200 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content Type & Source URL Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Type *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border border-border z-50">
                          {CONTENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com"
                          className="input-primary"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: where this content came from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Editor Mode Toggle */}
              <div className="flex items-center justify-between">
                <FormLabel>Content *</FormLabel>
                <div className="flex items-center space-x-2">
                  <ToggleGroup
                    type="single"
                    value={editorMode}
                    onValueChange={handleEditorModeChange}
                    className="bg-muted/50 rounded-lg p-1"
                  >
                    <ToggleGroupItem value="plain" className="text-xs">
                      <Type className="w-3 h-3 mr-1" />
                      Plain
                    </ToggleGroupItem>
                    <ToggleGroupItem value="rich" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      Rich
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="lg:hidden"
                  >
                    {showPreview ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              </div>

              {/* Content Editor */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-2">
                        {editorMode === 'rich' ? (
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Start writing your content..."
                            className="min-h-[300px] sm:min-h-[400px]"
                          />
                        ) : (
                          <Textarea
                            {...field}
                            placeholder="Start writing your content..."
                            className="input-primary min-h-[300px] sm:min-h-[400px] resize-none"
                          />
                        )}
                        
                        {/* Stats and Actions */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <span>{wordCount} words</span>
                            <span>{readingTime} min read</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handlePasteContent}
                              className="h-6 text-xs"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Paste
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-6 text-xs"
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Import
                            </Button>
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Write your content or import from a file. Supports .txt, .md, .html
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.html,text/plain,text/markdown,text/html"
                onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                className="hidden"
              />

              {/* Desktop Submit Button */}
              <div className="hidden sm:flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Keyboard className="w-3 h-3" />
                  <span>Cmd/Ctrl + Enter to save</span>
                </div>
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="btn-accent min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Content
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Preview Section */}
        <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
          <ContentPreview
            title={watchedValues.title}
            content={watchedValues.content}
            contentType={watchedValues.contentType}
            sourceUrl={watchedValues.sourceUrl}
          />
        </div>
      </div>

      {/* Mobile Sticky Save Bar */}
      <div className="sm:hidden sticky bottom-0 bg-background/95 backdrop-blur border-t p-3">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          onClick={form.handleSubmit(onSubmit)}
          className="btn-accent w-full"
        >
          {isSubmitting ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Content
            </>
          )}
        </Button>
      </div>
    </div>
  );
};