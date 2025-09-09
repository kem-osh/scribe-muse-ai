import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { callClaudeChat } from '@/lib/claudeUtils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

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
      console.log('Sending message to Claude API:', {
        message: input.trim(),
        conversation_history: messages.slice(-5)
      });

      // Call Claude API directly instead of using webhooks
      const result = await callClaudeChat({
        message: input.trim(),
        conversation_history: messages.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      console.log('Claude API response:', result);

      // Handle different response types
      let aiContent: string;
      if (result.error) {
        aiContent = `I'm sorry, there was an error processing your message: ${result.error}`;
      } else {
        aiContent = result.response || "I apologize, but I'm having trouble responding right now. Please try again.";
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiContent,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message to Claude API:', error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to send message to Claude AI. Please check your connection and try again.",
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
      <div className="border-t border-border bg-surface/50 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your writing..."
              className="input-primary min-h-[80px] sm:min-h-[60px] max-h-[120px] resize-none text-base"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-accent sm:self-end h-12 sm:h-auto px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:mr-0" />
                <span className="ml-2 sm:hidden">Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 sm:mr-0" />
                <span className="ml-2 sm:hidden">Send</span>
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-3 flex items-center justify-center text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line • Powered by Claude AI</span>
          <span className="sm:hidden">Tap send or use Enter • Claude AI</span>
        </div>
      </div>
    </div>
  );
};