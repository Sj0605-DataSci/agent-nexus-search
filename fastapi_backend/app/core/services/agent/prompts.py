from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


query_writer_instructions = """Your goal is to generate sophisticated and diverse web search queries. These queries are intended for an advanced automated web research tool capable of analyzing complex results, following links, and synthesizing information.

You are {agent_config}

Instructions:
- Always prefer a single search query, only add another query if the original question requests multiple aspects or elements and one query is not enough.
- Each query should focus on the original question.
- Queries will be always regarding finding people, if you got HR config, then you are hiring for a position, if sales then you are looking for leads to sell to.
- Produce {number_queries} queries always.
- Don't generate multiple similar queries.
- Query should ensure that the most current and relevant public data about people is gathered. The current date is {current_date}.
- Always return the JSON object with the two exact keys: "rationale" and "query". Nothing before JSON or after JSON.
- Don't include your own explanation outside the JSON object.

Format: 
- Format your response as a JSON object with ALL two of these exact keys:
   - "rationale": Brief explanation of why these queries are relevant
   - "query": A list of search queries

Context: {research_topic}

Example:
lets say given, produce 3 queries then:

"rationale": "To identify qualified React developers in Berlin, it's effective to target platforms where developers showcase work, such as GitHub and personal portfolio sites. These search queries use advanced operators to locate individuals based on location, skills, and public technical contributions, which are valuable for hiring evaluation.",
"query": ["site:github.com \"React developer\" Berlin",  "intitle:portfolio \"React developer\" Berlin -jobs -job", "\"React developer\" Berlin site:linkedin.com/in" , "\"Frontend developer\" React Tailwind site:about.me OR site:behance.net"]

lets say given, produce 1 query then:

"rationale": "To identify qualified React developers in Berlin, it's effective to target platforms where developers showcase work, such as GitHub and personal portfolio sites. These search queries use advanced operators to locate individuals based on location, skills, and public technical contributions, which are valuable for hiring evaluation.",
"query": ["site:github.com \"React developer\" Berlin"]

"""

reflection_instructions = """You are an expert research assistant analyzing summaries about "{research_topic}".

Instructions:
- You can use persona of {agent_config} to generate the follow-up queries.
- Follow up queries should always be regarding finding people.
- Your job is to analyze if the provided summaries are **sufficient to fulfill the research objective**.
- If not, identify what key information is missing or unclear (knowledge gap).
- Then generate one or more **follow-up search queries** to address that knowledge gap.
- Number of follow up queries should always be {number_queries}

Requirements:
- If the summaries are sufficient, return "is_sufficient": true, and leave "knowledge_gap" as an empty string and "follow_up_queries" as an empty list.
- If not, return "is_sufficient": false, include a short explanation in "knowledge_gap", and one or more focused queries in "follow_up_queries".

Output Format:
- Always return a JSON object with the exact three keys below.
- Do not include any commentary outside the JSON.

lets say number of follow up queries is 2 then:
Example:
is_sufficient": false,
knowledge_gap": "The summary lacks specific examples of candidates' open-source contributions or portfolio links.",
follow_up_queries": ["Find React developers in Berlin with recent GitHub contributions", "React developer personal portfolio Berlin site:about.me OR site:github.io"]

lets say number of follow up queries is 1 then:
Example:
is_sufficient": false,
knowledge_gap": "The summary lacks specific examples of candidates' open-source contributions or portfolio links.",
follow_up_queries": ["Find React developers in Berlin with recent GitHub contributions"]

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
- Include the sources you used from the Summaries in the answer correctly, use markdown format (e.g. [apnews](link from below links)). THIS IS A MUST.

User Context:
- {research_topic}

Summaries:
{summaries}

DO NOT use JSON format at all. Instead, provide a natural conversational response.
Write in plain text as if you're having a conversation with the user.
Include relevant information from the sources and cite them properly.
Be natural in your response.

Use these links:
{links}

NEVER ADD THE BELOW PARA AND LINES IN FINAL ANSWER :
If you're looking to connect with professionals like these, LinkedIn is an excellent platform. You can use targeted search queries such as:
*   `"Bharat" "UiPath" site:linkedin.com/in/`
*   `"Bharat Kumar" "UiPath" "RPA Solution Architect" site:linkedin.com/in/`
*   `"Bharat Juneja" "UiPath" "RPA Solutions Architect" site:linkedin.com/in/`
*   `"Bharat Verma" "UiPath" "Software Engineer" site:linkedin.com/in/`
*   `"Bharat P." "UiPath Certified RPA Associate" "Program Manager" site:linkedin.com/in/`

"""

optimised_query_instructions = """You are an expert at optimizing search queries for finding professional profiles.
        
        Original query: {research_topic}
        
        Please rewrite this query into {number_queries} optimized subqueries that would help find relevant professional profiles.
        Each subquery should focus on different aspects or interpretations of the original query.
        
        Format your response as a JSON array of strings, with each string being an optimized subquery.
        Do not include any explanations or other text outside the JSON array.

        Example:
       ```json
{{
    "query": "React Developers Berlin",
    "query2": "Software Developers Berlin"
}}
``` """

sql_query_instructions = """You are an expert at converting natural language queries into SQL.

            This is the user id of the user: {user_id}
            
            I have a database table called 'connections' with these exact columns:
            - first_name
            - last_name
            - linkedin_url
            - email_address
            - headline
            - company
            - position
            - connected_on
            - extra_info
            - user_id
            
            Convert this search query into a SQL query that will find relevant profiles:
            "{subquery}"
            
            ONLY use columns company, position, user_id, linkedin_url, first_name, last_name
            Return ONLY the SQL query without any explanations or markdown formatting.
            The query should select all columns (*) and limit to {number_of_results_returned} results.

            Example:
            SELECT * FROM connections WHERE company = 'Google' AND position = 'Software Engineer' AND user_id = '{user_id}' LIMIT 2 ;"""

reflection_instructions_sql="""You are an expert research assistant analyzing answers about "{research_topic}".

Instructions:
- Follow up queries should always be regarding finding people and number of queries should always be {number_queries}
- Your job is to analyze if the provided answers are **sufficient to fulfill the search objective**.
- If not, identify what key information is missing.
- Then generate one or more **follow-up search queries** to address that knowledge gap.
- For now cater to 1 linkedin URL or whatever  is coming in case of sql here, so let is_sufficient be true always.

Requirements:
- If the answers are sufficient, return "is_sufficient": true, and leave "knowledge_gap" as an empty string and "follow_up_queries" as an empty list.
- If not, return "is_sufficient": false, include a short explanation in "knowledge_gap", and one or more focused queries in "follow_up_queries".

Output Format:
- Always return a JSON object with the exact three keys below.
- Do not include any commentary outside the JSON.


Lets say number of follow up queries is 2 then:
Example:
is_sufficient": false,
knowledge_gap": "The answer lacks specific examples of candidates' open-source contributions or portfolio links.",
follow_up_queries": ["Find React developers in Berlin with recent GitHub contributions", "React developer personal portfolio Berlin site:about.me OR site:github.io"]

Lets say number of follow up queries is 1 then:
Example:
is_sufficient": false,
knowledge_gap": "The answer lacks specific examples of candidates' open-source contributions or portfolio links.",
follow_up_queries": ["Find React developers in Berlin with recent GitHub contributions"]

Reflect carefully on the answers to identify knowledge gaps and produce a follow-up query. Then, produce your output following this JSON format:

Answers:
{summaries}
"""   



answer_instructions_table_format = """Generate a high-quality answer to the user's question based on the provided summaries.

Instructions:
- You are {agent_config}
- The current date is {current_date}.
- The user wants answer in from of {format}
- You have access to all the information gathered from the previous steps.
- You have access to the user's question.
- Go in depth and provide a detailed answer.
- Include the sources you used from the Summaries in the answer correctly, use markdown format 
- EXAMPLE: ([apnews](link from below links)

Use these links:
{links}

User Context:
- {research_topic}

Summaries:
{summaries}

Always give the answer like this:

if format is table and you get detail of 1 person then:

FName : John
LName : Doe
Social links : https://linkedin.com/in/johndoe, https://github.com/johndoe
Email : johndoe@gmail.com
Phone No : 1234567890

if format is table and you get detail of more than 1 person then:

FName : John
LName : Doe
Social links : https://linkedin.com/in/johndoe, https://github.com/johndoe
Email : johndoe@gmail.com
Phone No : 1234567890

FName : John
LName : Sinha
Social links : https://linkedin.com/in/johnsinha, https://github.com/johnsinha
Email : johnsinha@gmail.com
Phone No : 1234567890

if any field has empty value, type null in front of that field

Always give correct links and do not give any fake links

"""