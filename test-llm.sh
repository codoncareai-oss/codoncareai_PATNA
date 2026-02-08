#!/bin/bash
# LLM Integration Test Script
# Tests that GitHub Models Phi-4 is actually being called

echo "🧪 LLM Integration Test"
echo "======================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Check if token is set
if ! grep -q "VITE_GITHUB_TOKEN=" .env; then
  echo "❌ VITE_GITHUB_TOKEN not found in .env"
  exit 1
fi

TOKEN=$(grep "VITE_GITHUB_TOKEN=" .env | cut -d'=' -f2)
if [ -z "$TOKEN" ]; then
  echo "❌ VITE_GITHUB_TOKEN is empty"
  exit 1
fi

echo "✅ Token found in .env"
echo "🔑 Token (first 20 chars): ${TOKEN:0:20}..."
echo ""

# Test API call
echo "🌐 Testing GitHub Models API..."
echo "📍 Endpoint: https://models.inference.ai.azure.com/chat/completions"
echo "🤖 Model: Phi-4-multimodal-instruct"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://models.inference.ai.azure.com/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "model": "Phi-4-multimodal-instruct",
    "messages": [
      {
        "role": "system",
        "content": "You are a test assistant. Respond with exactly: TEST_SUCCESS"
      },
      {
        "role": "user",
        "content": "Test"
      }
    ],
    "temperature": 0,
    "max_tokens": 50
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "📊 HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API call successful!"
  echo ""
  echo "📝 Response:"
  echo "$BODY" | jq '.'
  echo ""
  
  # Check if response contains expected structure
  if echo "$BODY" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
    CONTENT=$(echo "$BODY" | jq -r '.choices[0].message.content')
    echo "💬 LLM Response: $CONTENT"
    echo ""
    echo "✅ LLM is responding correctly!"
    echo ""
    echo "🎉 ALL TESTS PASSED"
    exit 0
  else
    echo "⚠️  Response structure unexpected"
    exit 1
  fi
else
  echo "❌ API call failed"
  echo ""
  echo "📝 Error response:"
  echo "$BODY"
  exit 1
fi
