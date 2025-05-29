import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    
    // Test 1: Simple chat completion
    console.log('\n1. Testing Chat Completion...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'Hello, OpenAI API is working!'" }
      ],
      max_tokens: 50
    });
    
    console.log('✓ Chat completion works:', response.choices[0].message.content);
    
    // Test 2: List available models
    console.log('\n2. Testing Models List...');
    const models = await openai.models.list();
    const relevantModels = models.data
      .filter(model => model.id.includes('gpt-4') || model.id.includes('whisper'))
      .map(model => model.id)
      .slice(0, 5);
    console.log('✓ Available models:', relevantModels);
    
    console.log('\n✅ All OpenAI endpoints are working correctly!');
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', {
      message: error.message,
      type: error.type,
      status: error.status,
      code: error.code
    });
    
    if (error.status === 401) {
      console.error('🔑 Authentication failed - API key may be invalid or expired');
    } else if (error.status === 429) {
      console.error('⏱️ Rate limit exceeded - too many requests');
    } else if (error.status === 500) {
      console.error('🔧 OpenAI server error - try again later');
    }
  }
}

testOpenAI();