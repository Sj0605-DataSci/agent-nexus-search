# WhatsApp Business API Setup Guide

## Overview
This guide will help you set up WhatsApp Business API integration with your FastAPI backend.

## Prerequisites
1. **Meta Business Account** - Create at [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business App** - Set up in Meta App Dashboard
3. **Phone Number** - A phone number for your WhatsApp Business account

---

## Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - App Name: Your app name
   - Contact Email: Your email
   - Business Account: Select your business account

---

## Step 2: Add WhatsApp Product

1. In your app dashboard, click **"Add Product"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the setup wizard to:
   - Add a phone number (or use test number provided by Meta)
   - Verify your business

---

## Step 3: Get API Credentials

### 3.1 Get Phone Number ID
1. Go to **WhatsApp → API Setup** in your app dashboard
2. Copy the **"Phone Number ID"** (looks like: `123456789012345`)

### 3.2 Get Access Token
1. In **WhatsApp → API Setup**, find **"Temporary access token"**
2. Copy the token (valid for 24 hours for testing)
3. For production, generate a **Permanent Token**:
   - Go to **Settings → Business Settings → System Users**
   - Create a system user
   - Assign WhatsApp permissions
   - Generate permanent token

### 3.3 Create Verify Token
1. Create a random secure string (e.g., `my_secure_verify_token_12345`)
2. This will be used to verify webhook requests from Meta

---

## Step 4: Configure Environment Variables

Add these to your `.env` file:

```bash
# WhatsApp Business API Configuration
WHATSAPP_VERIFY_TOKEN=your_secure_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_access_token_from_meta
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

**Example:**
```bash
WHATSAPP_VERIFY_TOKEN=my_secure_token_xyz123
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBO7ZC8wZCZCqL...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

---

## Step 5: Deploy Your Webhook Endpoint

### For Local Testing (using ngrok):

1. **Install ngrok:**
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com
   ```

2. **Start your FastAPI server:**
   ```bash
   cd /Users/sanyamjain/Desktop/Projects/agent-nexus-search/fastapi_backend
   source .venv/bin/activate
   python run.py
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 8000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### For Production:
Deploy to your server with HTTPS enabled (Railway, Render, etc.)

---

## Step 6: Configure Webhook in Meta

1. Go to **WhatsApp → Configuration** in your app dashboard
2. Click **"Edit"** next to Webhook
3. Enter your webhook details:
   - **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
     - Local: `https://abc123.ngrok.io/api/whatsapp/webhook`
     - Production: `https://api.discoverminds.ai/api/whatsapp/webhook`
   - **Verify Token**: Same as `WHATSAPP_VERIFY_TOKEN` in your .env
4. Click **"Verify and Save"**

### Subscribe to Webhook Fields:
1. After verification, click **"Manage"**
2. Subscribe to these fields:
   - ✅ **messages** (required for receiving messages)
   - ✅ **message_status** (optional, for delivery status)

---

## Step 7: Test the Integration

### 7.1 Check Health Endpoint
```bash
curl https://your-domain.com/api/whatsapp/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "whatsapp_webhook",
  "configuration": {
    "verify_token_set": true,
    "access_token_set": true,
    "phone_number_id_set": true
  },
  "api_version": "v24.0"
}
```

### 7.2 Send Test Message
1. Open WhatsApp on your phone
2. Send a message to your WhatsApp Business number
3. Check your FastAPI logs for incoming webhook
4. You should receive an automated reply

---

## Available Endpoints

### 1. Webhook Verification (GET)
```
GET /api/whatsapp/webhook
```
Used by Meta to verify your webhook URL (one-time setup)

### 2. Receive Messages (POST)
```
POST /api/whatsapp/webhook
```
Receives incoming messages and events from WhatsApp

### 3. Health Check (GET)
```
GET /api/whatsapp/health
```
Check if WhatsApp integration is properly configured

---

## Webhook Payload Examples

### Incoming Text Message:
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "15551234567",
          "id": "wamid.XXX",
          "text": {"body": "Hello!"},
          "type": "text"
        }]
      }
    }]
  }]
}
```

### Sending Reply:
The system automatically sends replies using:
```python
await send_whatsapp_message(
    to_phone="15551234567",
    message="Your reply text here"
)
```

---

## Supported Message Types

Currently implemented:
- ✅ **Text messages** - Fully supported
- ✅ **Reactions** - Logged only
- ⚠️ **Media** (image, audio, video, document) - Acknowledged, processing TODO
- ⚠️ **Location** - Acknowledged, processing TODO

---

## Integration with Your AI Agent

To integrate with your existing chat/AI system, modify the `process_text_message()` function in `/app/api/routes/whatsapp.py`:

```python
async def process_text_message(
    from_number: str,
    message_text: str,
    message_id: str,
    contact_name: Optional[str] = None
):
    # TODO: Replace this with your AI agent integration
    # Example:
    # from app.core.services.chat_service import process_chat_message
    # response = await process_chat_message(message_text, user_id=from_number)
    
    response_text = f"AI Response: {your_ai_response}"
    await send_whatsapp_message(from_number, response_text)
```

---

## Troubleshooting

### Webhook Verification Failed
- ✅ Check `WHATSAPP_VERIFY_TOKEN` matches in both .env and Meta dashboard
- ✅ Ensure your endpoint is accessible via HTTPS
- ✅ Check FastAPI logs for verification request

### Messages Not Received
- ✅ Verify webhook is subscribed to "messages" field
- ✅ Check FastAPI logs for incoming POST requests
- ✅ Ensure phone number is verified in Meta dashboard

### Messages Not Sending
- ✅ Check `WHATSAPP_ACCESS_TOKEN` is valid (not expired)
- ✅ Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
- ✅ Check FastAPI logs for API errors
- ✅ Ensure phone number has messaging permissions

### Configuration Check
```bash
# Check if environment variables are loaded
curl https://your-domain.com/api/whatsapp/health
```

---

## Rate Limits

WhatsApp Business API has rate limits:
- **Free Tier**: 1,000 conversations/month
- **Paid Tier**: Unlimited (pay per conversation)
- **Message Rate**: ~80 messages/second per phone number

---

## Security Best Practices

1. **Verify Token**: Use a strong, random verify token
2. **Access Token**: Keep access token secure, never commit to git
3. **HTTPS Only**: Always use HTTPS for webhook endpoint
4. **Validate Webhooks**: The code validates all incoming webhooks
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

---

## Next Steps

1. ✅ Set up Meta Business Account
2. ✅ Create WhatsApp Business App
3. ✅ Configure environment variables
4. ✅ Deploy webhook endpoint
5. ✅ Configure webhook in Meta dashboard
6. ✅ Test with real messages
7. 🔄 Integrate with your AI agent
8. 🔄 Handle media messages
9. 🔄 Add conversation state management
10. 🔄 Deploy to production

---

## Useful Links

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Message API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [Meta App Dashboard](https://developers.facebook.com/apps)

---

## Support

For issues or questions:
1. Check FastAPI logs: `tail -f logs/app.log`
2. Check Meta webhook logs in app dashboard
3. Review this documentation
4. Contact Meta support for API-specific issues
