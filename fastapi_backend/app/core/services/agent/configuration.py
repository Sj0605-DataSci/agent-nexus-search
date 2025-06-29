import os
from pydantic import BaseModel, Field
from typing import Any, Optional

from langchain_core.runnables import RunnableConfig


class Configuration(BaseModel):
    """The configuration for the agent."""

    number_of_initial_queries: int = Field(
        default=3,
        metadata={"description": "The number of initial search queries to generate."},
    )

    max_research_loops: int = Field(
        default=3,
        metadata={"description": "The maximum number of research loops to perform."},
    )
    
    agent_id: Optional[str] = Field(
        default=None,
        metadata={"description": "The ID of the agent being used."},
    )
    
    user_id: Optional[str] = Field(
        default=None,
        metadata={"description": "The ID of the user."},
    )
    
    chat_thread_id: Optional[str] = Field(
        default=None,
        metadata={"description": "The ID of the chat thread."},
    )

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> "Configuration":
        """Create a Configuration instance from a RunnableConfig."""
        configurable = (
            config["configurable"] if config and "configurable" in config else {}
        )

        # Get raw values from environment or config
        raw_values: dict[str, Any] = {
            name: os.environ.get(name.upper(), configurable.get(name))
            for name in cls.model_fields.keys()
        }

        # Filter out None values
        values = {k: v for k, v in raw_values.items() if v is not None}

        return cls(**values)
