import { supabase } from '@/integrations/supabase/client';

export interface ClaudeResponse {
  response?: string;
  error?: string;
  status?: string;
  edited_content?: string;
  synthesized_content?: string;
  suggestion?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Call Claude API for content editing through Supabase Edge Function
 * Replaces webhook-based editing with direct Claude API integration
 */
export const callClaudeEdit = async (data: {
  content: string;
  title: string;
  goal: string;
  tone: string;
  content_type: string;
}): Promise<ClaudeResponse> => {
  try {
    console.log('Calling Claude API for content editing:', {
      goal: data.goal,
      tone: data.tone,
      contentType: data.content_type,
      contentLength: data.content.length
    });

    const { data: result, error } = await supabase.functions.invoke('claude-edit', {
      body: {
        type: 'edit_content',
        ...data
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        error: 'Failed to call Claude API. Please check your connection and try again.'
      };
    }

    console.log('Claude edit response:', result);
    return result;

  } catch (error) {
    console.error('Error calling Claude edit:', error);
    return {
      error: 'Failed to call Claude API. Please check your connection and try again.'
    };
  }
};

/**
 * Call Claude API for content synthesis through Supabase Edge Function
 * Replaces webhook-based synthesis with direct Claude API integration
 */
export const callClaudeSynthesize = async (data: {
  contents: Array<{ title: string; content: string; content_type: string }>;
  goal: string;
  tone: string;
  target_type: string;
}): Promise<ClaudeResponse> => {
  try {
    console.log('Calling Claude API for content synthesis:', {
      goal: data.goal,
      tone: data.tone,
      targetType: data.target_type,
      contentCount: data.contents.length
    });

    const { data: result, error } = await supabase.functions.invoke('claude-edit', {
      body: {
        type: 'synthesize_content',
        ...data
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        error: 'Failed to call Claude API for synthesis. Please check your connection and try again.'
      };
    }

    console.log('Claude synthesis response:', result);
    return result;

  } catch (error) {
    console.error('Error calling Claude synthesis:', error);
    return {
      error: 'Failed to call Claude API for synthesis. Please check your connection and try again.'
    };
  }
};

/**
 * Call Claude API for chat conversations through Supabase Edge Function
 * Replaces webhook-based chat with direct Claude API integration
 */
export const callClaudeChat = async (data: {
  message: string;
  conversation_history?: ChatMessage[];
}): Promise<ClaudeResponse> => {
  try {
    console.log('Calling Claude API for chat:', {
      messageLength: data.message.length,
      historyLength: data.conversation_history?.length || 0
    });

    const { data: result, error } = await supabase.functions.invoke('claude-edit', {
      body: {
        type: 'agent_chat',
        ...data
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        error: 'Failed to call Claude API for chat. Please check your connection and try again.'
      };
    }

    console.log('Claude chat response:', result);
    return result;

  } catch (error) {
    console.error('Error calling Claude chat:', error);
    return {
      error: 'Failed to call Claude API for chat. Please check your connection and try again.'
    };
  }
};