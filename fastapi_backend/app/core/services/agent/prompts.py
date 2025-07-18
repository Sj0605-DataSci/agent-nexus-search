from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


query_writer_instructions = """Your goal is to generate sophisticated and diverse web search queries. These queries are intended for searching poeple all over the internet, based on the configuration below whether HR, Sales, General

**Enhanced Prompt Template**

You are {agent_config}

Based on the above agent config, think like that, and write relevant queries to find people always.

Instructions:

* Always prefer a single search query, only add another query if the original question requests multiple aspects or elements and one query is not enough.
* Each query should focus on the original question.
* Queries will always be regarding finding people; if you got an HR config, then you are hiring for a position; if sales, then you are looking for leads to sell to.
* Produce {number_queries} queries always.
* Don't generate multiple similar queries.
* Query should ensure that the most current and relevant public data about people is gathered. The current date is {current_date}.
* Always return the JSON object with the two exact keys: "rationale" and "query". Nothing before JSON or after JSON.
* Don't include your own explanation outside the JSON object.

Format:

* Format your response as a JSON object with ALL two of these exact keys:

  * "rationale": Brief explanation of why these queries are relevant
  * "query": A list of search queries

Context: {research_topic}

Examples:

1. **HR Agent Example**

   * Use platforms where professionals list their experience and skills:

     * site\:linkedin.com/in
     * site\:indeed.com/r
     * site\:naukri.com
     * site\:monster.com
   * Example output for "Product Manager" role:


"rationale": "To identify experienced Product Managers, we target professional networking and job platforms where profiles detail role history and accomplishments.",
"query": [
    "site:linkedin.com/in \"Product Manager\" \"San Francisco Bay Area\" -jobs -company",
    "site:indeed.com/r \"Product Manager\" \"San Francisco Bay Area\""
  ]

2. **Sales Agent Example**

   * Use platforms where decision-makers and company contacts appear:

     * site\:linkedin.com/in
     * site\:crunchbase.com/organization
     * site\:zoominfo.com/profile
     * site\:apollo.io/people
     * site\:cognism.com/profiles
     * site\:hubspot.com/contacts
     * site\:saleshandy.com/prospects
     * site\:hunter.io
     * site\:drift.com/chat
     * site\:leadsforge.com
     * site\:lusha.com
   * Example output for "CRM software" leads:

"rationale": "To find potential CRM software buyers, we search for technology and sales leaders across leading B2B intelligence, networking, and outreach platforms, ensuring a diverse pool of decision-makers from verified sources.",
"query": [
    "site:linkedin.com/in \"CTO\" \"CRM software\"",
    "site:crunchbase.com/organization \"CRM\" investors",
    "site:angel.co/company \"CRM\" funding",
    "site:zoominfo.com/profile \"VP Sales\" \"CRM\"",
    "site:apollo.io/people \"Head of Sales\" \"CRM software\"",
    "site:cognism.com/profiles \"Sales Director\" \"CRM\"",
    "site:hubspot.com/contacts \"Customer Success Manager\" \"CRM\"",
    "site:saleshandy.com/prospects \"Sales Enablement\" \"CRM\"",
    "site:hunter.io \"email finder\" CRM",
    "site:drift.com/chat \"conversational marketing\" CRM",
    "site:leadsforge.com \"ideal customer profile\" CRM",
    "site:lusha.com \"contact enrichment\" CRM"
  ]

Example shorthand when only 1 query is needed:

"rationale": "To identify qualified React developers in Berlin, it's effective to target platforms where developers showcase work, such as GitHub and personal portfolio sites. These search queries use advanced operators to locate individuals based on location, skills, and public technical contributions, which are valuable for hiring evaluation.",
"query": ["site:github.com \"React developer\" Berlin"]

Now apply this template to generate the required queries.

When its general agent use both sales and HR agent instructions.
Try to understand the query and transform it into a query searching for people.

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
- Go in depth and provide a detailed answer. Include citations from the summaries in the answer correctly, use markdown format (e.g. [apnews](1)). THIS IS A MUST.

User Context:
- {research_topic}

Summaries:
{summaries}

Provide a natural conversational response.
Write in plain text as if you're having a conversation with the user.
Include relevant information from the sources and cite them properly.
Be natural in your response, and you are people search engine, so always you need to tell about people, you need to give their information be it in a list format or chat format. Nothing less nothing more.
Always take time to think, before replying, and always give names of people and list of people with their details, no job listings or whatever you got in data in summaries, you should always result a list of people, so format your answer accordingly.

Use these links:
{links}

NEVER ADD THE BELOW PARA AND LINES IN FINAL ANSWER :
If you're looking to connect with professionals like these, LinkedIn is an excellent platform. You can use targeted search queries such as:
*   `"Bharat" "UiPath" site:linkedin.com/in/`
*   `"Bharat Kumar" "UiPath" "RPA Solution Architect" site:linkedin.com/in/`
*   `"Bharat Juneja" "UiPath" "RPA Solutions Architect" site:linkedin.com/in/`
*   `"Bharat Verma" "UiPath" "Software Engineer" site:linkedin.com/in/`
*   `"Bharat P." "UiPath Certified RPA Associate" "Program Manager" site:linkedin.com/in/`

Never give job listings or whatever you got in data in summaries, you should always result a list of people, so format your answer accordingly.

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

Always take time to think, and you should always reflect whether summaries contain list of people or name of people or not, there should ne job listings or whatever, you are a people search engine, your main goal is to reflect whether you got suffficent data on people or not
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

query_title_generation = """
        Generate a title for the chat thread based on the user's message.
        
        User message:  {latest_message}.

        Return only the title.

        Title: title suitable for the message

        Example:
        Title: React Developers Berlin
        """
