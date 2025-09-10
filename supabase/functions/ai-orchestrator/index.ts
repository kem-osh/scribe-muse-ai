import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OrchestratorRequest {
  message: string;
  engine?: string;
  conversation_history?: Array<{
    role: string;
    content: string;
  }>;
  user_id?: string;
}

// AI Model configurations
const MODEL_CONFIGS = {
  'gpt-5': {
    provider: 'openai',
    model: 'gpt-5-2025-08-07',
    maxTokens: 4000
  },
  'claude-sonnet-4': {
    provider: 'anthropic', 
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000
  },
  'perplexity-sonar-pro': {
    provider: 'perplexity',
    model: 'llama-3.1-sonar-large-128k-online',
    maxTokens: 2000
  }
};

async function callOpenAI(messages: ConversationMessage[], model: string, maxTokens: number) {
  console.log('Calling OpenAI with model:', model);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(messages: ConversationMessage[], model: string, maxTokens: number) {
  console.log('Calling Anthropic with model:', model);
  
  // Separate system message from conversation
  const systemMessage = messages.find(m => m.role === 'system')?.content || 'You are a helpful AI writing assistant.';
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Anthropic API error:', error);
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callPerplexity(messages: ConversationMessage[], model: string, maxTokens: number) {
  console.log('Calling Perplexity with model:', model);
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Perplexity API error:', error);
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function intelligentModelSelection(userMessage: string): Promise<string> {
  // Simple heuristics for model selection
  const message = userMessage.toLowerCase();
  
  // For research, current events, factual queries - use Perplexity
  if (message.includes('research') || message.includes('latest') || message.includes('current') || 
      message.includes('news') || message.includes('what happened') || message.includes('statistics')) {
    return 'perplexity-sonar-pro';
  }
  
  // For creative writing, analysis, complex reasoning - use Claude
  if (message.includes('write') || message.includes('create') || message.includes('analyze') || 
      message.includes('creative') || message.includes('story') || message.includes('poem')) {
    return 'claude-sonnet-4';
  }
  
  // Default to GPT-5 for general assistance
  return 'gpt-5';
}

async function orchestrateAIResponse(request: OrchestratorRequest): Promise<string> {
  try {
    // Determine which model to use
    let selectedModel = request.engine || 'agent';
    
    // If agent mode, intelligently select the best model
    if (selectedModel === 'agent') {
      selectedModel = await intelligentModelSelection(request.message);
      console.log('Intelligent model selection chose:', selectedModel);
    }
    
    // Get model configuration
    const config = MODEL_CONFIGS[selectedModel as keyof typeof MODEL_CONFIGS];
    if (!config) {
      throw new Error(`Unsupported model: ${selectedModel}`);
    }
    
    // Check API key availability
    if (config.provider === 'openai' && !openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    if (config.provider === 'anthropic' && !anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }
    if (config.provider === 'perplexity' && !perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }
    
    // Build conversation messages
    const messages: ConversationMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI writing assistant. Provide clear, accurate, and helpful responses to assist with writing, research, and creative tasks.'
      }
    ];
    
    // Add conversation history
    if (request.conversation_history) {
      request.conversation_history.slice(-6).forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          });
        }
      });
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: request.message
    });
    
    // Call the appropriate AI service
    let aiResponse: string;
    
    switch (config.provider) {
      case 'openai':
        aiResponse = await callOpenAI(messages, config.model, config.maxTokens);
        break;
      case 'anthropic':
        aiResponse = await callAnthropic(messages, config.model, config.maxTokens);
        break;
      case 'perplexity':
        aiResponse = await callPerplexity(messages, config.model, config.maxTokens);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
    
    // Save conversation to database if user_id is provided
    if (request.user_id) {
      try {
        await supabase.from('conversations').insert({
          user_id: request.user_id,
          model_used: selectedModel,
          user_message: request.message,
          ai_response: aiResponse,
          conversation_context: request.conversation_history || []
        });
      } catch (dbError) {
        console.error('Failed to save conversation:', dbError);
        // Don't fail the response if DB save fails
      }
    }
    
    return aiResponse;
    
  } catch (error) {
    console.error('Error in AI orchestration:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: OrchestratorRequest = await req.json();
    console.log('AI Orchestrator request:', {
      message: requestData.message?.slice(0, 100),
      engine: requestData.engine,
      hasHistory: !!requestData.conversation_history?.length
    });

    if (!requestData.message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const aiResponse = await orchestrateAIResponse(requestData);
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        model_used: requestData.engine || 'agent'
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in ai-orchestrator function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: 'Please check your API keys and try again'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});