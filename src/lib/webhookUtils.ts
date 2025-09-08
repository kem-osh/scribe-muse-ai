export interface WebhookResponse {
  response?: string;
  error?: string;
  status?: string;
}

export const parseWebhookResponse = async (response: Response): Promise<WebhookResponse> => {
  const responseText = await response.text();
  
  console.log('Raw webhook response:', {
    status: response.status,
    statusText: response.statusText,
    responseText: responseText
  });

  // Handle "Accepted" status - this means the webhook received the request
  if (responseText.trim() === 'Accepted' || response.status === 202) {
    console.log('Webhook accepted, waiting for processing...');
    return {
      status: 'accepted',
      response: "I'm processing your message. Please wait a moment for my response."
    };
  }

  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(responseText);
    console.log('Parsed JSON response:', jsonData);
    return jsonData;
  } catch (jsonError) {
    console.log('Failed to parse as JSON, treating as plain text');
    
    // If it's not JSON and not "Accepted", treat as plain text response
    if (responseText && responseText.trim()) {
      return {
        response: responseText.trim()
      };
    }
    
    // If completely empty or invalid
    return {
      error: 'Empty or invalid response from webhook'
    };
  }
};

export const createWebhookRequest = (body: any) => {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  };
};