import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface FeedbackData {
  type: string;
  subject: string;
  description: string;
  priority: string;
}

interface FeedbackFormData extends FeedbackData {
  timestamp: string;
  page_url: string;
  user_agent: string;
}

const FEEDBACK_TYPES = [
  { value: 'feature', label: '🚀 Feature Request', placeholder: 'What new feature would you like to see?' },
  { value: 'bug', label: '🐛 Bug Report', placeholder: 'Describe the bug you encountered...' },
  { value: 'general', label: '💬 General Feedback', placeholder: 'Share your thoughts or suggestions...' },
  { value: 'other', label: '📝 Other', placeholder: 'Tell us what\'s on your mind...' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const STORAGE_KEY = 'feedback-draft';
const RATE_LIMIT_KEY = 'feedback-last-submit';
const RATE_LIMIT_MS = 30000; // 30 seconds

export const FeedbackTab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [formData, setFormData] = useState<FeedbackData>({
    type: '',
    subject: '',
    description: '',
    priority: 'medium'
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FeedbackData, string>>>({});

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
      }
    } catch (error) {
      console.error('Failed to load feedback draft:', error);
    }
  }, []);

  // Save draft to localStorage on form changes
  useEffect(() => {
    if (formData.type || formData.subject || formData.description) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error('Failed to save feedback draft:', error);
      }
    }
  }, [formData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FeedbackData, string>> = {};

    if (!formData.type) {
      newErrors.type = 'Please select a feedback type';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.length > 100) {
      newErrors.subject = 'Subject must be 100 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkRateLimit = (): boolean => {
    try {
      const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
      if (lastSubmit) {
        const timeSinceLastSubmit = Date.now() - parseInt(lastSubmit);
        if (timeSinceLastSubmit < RATE_LIMIT_MS) {
          const remainingSeconds = Math.ceil((RATE_LIMIT_MS - timeSinceLastSubmit) / 1000);
          toast({
            title: "Please wait",
            description: `You can submit feedback again in ${remainingSeconds} seconds.`,
            variant: "destructive"
          });
          return false;
        }
      }
    } catch (error) {
      console.error('Failed to check rate limit:', error);
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !checkRateLimit()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const webhookUrl = import.meta.env.VITE_WEBHOOK_URL || 'https://hook.eu2.make.com/3s45gpyrmq1yaf9virec2yql51pcqe40';

    const payload = {
      // Schema marker
      schema: "Feedback",
      
      // Nested structured data
      Feedback: {
        type: formData.type,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority
      },
      
      // Context metadata
      context: {
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent
      },
      
      // Backward compatibility - keep flat structure
      ...formData,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      user_agent: navigator.userAgent
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success
      setSubmitStatus('success');
      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
      localStorage.removeItem(STORAGE_KEY);
      
      toast({
        title: "Feedback submitted!",
        description: "Thank you! Your feedback has been submitted successfully."
      });

      // Clear form
      setFormData({
        type: '',
        subject: '',
        description: '',
        priority: 'medium'
      });

      // Auto-close after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSubmitStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitStatus('error');
      
      toast({
        title: "Submission failed",
        description: "Sorry, there was an error submitting your feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSubmitStatus('idle');
    handleSubmit(new Event('submit') as any);
  };

  const closeFeedback = () => {
    setIsOpen(false);
    setSubmitStatus('idle');
    setErrors({});
  };

  const currentType = FEEDBACK_TYPES.find(type => type.value === formData.type);
  const isFormValid = formData.type && formData.subject.trim() && formData.description.trim();
  const subjectCount = formData.subject.length;
  const descriptionCount = formData.description.length;

  return (
    <>
      {/* Floating FAB */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-12 h-12 bg-accent hover:bg-accent/90 text-accent-foreground 
                   rounded-full shadow-lg hover:shadow-xl transition-all duration-200 
                   hover:scale-110 active:scale-95 border border-accent/20 hover:border-accent/30
                   flex items-center justify-center"
          aria-label="Send feedback"
        >
          <MessageCircle className="w-5 h-5" />
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 px-3 py-2 bg-popover text-popover-foreground 
                        text-sm rounded-lg shadow-md border border-border opacity-0 invisible
                        group-hover:opacity-100 group-hover:visible transition-all duration-200
                        whitespace-nowrap pointer-events-none">
            Send Feedback
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 
                          border-l-4 border-l-popover border-y-4 border-y-transparent"></div>
          </div>
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={closeFeedback}
        />
      )}

      {/* Feedback Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[400px] bg-background border-l border-border 
                   shadow-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">Send Feedback</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeFeedback}
              className="p-2 hover:bg-muted rounded-lg"
              aria-label="Close feedback form"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
              
              {/* Feedback Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Feedback Type <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2">
                  {FEEDBACK_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all 
                                hover:bg-muted/50 ${
                        formData.type === type.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-background text-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedbackType"
                        value={type.value}
                        checked={formData.type === type.value}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{type.label}</span>
                    </label>
                  ))}
                </div>
                {errors.type && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.type}
                  </p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                  Subject <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({subjectCount}/100)
                  </span>
                </Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief summary of your feedback"
                  maxLength={100}
                  className={`input-primary ${errors.subject ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                />
                {errors.subject && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({descriptionCount}/500)
                  </span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={currentType?.placeholder || "Please describe your feedback in detail..."}
                  maxLength={500}
                  rows={4}
                  className={`input-primary resize-none ${errors.description ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium text-foreground">
                  Priority
                </Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground 
                           focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Success Message */}
              {submitStatus === 'success' && (
                <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-success">Feedback submitted successfully!</p>
                    <p className="text-xs text-success/80">This panel will close automatically.</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Submission failed</p>
                      <p className="text-xs text-destructive/80">Please check your connection and try again.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeFeedback}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 btn-accent"
                  disabled={!isFormValid || isSubmitting || submitStatus === 'success'}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Your feedback helps us improve the platform for everyone.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};