import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditRequest {
  content?: string;
  title?: string;
  goal?: string;
  tone?: string;
  content_type?: string;
  type: 'edit_content' | 'synthesize_content' | 'agent_chat';
  contents?: Array<{ title: string; content: string; content_type: string }>;
  target_type?: string;
  message?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: EditRequest = await req.json();
    console.log('Claude API request:', { 
      type: requestBody.type, 
      goal: requestBody.goal,
      tone: requestBody.tone,
      contentLength: requestBody.content?.length || 0,
      messageLength: requestBody.message?.length || 0
    });

    if (!anthropicApiKey) {
      throw new Error('Claude API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (requestBody.type === 'edit_content') {
      // Content editing mode
      systemPrompt = `You are an expert content editor. Your task is to edit content according to the user's specific goal while maintaining the original meaning and structure when appropriate. Always respond with ONLY the edited content, no additional commentary or explanations.

Guidelines:
- Apply the requested editing goal precisely
- Maintain the requested tone throughout
- Preserve important factual information
- Keep the content type format (${requestBody.content_type})
- Make improvements to clarity, flow, and engagement`;

      userPrompt = `Please edit this content:

TITLE: ${requestBody.title}
CONTENT TYPE: ${requestBody.content_type}
EDITING GOAL: ${requestBody.goal}
TONE: ${requestBody.tone}

CONTENT TO EDIT:
${requestBody.content}

Please provide only the edited version of the content.`;

    } else if (requestBody.type === 'synthesize_content') {
      // Content synthesis mode
      systemPrompt = `You are an expert content synthesizer. Your task is to combine multiple pieces of content into a single, cohesive piece that achieves the specified goal. Always respond with ONLY the synthesized content, no additional commentary.

Guidelines:
- Combine key insights and information from all provided content
- Create a unified narrative that flows logically
- Maintain the requested tone consistently
- Format according to the target content type
- Eliminate redundancy while preserving important details`;

      const contentsText = requestBody.contents?.map(item => 
        `TITLE: ${item.title}\nTYPE: ${item.content_type}\nCONTENT:\n${item.content}`
      ).join('\n\n---\n\n') || '';

      userPrompt = `Please synthesize these multiple content pieces into a single ${requestBody.target_type}:

SYNTHESIS GOAL: ${requestBody.goal}
TONE: ${requestBody.tone}
TARGET FORMAT: ${requestBody.target_type}

CONTENT TO SYNTHESIZE:
${contentsText}

Please provide only the synthesized content in the requested format.`;

    } else if (requestBody.type === 'agent_chat') {
      // Chat conversation mode
      systemPrompt = `You are an AI writing assistant helping users with their content creation and writing process. You are knowledgeable, helpful, and supportive. Provide clear, actionable advice while being conversational and engaging.

Guidelines:
- Be helpful and encouraging
- Provide specific, actionable advice when possible
- Ask follow-up questions to better understand user needs
- Keep responses concise but thorough
- Remember you're helping with writing and content creation`;

      const historyText = requestBody.conversation_history?.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n\n') || '';

      userPrompt = `${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}User: ${requestBody.message}`;

    } else {
      throw new Error('Invalid request type');
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', { status: response.status, error: errorText });
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data: ClaudeResponse = await response.json();
    console.log('Claude API response received successfully');

    const responseContent = data.content[0].text;

    // Return response in format compatible with existing webhook structure
    let result: any = {
      response: responseContent,
      status: 'success'
    };

    // Add type-specific fields for backward compatibility
    if (requestBody.type === 'edit_content') {
      result.edited_content = responseContent;
    } else if (requestBody.type === 'synthesize_content') {
      result.synthesized_content = responseContent;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in claude-edit function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});