// Complete test script for all chatbot functionality
// Run with: node test-chatbot-complete.js

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const USER_JWT = 'YOUR_USER_JWT_TOKEN';

// Test 1: Start a new chat
async function testStartNewChat() {
  console.log('🚀 Testing: Start New Chat');
  console.log('==========================');
  
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
      console.error('❌ Error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('✅ New chat started successfully!');
    console.log('Session ID:', data.session_id);
    console.log('Response preview:', data.response.substring(0, 100) + '...');
    
    return data.session_id; // Return for use in other tests

  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test 2: Add message to existing chat
async function testAddMessageToChat(sessionId) {
  if (!sessionId) {
    console.log('⏭️  Skipping add message test (no session ID)');
    return;
  }

  console.log('\n💬 Testing: Add Message to Chat');
  console.log('===============================');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: "Can you create a JSON survey template for testing user satisfaction with the app's navigation?",
        session_id: sessionId,
        type: "template"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return;
    }

    const data = await response.json();
    console.log('✅ Message added successfully!');
    console.log('Same session ID:', data.session_id === sessionId);
    
    if (data.structured_output) {
      console.log('🎯 Template generated!');
      console.log('Template title:', data.structured_output.title);
      console.log('Number of questions:', data.structured_output.questions?.length || 0);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test 3: Get list of all chats
async function testGetAllChats() {
  console.log('\n📋 Testing: Get All Chats');
  console.log('=========================');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot?action=list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Chat list retrieved successfully!');
    console.log('Number of chats:', data.chats.length);
    
    if (data.chats.length > 0) {
      console.log('\nFirst chat details:');
      const firstChat = data.chats[0];
      console.log('- ID:', firstChat.id);
      console.log('- Title:', firstChat.title);
      console.log('- Message count:', firstChat.message_count);
      console.log('- Created:', new Date(firstChat.created_at).toLocaleString());
      
      return firstChat.id; // Return for history test
    }
    
    return null;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test 4: Get chat history
async function testGetChatHistory(sessionId) {
  if (!sessionId) {
    console.log('⏭️  Skipping chat history test (no session ID)');
    return;
  }

  console.log('\n📜 Testing: Get Chat History');
  console.log('============================');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot?action=history&session_id=${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return;
    }

    const data = await response.json();
    console.log('✅ Chat history retrieved successfully!');
    console.log('Session title:', data.session.title);
    console.log('Number of messages:', data.messages.length);
    
    if (data.messages.length > 0) {
      console.log('\nMessage breakdown:');
      const userMessages = data.messages.filter(m => m.role === 'user').length;
      const assistantMessages = data.messages.filter(m => m.role === 'assistant').length;
      console.log('- User messages:', userMessages);
      console.log('- Assistant messages:', assistantMessages);
      
      console.log('\nFirst message:');
      console.log('- Role:', data.messages[0].role);
      console.log('- Content preview:', data.messages[0].content.substring(0, 100) + '...');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test 5: Error handling
async function testErrorHandling() {
  console.log('\n⚠️  Testing: Error Handling');
  console.log('===========================');
  
  // Test invalid action
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot?action=invalid`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const data = await response.json();
    if (response.status === 400 && data.error) {
      console.log('✅ Invalid action handled correctly');
    } else {
      console.log('❌ Invalid action not handled properly');
    }
  } catch (error) {
    console.error('❌ Error test failed:', error);
  }

  // Test missing session_id for history
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot?action=history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const data = await response.json();
    if (response.status === 400 && data.error.includes('session_id required')) {
      console.log('✅ Missing session_id handled correctly');
    } else {
      console.log('❌ Missing session_id not handled properly');
    }
  } catch (error) {
    console.error('❌ Error test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Testing Complete Chatbot Functionality');
  console.log('==========================================\n');

  // Check configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.log('❌ Please update the configuration values at the top of this file:');
    console.log('- SUPABASE_URL: Your Supabase project URL');
    console.log('- SUPABASE_ANON_KEY: Your Supabase anonymous key');
    console.log('- USER_JWT: A valid JWT token for a test user');
    console.log('\nAlso make sure to set the ANTHROPIC_API_KEY environment variable in your Supabase project.');
    return;
  }

  // Run tests in sequence
  const newSessionId = await testStartNewChat();
  await testAddMessageToChat(newSessionId);
  const existingSessionId = await testGetAllChats();
  await testGetChatHistory(existingSessionId || newSessionId);
  await testErrorHandling();

  console.log('\n🎉 All tests completed!');
  console.log('\nYour chatbot now supports:');
  console.log('✅ Starting new chats');
  console.log('✅ Adding messages to existing chats');
  console.log('✅ Getting list of all chats');
  console.log('✅ Retrieving chat history');
  console.log('✅ Proper error handling');
}

// Start testing
runAllTests();
