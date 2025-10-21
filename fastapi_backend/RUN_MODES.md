# FastAPI Server Run Modes

## Quick Reference

### For Ngrok Testing (Single Worker)
```bash
python run.py --simple
```
✅ **Best for:** Ngrok tunneling, debugging, development  
✅ **Workers:** 1 (no SIGSEGV crashes)  
✅ **Reload:** Enabled  

---

### For Production-like Testing (Multi-Worker)
```bash
python run.py --gunicorn
```
✅ **Best for:** Load testing, production simulation  
✅ **Workers:** 4 (default)  
✅ **Reload:** Enabled  

---

### Custom Worker Count
```bash
python run.py --gunicorn --workers 2
```
✅ **Best for:** Custom configurations  
✅ **Workers:** Configurable (2 in this example)  

---

### Auto-detect Mode (Default)
```bash
python run.py
```
✅ **Behavior:** Uses gunicorn if installed, else falls back to uvicorn  
✅ **Workers:** 4 (if gunicorn), 1 (if uvicorn)  

---

## Detailed Usage

### 1. Simple Mode (Recommended for Ngrok)
```bash
# Enable ngrok in .env
ENABLE_NGROK=true
NGROK_AUTH_TOKEN=your_token_here

# Run with single worker
python run.py --simple
```

**What happens:**
- Single uvicorn worker starts
- Ngrok tunnel creates successfully
- No worker conflicts
- Perfect for WhatsApp webhook testing

**Output:**
```
Starting simple uvicorn server (single worker)...
This mode is ideal for ngrok tunneling
🌐 Ngrok tunnel established: https://abc123.ngrok.io
📱 Use this URL for WhatsApp webhook: https://abc123.ngrok.io/api/whatsapp/webhook
```

---

### 2. Gunicorn Mode (Production-like)
```bash
python run.py --gunicorn
```

**What happens:**
- 4 gunicorn workers start (default)
- Better performance under load
- Production-like environment
- **Don't use with ngrok** (causes SIGSEGV crashes)

**Output:**
```
Running in GUNICORN mode (4 workers)
Starting server with command: gunicorn --workers 4 ...
[Worker 1] Booting...
[Worker 2] Booting...
[Worker 3] Booting...
[Worker 4] Booting...
```

---

### 3. Custom Workers
```bash
# 2 workers
python run.py --gunicorn --workers 2

# 8 workers (for high load)
python run.py --gunicorn --workers 8
```

---

## Command-line Options

```bash
python run.py --help
```

**Available options:**
- `--simple` - Single worker mode (uvicorn)
- `--gunicorn` - Multi-worker mode (gunicorn)
- `--workers N` - Number of workers (default: 4)

---

## Common Scenarios

### Scenario 1: Testing WhatsApp Webhook Locally
```bash
# 1. Add to .env
ENABLE_NGROK=true
NGROK_AUTH_TOKEN=your_token

# 2. Run with single worker
python run.py --simple

# 3. Copy ngrok URL from logs
# 4. Paste in Meta App Dashboard
```

### Scenario 2: Load Testing
```bash
# Run with 8 workers for high concurrency
python run.py --gunicorn --workers 8
```

### Scenario 3: Debugging Issues
```bash
# Single worker makes debugging easier
python run.py --simple
```

### Scenario 4: Production Simulation
```bash
# Match production worker count
python run.py --gunicorn --workers 4
```

---

## Troubleshooting

### Problem: SIGSEGV crashes with ngrok
**Solution:** Use `--simple` flag
```bash
python run.py --simple  # Single worker avoids conflicts
```

### Problem: Slow performance
**Solution:** Use more workers
```bash
python run.py --gunicorn --workers 8
```

### Problem: High memory usage
**Solution:** Reduce workers
```bash
python run.py --gunicorn --workers 2
```

---

## Environment Variables

### Ngrok Configuration
```bash
ENABLE_NGROK=true              # Enable/disable ngrok
NGROK_AUTH_TOKEN=your_token    # Your ngrok auth token
```

### Worker Configuration
```bash
WEB_CONCURRENCY=4              # Number of workers (alternative to --workers)
```

---

## Performance Comparison

| Mode | Workers | Memory | Best For |
|------|---------|--------|----------|
| `--simple` | 1 | ~500MB | Ngrok, debugging |
| `--gunicorn` | 4 | ~2GB | Production testing |
| `--workers 2` | 2 | ~1GB | Balanced |
| `--workers 8` | 8 | ~4GB | High load |

---

## Tips

1. **Always use `--simple` with ngrok** to avoid worker conflicts
2. **Use `--gunicorn` for load testing** to simulate production
3. **Start with fewer workers** and scale up as needed
4. **Monitor memory usage** with different worker counts
5. **Use `--workers 1` with gunicorn** if you need gunicorn features but single worker

---

## Examples

```bash
# Development with ngrok
python run.py --simple

# Production testing
python run.py --gunicorn

# Custom configuration
python run.py --gunicorn --workers 2

# Check help
python run.py --help
```

---

## Quick Decision Tree

```
Need ngrok?
├─ Yes → python run.py --simple
└─ No
   ├─ Need high performance? → python run.py --gunicorn --workers 8
   ├─ Normal testing? → python run.py --gunicorn
   └─ Debugging? → python run.py --simple
```
