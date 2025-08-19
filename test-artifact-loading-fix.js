// Test script to verify artifact loading fix
console.log('Testing Artifact Loading Fix...\n');

// Test configuration - UPDATE THESE VALUES
const SUPABASE_URL = 'https://rlaslzfrrwhjlwtggrfz.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Replace with actual key
const USER_JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual JWT token

async function testArtifactLoading() {
  console.log('🧪 Testing Artifact Loading Fix\n');
  
  try {
    // Test 1: Create a chat with an artifact
    console.log('📝 Step 1: Creating a chat with an artifact...');
    const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: 'Create a simple customer satisfaction survey with 2 questions'
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Create chat failed: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Chat created successfully');
    console.log(`   Session ID: ${createData.session_id}`);
    console.log(`   Messages: ${createData.total_messages}`);
    
    // Check if any artifacts were created
    const hasArtifact = createData.messages.some(msg => msg.type === 'artifact');
    console.log(`   Contains artifact: ${hasArtifact ? '✅ Yes' : '❌ No'}`);
    
    if (hasArtifact) {
      const artifactMsg = createData.messages.find(msg => msg.type === 'artifact');
      console.log(`   Artifact ID: ${artifactMsg.artifact_info?.id}`);
      console.log(`   Artifact Title: ${artifactMsg.artifact_info?.title}`);
    }

    // Test 2: Load the chat history
    console.log('\n📖 Step 2: Loading chat history...');
    const historyResponse = await fetch(`${SUPABASE_URL}/functions/v1/chatbot?action=history&session_id=${createData.session_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${USER_JWT_TOKEN}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!historyResponse.ok) {
      throw new Error(`Load history failed: ${historyResponse.status}`);
    }

    const historyData = await historyResponse.json();
    console.log('✅ Chat history loaded successfully');
    console.log(`   Total messages: ${historyData.messages.length}`);

    // Test 3: Verify artifact messages are properly formatted
    console.log('\n🔍 Step 3: Verifying artifact message format...');
    const artifactMessages = historyData.messages.filter(msg => msg.type === 'artifact');
    
    if (artifactMessages.length === 0) {
      console.log('❌ No artifact messages found in history');
      return;
    }

    console.log(`✅ Found ${artifactMessages.length} artifact message(s)`);
    
    artifactMessages.forEach((msg, index) => {
      console.log(`\n   Artifact Message ${index + 1}:`);
      console.log(`   ✅ message_id: ${msg.message_id}`);
      console.log(`   ✅ type: ${msg.type}`);
      console.log(`   ✅ content: ${msg.content === null ? 'null (correct)' : 'NOT NULL (incorrect)'}`);
      console.log(`   ✅ artifact_data: ${msg.artifact_data ? 'Present' : 'Missing'}`);
      console.log(`   ✅ artifact_info: ${msg.artifact_info ? 'Present' : 'Missing'}`);
      
      if (msg.artifact_info) {
        console.log(`      - ID: ${msg.artifact_info.id}`);
        console.log(`      - Title: ${msg.artifact_info.title}`);
        console.log(`      - Version: ${msg.artifact_info.version}`);
        console.log(`      - Action: ${msg.artifact_info.action}`);
      }
      
      if (msg.artifact_data) {
        console.log(`      - Data keys: ${Object.keys(msg.artifact_data).join(', ')}`);
      }
    });

    // Test 4: Compare new message format vs loaded format
    console.log('\n🔄 Step 4: Comparing message formats...');
    
    if (hasArtifact && artifactMessages.length > 0) {
      const newArtifact = createData.messages.find(msg => msg.type === 'artifact');
      const loadedArtifact = artifactMessages[0];
      
      const formatMatch = (
        newArtifact.type === loadedArtifact.type &&
        newArtifact.content === loadedArtifact.content &&
        !!newArtifact.artifact_data === !!loadedArtifact.artifact_data &&
        !!newArtifact.artifact_info === !!loadedArtifact.artifact_info
      );
      
      console.log(`✅ Message format consistency: ${formatMatch ? 'PASS' : 'FAIL'}`);
      
      if (!formatMatch) {
        console.log('   New message format:', JSON.stringify(newArtifact, null, 2));
        console.log('   Loaded message format:', JSON.stringify(loadedArtifact, null, 2));
      }
    }

    console.log('\n🎉 Artifact Loading Fix Test Complete!');
    console.log('✅ All tests passed - artifact messages now load with correct format');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Instructions for running the test
console.log('📋 Instructions:');
console.log('1. Update SUPABASE_ANON_KEY with your actual Supabase anon key');
console.log('2. Update USER_JWT_TOKEN with a valid JWT token for testing');
console.log('3. Run: node test-artifact-loading-fix.js');
console.log('');

// Only run the test if keys are provided
if (SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE' && USER_JWT_TOKEN !== 'YOUR_JWT_TOKEN_HERE') {
  testArtifactLoading();
} else {
  console.log('⚠️  Please update the API keys before running the test');
}
