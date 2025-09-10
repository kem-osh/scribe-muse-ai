import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Sparkles, Brain, Copy, BookPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { renderForPreview } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface EngineOption {
  value: string;
  label: string;
}

const ENGINE_OPTIONS: EngineOption[] = [
  { value: 'agent', label: '🤖 AI Agent (Smart Selection)' },
  { value: 'gpt-5', label: '🧠 GPT-5' },
  { value: 'claude-sonnet-4', label: '🎭 Claude Sonnet 4' },
  { value: 'perplexity-sonar-pro', label: '🔍 Perplexity Sonar Pro' },
];

export const AgentTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI writing assistant. I'm here to help you brainstorm ideas, provide feedback on your content, and assist with your writing process. What would you like to work on today?",
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<string>(() => {
    return localStorage.getItem('agentChatEngine') || 'agent';
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Persist engine selection to localStorage
  useEffect(() => {
    localStorage.setItem('agentChatEngine', selectedEngine);
  }, [selectedEngine]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('Sending message to AI orchestrator:', {
        message: input.trim(),
        engine: selectedEngine,
        conversation_history: messages.slice(-5)
      });

      const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: {
          message: input.trim(),
          engine: selectedEngine,
          conversation_history: messages.slice(-5), // Send last 5 messages for context
          user_id: user?.id,
        },
      });

      console.log('AI orchestrator response:', { data, error });

      // Handle response
      let aiContent: string;
      if (error) {
        console.error('AI orchestrator error:', error);
        aiContent = `I'm sorry, there was an error processing your message: ${error.message || 'Unknown error'}`;
      } else if (data?.response) {
        aiContent = data.response;
      } else {
        aiContent = "I apologize, but I'm having trouble responding right now. Please try again.";
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiContent,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to send message. Please check your connection and try again.",
      });
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyReply = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      toast({
        title: "Copied!",
        description: "Reply copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Unable to copy to clipboard",
      });
    }
  };

  const handleSaveReply = async (messageId: string, content: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to save to library",
      });
      return;
    }

    setSavingId(messageId);
    try {
      const { error } = await supabase
        .from('content')
        .insert({
          title: `Agent Reply - ${new Date().toLocaleDateString()}`,
          content: content,
          content_type: 'agent_reply',
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Reply saved to your library",
      });
    } catch (error) {
      console.error('Error saving to library:', error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Unable to save to library",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="chat-container h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`chat-message ${
                message.role === 'user' ? 'chat-message-user' : 'chat-message-ai'
              } max-w-[90%] sm:max-w-[85%]`}
            >
              {message.role === 'assistant' ? (
                <div 
                  className="rich-content text-sm sm:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderForPreview(message.content) }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div
                  className={`text-xs ${
                    message.role === 'user' ? 'text-accent-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {message.role === 'assistant' && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted/50"
                      onClick={() => handleCopyReply(message.id, message.content)}
                      disabled={copiedId === message.id}
                      title="Copy reply"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted/50"
                      onClick={() => handleSaveReply(message.id, message.content)}
                      disabled={savingId === message.id}
                      title="Save to library"
                    >
                      {savingId === message.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <BookPlus className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="chat-message chat-message-ai">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Sticky Bottom Bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/50 p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Mobile: Model selector above input */}
          <div className="sm:hidden">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-primary/60" />
              <Select 
                value={selectedEngine} 
                onValueChange={setSelectedEngine}
                disabled={isLoading}
              >
                <SelectTrigger className="w-auto h-8 px-3 text-sm border-border/70 focus:border-primary/50 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {ENGINE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {input.trim() && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full ml-auto">
                  {input.trim().split(/\s+/).length}w
                </span>
              )}
            </div>
          </div>

          {/* Input Row */}
          <div className="flex items-end space-x-2 sm:space-x-3">
            {/* Desktop: Model selector inline */}
            <div className="hidden sm:flex items-center space-x-2 min-w-fit">
              <Brain className="w-4 h-4 text-primary/60" />
              <Select 
                value={selectedEngine} 
                onValueChange={setSelectedEngine}
                disabled={isLoading}
              >
                <SelectTrigger className="w-auto h-8 px-3 text-sm border-border/70 focus:border-primary/50 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {ENGINE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text Input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your writing..."
                className="input-primary min-h-[44px] max-h-[100px] resize-none text-sm sm:text-base pr-12 rounded-xl border-border/70 focus:border-primary/50 shadow-sm"
                disabled={isLoading}
                rows={1}
              />
              {/* Desktop word count */}
              <div className="absolute bottom-2 right-2 hidden sm:flex items-center">
                {input.trim() && (
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    {input.trim().split(/\s+/).length} words
                  </span>
                )}
              </div>
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-accent h-[44px] w-[44px] sm:w-auto sm:px-4 rounded-xl flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>
          
          {/* Helper text - desktop only */}
          <div className="hidden sm:flex items-center justify-center text-xs text-muted-foreground/60">
            <Sparkles className="w-3 h-3 mr-1 text-primary/50" />
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
};