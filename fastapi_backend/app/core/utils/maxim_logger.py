# """
# Centralized Maxim logger configuration for use across the application.
# This prevents circular imports when multiple modules need access to the same logger.
# """

# from maxim import Maxim
# from maxim.logger.langchain import MaximLangchainTracer
# from app.core.config import settings

# # Initialize Maxim client and logger
# api_key = settings.MAXIM_API_KEY or "sk_mx_mg0rxrfe_HQnQPXJZRGC2U2dlyQjLyaAdYiU3lYXT"
# logger_id = settings.MAXIM_LOGGER_ID or "cmg0rwgwb02b712q44g6yvm0l"

# # Create a singleton instance of the Maxim logger
# maxim_client = Maxim({"api_key": api_key})
# max_logger = maxim_client.logger({"id": logger_id})

# # Create a LangChain tracer for use with LangGraph
# maxim_langchain_tracer = MaximLangchainTracer(max_logger)
