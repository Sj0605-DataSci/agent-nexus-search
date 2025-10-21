# Ngrok Tunnel Setup for FastAPI

## Overview
Your FastAPI app now has built-in ngrok tunneling support! This automatically creates a public HTTPS URL for your local development server.

---

## Quick Start

### 1. Install ngrok package
```bash
cd /Users/sanyamjain/Desktop/Projects/agent-nexus-search/fastapi_backend
source .venv/bin/activate
pip install ngrok
```

### 2. Get ngrok auth token
1. Sign up at [ngrok.com](https://ngrok.com)
2. Go to [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Copy your authtoken

### 3. Add to .env file
```bash
# Ngrok Configuration
ENABLE_NGROK=true
NGROK_AUTH_TOKEN=your_ngrok_authtoken_here
```

### 4. Start your server
```bash
python run.py
```

### 5. Get your public URL
Check the logs for:
```
🌐 Ngrok tunnel established: https://abc123.ngrok.io
📱 Use this URL for WhatsApp webhook: https://abc123.ngrok.io/api/whatsapp/webhook
```

---

## How It Works

### Automatic Tunnel Creation
When `ENABLE_NGROK=true`, the app automatically:
1. ✅ Creates an ngrok tunnel on startup
2. ✅ Forwards port 8000 to a public HTTPS URL
3. ✅ Logs the public URL in console
4. ✅ Disconnects tunnel on shutdown

### Code Integration
The ngrok setup is in `/app/main.py` lifespan manager:

```python
# Ngrok tunnel setup
ngrok_listener = None
if ENABLE_NGROK:
    try:
        import ngrok
        logger.info("Setting up ngrok tunnel...")
        ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        ngrok_listener = await ngrok.forward(8000, authtoken_from_env=True)
        ngrok_url = ngrok_listener.url()
        logger.info(f"🌐 Ngrok tunnel established: {ngrok_url}")
        logger.info(f"📱 Use this URL for WhatsApp webhook: {ngrok_url}/api/whatsapp/webhook")
    except ImportError:
        logger.warning("ngrok package not installed. Install with: pip install ngrok")
    except Exception as e:
        logger.error(f"Failed to setup ngrok tunnel: {str(e)}")
```

---

## Usage Examples

### For WhatsApp Webhook Testing
1. Start server with ngrok enabled
2. Copy the webhook URL from logs
3. Paste in Meta App Dashboard webhook configuration
4. Test by sending messages to your WhatsApp Business number

### For API Testing
```bash
# Your ngrok URL from logs
export NGROK_URL="https://abc123.ngrok.io"

# Test health endpoint
curl $NGROK_URL/health

# Test WhatsApp webhook health
curl $NGROK_URL/api/whatsapp/health
```

---

## Environment Variables

### Required
```bash
ENABLE_NGROK=true                    # Enable/disable ngrok tunnel
NGROK_AUTH_TOKEN=your_token_here     # Your ngrok authtoken
```

### Optional
The app uses default settings:
- **Port**: 8000 (automatically forwarded)
- **Protocol**: HTTPS (ngrok default)
- **Region**: Auto (closest to you)

---

## Disabling Ngrok

### Temporary (current session)
```bash
ENABLE_NGROK=false python run.py
```

### Permanent
Update `.env`:
```bash
ENABLE_NGROK=false
```

Or simply remove/comment out the line:
```bash
# ENABLE_NGROK=true
```

---

## Troubleshooting

### "ngrok package not installed"
```bash
pip install ngrok
```

### "Failed to setup ngrok tunnel: authentication failed"
- Check your `NGROK_AUTH_TOKEN` is correct
- Get new token from [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

### "Port 8000 already in use"
- Stop other services using port 8000
- Or change port in `run.py` and `main.py`

### Tunnel URL changes on restart
- Free ngrok accounts get random URLs
- Upgrade to paid plan for custom domains
- Or use ngrok's reserved domains feature

---

## Advanced Configuration

### Custom Domain (Paid Plan)
If you have a paid ngrok plan with custom domain:

```python
# In main.py, modify the ngrok.forward() call:
ngrok_listener = await ngrok.forward(
    8000,
    authtoken_from_env=True,
    domain="your-custom-domain.ngrok.io"
)
```

### Custom Region
```python
ngrok_listener = await ngrok.forward(
    8000,
    authtoken_from_env=True,
    region="us"  # us, eu, ap, au, sa, jp, in
)
```

---

## Ngrok Dashboard

View your active tunnels at:
- [https://dashboard.ngrok.com/tunnels/agents](https://dashboard.ngrok.com/tunnels/agents)

Features:
- 📊 Request inspection
- 🔍 Traffic replay
- 📈 Analytics
- 🔒 Security settings

---

## Production Deployment

⚠️ **Important**: Ngrok is for development/testing only!

For production:
1. Deploy to a cloud provider (Railway, Render, AWS, etc.)
2. Use proper domain with SSL certificate
3. Set `ENABLE_NGROK=false` in production environment
4. Use environment-specific configuration

---

## Comparison: Manual vs Automatic

### Manual ngrok (old way)
```bash
# Terminal 1
python run.py

# Terminal 2
ngrok http 8000

# Copy URL manually from ngrok terminal
```

### Automatic ngrok (new way)
```bash
# Just one command
ENABLE_NGROK=true python run.py

# URL automatically logged in console
```

---

## Benefits

✅ **No separate terminal** - ngrok runs within your app  
✅ **Automatic URL logging** - No need to copy from another window  
✅ **Lifecycle management** - Tunnel closes when app stops  
✅ **Easy toggle** - Enable/disable with environment variable  
✅ **Production-safe** - Disabled by default  

---

## Security Notes

1. **Never commit** `NGROK_AUTH_TOKEN` to git
2. **Use .env** file for local development
3. **Disable in production** - Set `ENABLE_NGROK=false`
4. **Monitor usage** - Check ngrok dashboard for suspicious activity
5. **Rotate tokens** - Regenerate if compromised

---

## Support

- **Ngrok Docs**: [https://ngrok.com/docs](https://ngrok.com/docs)
- **Python SDK**: [https://github.com/ngrok/ngrok-python](https://github.com/ngrok/ngrok-python)
- **FastAPI Integration**: [https://ngrok.com/docs/using-ngrok-with/fastAPI](https://ngrok.com/docs/using-ngrok-with/fastAPI)

---

## Example Output

When you start the server with ngrok enabled:

```
2025-10-18 17:45:23 - INFO - Starting application...
2025-10-18 17:45:23 - INFO - Setting up ngrok tunnel...
2025-10-18 17:45:25 - INFO - 🌐 Ngrok tunnel established: https://abc123-def456.ngrok.io
2025-10-18 17:45:25 - INFO - 📱 Use this URL for WhatsApp webhook: https://abc123-def456.ngrok.io/api/whatsapp/webhook
2025-10-18 17:45:25 - INFO - Redis client initialized
2025-10-18 17:45:25 - INFO - Memory monitoring started
2025-10-18 17:45:25 - INFO - Worker manager initialized
```

Copy the URL and use it for your webhooks! 🚀
