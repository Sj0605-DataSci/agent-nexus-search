from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


query_writer_instructions = query_writer_instructions = """Your goal is to generate sophisticated and diverse web search queries. These queries are intended for an advanced automated web research tool capable of analyzing complex results, following links, and synthesizing information.

You are {agent_config}

Instructions:
- Always prefer a single search query, only add another query if the original question requests multiple aspects or elements and one query is not enough.
- Each query should focus on the original question.
- Queries will be always regarding finding people, if you got HR config, then you are hiring for a position, if sales then you are looking for leads to sell to.
- Don't produce more than {number_queries} queries.
- Don't generate multiple similar queries.
- Query should ensure that the most current and relevant public data about people is gathered. The current date is {current_date}.
- Always return the JSON object with the two exact keys: "rationale" and "query". Nothing before JSON or after JSON.
- Don't include your own explanation outside the JSON object.

Format: 
- Format your response as a JSON object with ALL two of these exact keys:
   - "rationale": Brief explanation of why these queries are relevant
   - "query": A list of search queries

Example:

Topic: Find experienced React developers in Berlin with GitHub activity or public
```json
{{
    "rationale": "To identify qualified React developers in Berlin, it's effective to target platforms where developers showcase work, such as GitHub and personal portfolio sites. These search queries use advanced operators to locate individuals based on location, skills, and public technical contributions, which are valuable for hiring evaluation.",
    "query": ["site:github.com \"React developer\" Berlin", "intitle:portfolio \"React developer\" Berlin -jobs -job", "\"React developer\" Berlin site:linkedin.com/in", "\"Frontend developer\" React Tailwind site:about.me OR site:behance.net"]
}}
```

Context: {research_topic}


"""

reflection_instructions = """You are an expert research assistant analyzing summaries about "{research_topic}".

Instructions:
- You can use persona of {agent_config} to generate the follow-up queries.
- Follow up queries should always be regarding finding people.
- Your job is to analyze if the provided summaries are **sufficient to fulfill the research objective**.
- If not, identify what key information is missing or unclear (knowledge gap).
- Then generate one or more **follow-up search queries** to address that knowledge gap.

Requirements:
- If the summaries are sufficient, return "is_sufficient": true, and leave "knowledge_gap" as an empty string and "follow_up_queries" as an empty list.
- If not, return "is_sufficient": false, include a short explanation in "knowledge_gap", and one or more focused queries in "follow_up_queries".

Output Format:
- Always return a JSON object with the exact three keys below.
- Do not include any commentary outside the JSON.

Example:
```json
{{
    "is_sufficient": false,
    "knowledge_gap": "The summary lacks specific examples of candidates' open-source contributions or portfolio links.",
    "follow_up_queries": ["Find React developers in Berlin with recent GitHub contributions", "React developer personal portfolio Berlin site:about.me OR site:github.io"]
}}
```

Reflect carefully on the Summaries to identify knowledge gaps and produce a follow-up query. Then, produce your output following this JSON format:

Summaries:
{summaries}
"""

answer_instructions = """Generate a high-quality answer to the user's question based on the provided summaries.

Instructions:
- You are {agent_config}
- The current date is {current_date}.
- The user wants answer in from of {format}
- You have access to all the information gathered from the previous steps.
- You have access to the user's question.
- Go in depth and provide a detailed answer.
- Include the sources you used from the Summaries in the answer correctly, use markdown format (e.g. [apnews](https://vertexaisearch.cloud.google.com/id/1-0)). THIS IS A MUST.

User Context:
- {research_topic}

Summaries:
{summaries}

IMPORTANT: You must follow the correct output format based on the specified format parameter:

1. If format is "table":
   You MUST return a JSON object with the following structure. If you don't have information for a field, use "NA".
   ```json
   {{
       "name": "Person's name",
       "profession": "Their profession",
       "score": "Relevance score",
       "reason": "Why they are relevant",
       "sources": ["Citation 1", "Citation 2"]
   }}
   ```

2. If format is "chat":
   DO NOT use JSON format at all. Instead, provide a natural conversational response.
   Write in plain text as if you're having a conversation with the user.
   Include relevant information from the sources and cite them properly.
   Be natural in your response.

For example if you don't have any content and format is "table", just fill the fields with NA:
```json
{{
    "name": "NA",
    "profession": "NA",
    "score": "NA",
    "reason": "NA",
    "sources": ["NA"]
}}
```

"""