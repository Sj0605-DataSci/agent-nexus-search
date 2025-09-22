import redis

# Use the exact Railway connection string
# REDIS_URL = "redis://default:davSzHLaGvJCERCPGIuWtMKJwkgnaOuM@ballast.proxy.rlwy.net:11091"
REDIS_URL = "redis://default:UeCYLmgJEgkxZpzvZDeXIpOxBCrtkXMd@gondola.proxy.rlwy.net:22961"

try:
    r = redis.from_url(REDIS_URL, decode_responses=True)

    # Test connection
    if not r.ping():
        raise Exception("Failed to connect to Redis")

    print("Connected to Redis ✅")

    # ⚠️ Wipe all keys
    r.flushdb()
    print("All keys deleted successfully 🚀")

except Exception as e:
    print(f"Error: {e}")