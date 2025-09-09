import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Sparkles, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseWebhookResponse, createWebhookRequest } from '@/lib/webhookUtils';

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
  { value: 'agent', label: 'Agent' },
  { value: 'perplexity-sonar-pro', label: 'Perplexity Sonar Pro' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'deepseek-r1', label: 'Deepseek R1' },
  { value: 'gpt-5', label: 'GPT 5' },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

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
      console.log('Sending message to webhook:', {
        message: input.trim(),
        type: 'agent_chat',
        engine: selectedEngine,
        conversation_history: messages.slice(-5)
      });

      const response = await fetch('https://hook.eu2.make.com/3s45gpyrmq1yaf9virec2yql51pcqe40', 
        createWebhookRequest({
          message: input.trim(),
          type: 'agent_chat',
          engine: selectedEngine,
          conversation_history: messages.slice(-5), // Send last 5 messages for context
        })
      );

      console.log('Webhook response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await parseWebhookResponse(response);
      
      console.log('Parsed webhook data:', data);

      // Handle different response types
      let aiContent: string;
      if (data.error) {
        aiContent = `I'm sorry, there was an error processing your message: ${data.error}`;
      } else if (data.status === 'accepted') {
        aiContent = data.response || "I've received your message and I'm processing it. Please wait a moment.";
      } else {
        aiContent = data.response || "I apologize, but I'm having trouble responding right now. Please try again.";
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
              <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-accent-foreground/70' : 'text-muted-foreground'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
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

      {/* Input */}
      <div className="chat-input-area p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI Engine Selection */}
          <div className="flex items-center space-x-3">
            <Brain className="w-4 h-4 text-primary/60" />
            <span className="text-sm text-muted-foreground">Model:</span>
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
          
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your writing..."
                className="input-primary min-h-[80px] sm:min-h-[60px] max-h-[120px] resize-none text-base pr-12 rounded-2xl border-border/70 focus:border-primary/50 shadow-sm"
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3 flex items-center space-x-1">
                {input.trim() && (
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    {input.trim().split(/\s+/).length} words
                  </span>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-accent self-end h-12 w-12 sm:w-auto sm:px-6 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-center text-xs text-muted-foreground/70">
            <Sparkles className="w-3 h-3 mr-1 text-primary/60" />
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            <span className="sm:hidden">Tap send or use Enter</span>
          </div>
        </form>
      </div>
    </div>
  );
};