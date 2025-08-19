// Simple test script for the chatbot function
// Run with: node test-chatbot.js

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const USER_JWT = 'YOUR_USER_JWT_TOKEN';

async function testChatbot() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: "Hi! I need help creating a survey to test a new mobile app concept. Can you help me design some questions?",
        type: "conversation"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', response.status, error);
      return;
    }

    const data = await response.json();
    console.log('Chatbot Response:');
    console.log('================');
    console.log(data.response);
    
    if (data.structured_output) {
      console.log('\nStructured Output:');
      console.log('==================');
      console.log(JSON.stringify(data.structured_output, null, 2));
    }
    
    console.log('\nSession ID:', data.session_id);
    console.log('Message ID:', data.message_id);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test template generation
async function testTemplateGeneration() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: "Please create a JSON survey template for testing user satisfaction with a food delivery app. Include questions about ease of use, delivery time, and overall satisfaction.",
        type: "template"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', response.status, error);
      return;
    }

    const data = await response.json();
    console.log('\nTemplate Generation Test:');
    console.log('========================');
    console.log(data.response);
    
    if (data.structured_output) {
      console.log('\nGenerated Template:');
      console.log('==================');
      console.log(JSON.stringify(data.structured_output, null, 2));
    }

  } catch (error) {
    console.error('Template test failed:', error);
  }
}

// Run tests
console.log('Testing Chatbot Function...\n');

// Update these values before running
if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.log('Please update the configuration values at the top of this file:');
  console.log('- SUPABASE_URL: Your Supabase project URL');
  console.log('- SUPABASE_ANON_KEY: Your Supabase anonymous key');
  console.log('- USER_JWT: A valid JWT token for a test user');
  console.log('\nAlso make sure to set the ANTHROPIC_API_KEY environment variable in your Supabase project.');
} else {
  testChatbot().then(() => {
    console.log('\n' + '='.repeat(50));
    testTemplateGeneration();
  });
}
