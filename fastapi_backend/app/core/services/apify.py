from apify_client import ApifyClient
from app.core.config import settings

# Initialize the ApifyClient with your API token
client = ApifyClient(settings.APIFY_API_KEY)

# Prepare the Actor input
run_input = {
    "profileScraperMode": "Profile details no email ($4 per 1k)",
    "queries": [
        "https://www.linkedin.com/in/williamhgates",
        "https://www.linkedin.com/in/towhid-rahman",
    ],
}

# Run the Actor and wait for it to finish
run = client.actor("LpVuK3Zozwuipa5bp").call(run_input=run_input)

# Fetch and print Actor results from the run's dataset (if there are any)
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)