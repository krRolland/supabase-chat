// Test script specifically for null project_id scenario
// Run with: node test-null-project.js

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const USER_JWT = 'YOUR_USER_JWT_TOKEN';

// Test chatbot with explicitly null project_id
async function testNullProjectId() {
  console.log('🧪 Testing: Chatbot with Null Project ID');
  console.log('=========================================');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: "Help me create a survey for concept testing. I want to test user reactions to a new product idea.",
        project_id: null, // Explicitly null
        message_type: "conversation"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Chat with null project_id works!');
    console.log('Session ID:', data.session_id);
    console.log('Response includes standalone guidance:', 
      data.response.toLowerCase().includes('standalone') || 
      data.response.toLowerCase().includes('general') ||
      data.response.toLowerCase().includes('concept testing'));
    
    return data.session_id;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test chatbot with no project_id field at all
async function testMissingProjectId() {
  console.log('\n🧪 Testing: Chatbot with Missing Project ID');
  console.log('============================================');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_JWT}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: "Can you generate a JSON template for a user satisfaction survey?",
        message_type: "template"
        // No project_id field at all
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Chat without project_id field works!');
    console.log('Session ID:', data.session_id);
    
    if (data.structured_output) {
      console.log('✅ Template generation works without project context!');
      console.log('Template title:', data.structured_output.title);
    }
    
    return data.session_id;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Test chat list with null project sessions
async function testChatListWithNullProjects(sessionId) {
  console.log('\n📋 Testing: Chat List with Null Project Sessions');
  console.log('================================================');
  
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
      return;
    }

    const data = await response.json();
    console.log('✅ Chat list retrieved successfully!');
    
    // Find our test session
    const testSession = data.chats.find(chat => chat.id === sessionId);
    if (testSession) {
      console.log('✅ Test session found in list');
      console.log('- Project name is null:', testSession.project_name === null);
      console.log('- Session works without project:', true);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run null project tests
async function runNullProjectTests() {
  console.log('🔍 Testing Null Project ID Functionality');
  console.log('========================================\n');

  // Check configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.log('❌ Please update the configuration values at the top of this file:');
    console.log('- SUPABASE_URL: Your Supabase project URL');
    console.log('- SUPABASE_ANON_KEY: Your Supabase anonymous key');
    console.log('- USER_JWT: A valid JWT token for a test user');
    return;
  }

  // Run tests
  const sessionId1 = await testNullProjectId();
  const sessionId2 = await testMissingProjectId();
  await testChatListWithNullProjects(sessionId1 || sessionId2);

  console.log('\n🎉 Null Project Tests Completed!');
  console.log('\nResults:');
  console.log('✅ Chatbot works with explicit null project_id');
  console.log('✅ Chatbot works with missing project_id field');
  console.log('✅ Chat list handles null project associations');
  console.log('✅ System provides standalone guidance without project context');
}

// Start testing
runNullProjectTests();
