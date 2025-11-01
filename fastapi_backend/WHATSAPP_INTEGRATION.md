# WhatsApp Integration with AI Agent

## Overview
Fully integrated WhatsApp Business API with AI agent (Tally graph) following FastAPI best practices.

---

## Architecture

### **Service Layer Pattern**
```
WhatsApp Webhook → Routes (thin) → Service Layer → AI Agent → WhatsApp Tool → WhatsApp Service
```

### **Components**

#### **1. WhatsApp Service** (`app/core/services/whatsapp_service.py`)
- **Purpose**: Business logic for WhatsApp API operations
- **Features**:
  - Send text messages
  - Send template messages
  - Mark messages as read
  - Credential validation
  - Error handling and logging
- **Singleton pattern**: Single instance across application

#### **2. WhatsApp Tool** (`app/core/services/agent/tools/whatsapp_tool.py`)
- **Purpose**: LangChain tool for AI agent to send WhatsApp messages
- **Features**:
  - Async message sending
  - Integrated with WhatsApp service
  - Proper error handling
  - Logging for AI actions

#### **3. Routes** (`app/api/routes/whatsapp.py`)
- **Purpose**: Thin routing layer (FastAPI best practice)
- **Features**:
  - Webhook verification
  - Message reception
  - Background task delegation
  - No business logic (delegated to service)

#### **4. AI Agent Integration** (`app/core/services/agent/graph_tally.py`)
- **Purpose**: AI agent with WhatsApp messaging capability
- **Features**:
  - WhatsApp tool added to agent's toolset
  - System prompt updated with WhatsApp instructions
  - Receives phone number in context
  - Automatically sends responses via WhatsApp

---

## Message Flow

### **Incoming Message Flow**
```
1. User sends WhatsApp message
   ↓
2. Meta sends webhook to /api/whatsapp/webhook
   ↓
3. Route receives webhook (thin layer)
   ↓
4. Route delegates to process_with_ai_agent()
   ↓
5. AI agent (Tally graph) processes message
   ↓
6. AI agent uses send_whatsapp_message tool
   ↓
7. Tool calls WhatsApp service
   ↓
8. Service sends message via WhatsApp API
   ↓
9. User receives AI response on WhatsApp
```

### **Code Flow**
```python
# 1. Webhook receives message
@router.post("/webhook")
async def receive_webhook(request: Request):
    # Thin routing logic
    await handle_messages(value)

# 2. Delegate to AI agent (background task)
async def process_text_message(...):
    asyncio.create_task(process_with_ai_agent(...))

# 3. AI agent processes with tools
async def process_with_ai_agent(...):
    result = await tally_graph.ainvoke(initial_state)
    # AI agent will call send_whatsapp_message tool

# 4. Tool sends message
@tool
async def send_whatsapp_message(phone_number, message):
    result = await whatsapp_service.send_text_message(...)
    
# 5. Service handles API call
class WhatsAppService:
    async def send_text_message(...):
        # Call WhatsApp Cloud API
```

---

## Configuration

### **Environment Variables**
```bash
# WhatsApp Business API
WHATSAPP_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_access_token_from_meta
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Ngrok (for local development)
ENABLE_NGROK=true
NGROK_AUTH_TOKEN=your_ngrok_token
NGROK_DOMAIN=your-static-domain.ngrok-free.dev  # Optional static domain
```

### **Webhook URL**
```
https://your-domain.ngrok-free.dev/api/whatsapp/webhook
```

---

## Usage

### **1. Start Server**
```bash
# With static ngrok domain
python run.py --simple
```

### **2. Configure Meta Dashboard**
- Go to Meta App Dashboard → WhatsApp → Configuration
- Set webhook URL: `https://your-domain.ngrok-free.dev/api/whatsapp/webhook`
- Set verify token: Same as `WHATSAPP_VERIFY_TOKEN` in .env
- Subscribe to "messages" field

### **3. Test**
- Send message to WhatsApp Business number
- AI agent processes and responds automatically

---

## AI Agent Integration

### **System Prompt Addition**
```python
WHATSAPP MESSAGING:
- When you have a complete answer ready, use the send_whatsapp_message tool
- The phone number will be provided in the context (from_number field)
- After sending the WhatsApp message, confirm that the message was sent
- ALWAYS use the WhatsApp tool to send your final response
```

### **Tool Usage**
```python
# AI agent automatically calls this tool
send_whatsapp_message(
    phone_number="919311626289",
    message="Your answer here..."
)
```

### **Context Passing**
```python
initial_state = {
    "messages": [...],
    "from_number": from_number,  # Phone number for WhatsApp tool
    "contact_name": contact_name,
    "query": message_text,
    ...
}
```

---

## Best Practices Implemented

### **✅ Service Layer Pattern**
- Business logic in service layer (`whatsapp_service.py`)
- Routes are thin and only handle HTTP concerns
- Easy to test and maintain

### **✅ Separation of Concerns**
- **Routes**: HTTP handling, request/response
- **Service**: Business logic, API calls
- **Tools**: AI agent integration
- **Agent**: AI processing, decision making

### **✅ Error Handling**
- Try-catch at every layer
- Graceful fallbacks
- Detailed logging
- User-friendly error messages

### **✅ Async/Await**
- Non-blocking operations
- Background tasks for long-running processes
- Proper async context management

### **✅ Singleton Pattern**
- WhatsApp service is singleton
- Efficient resource usage
- Consistent state

---

## API Endpoints

### **POST /api/whatsapp/webhook**
- Receives incoming messages from Meta
- Validates webhook structure
- Delegates to AI agent

### **GET /api/whatsapp/webhook**
- Webhook verification endpoint
- Called once by Meta during setup

### **GET /api/whatsapp/health**
- Health check endpoint
- Returns configuration status

---

## Testing

### **Health Check**
```bash
curl https://your-domain.ngrok-free.dev/api/whatsapp/health
```

**Expected Response:**
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

### **Send Test Message**
1. Send message to WhatsApp Business number
2. Check logs for:
   ```
   Processing incoming message
   Invoking AI agent
   AI agent sending WhatsApp message
   Message sent successfully
   ```
3. Receive AI response on WhatsApp

---

## Logging

### **Key Log Points**
- Webhook received
- Message processing started
- AI agent invoked
- Tool called (send_whatsapp_message)
- Message sent successfully
- Errors at any stage

### **Example Logs**
```
Processing text message from_number=919311626289 message=Hello
Invoking AI agent from_number=919311626289
AI agent sending WhatsApp message phone_number=919311626289
Message sent successfully to=919311626289 message_id=wamid.xxx
AI agent completed processing
```

---

## Error Handling

### **Fallback Strategy**
1. **AI Agent Fails**: Send generic error message via WhatsApp service
2. **WhatsApp Service Fails**: Log error, return error response
3. **Tool Fails**: AI agent receives error, can retry or inform user

### **Error Messages**
- User-friendly
- No technical details exposed
- Actionable when possible

---

## Future Enhancements

### **Potential Additions**
- [ ] Media message processing (images, audio, video)
- [ ] Location-based features
- [ ] Interactive buttons and lists
- [ ] Message templates
- [ ] Conversation context persistence
- [ ] Multi-user conversation handling
- [ ] Analytics and metrics
- [ ] Rate limiting per user

---

## Files Modified/Created

### **Created**
- `app/core/services/whatsapp_service.py` - WhatsApp service layer
- `app/core/services/agent/tools/whatsapp_tool.py` - AI agent tool
- `WHATSAPP_INTEGRATION.md` - This documentation

### **Modified**
- `app/api/routes/whatsapp.py` - Refactored to use service layer
- `app/core/services/agent/graph_tally.py` - Added WhatsApp tool
- `app/main.py` - Already had ngrok support

---

## Summary

✅ **Service layer pattern** implemented  
✅ **Routes are thin** - only HTTP concerns  
✅ **Business logic in service** - reusable and testable  
✅ **AI agent integrated** - uses WhatsApp tool  
✅ **Async/background processing** - non-blocking  
✅ **Error handling** - graceful fallbacks  
✅ **Logging** - comprehensive tracking  
✅ **Best practices** - FastAPI standards  

**Result**: Production-ready WhatsApp integration with AI agent! 🚀
