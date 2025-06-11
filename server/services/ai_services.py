import os
import time
import json
import re
from dotenv import load_dotenv
from azure.ai.projects import AIProjectClient
from azure.ai.agents import AgentsClient
from azure.identity import DefaultAzureCredential
from azure.ai.agents.models import (
    BingGroundingTool,
    FunctionTool,
    ToolSet,
    ConnectedAgentTool,
)
from utils.user_functions import user_functions

load_dotenv()

def extract_urls_from_text(text):
    """Extract URLs from AI response text"""
    try:
        urls = []
        
        # Pattern to match URLs (http, https)
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+[^\s<>"{}|\\^`\[\].,;:!?)]'
        found_urls = re.findall(url_pattern, text)
        
        # Pattern to match Bing request URLs specifically
        bing_pattern = r'https://api\.bing\.microsoft\.com/[^\s<>"{}|\\^`\[\]]+[^\s<>"{}|\\^`\[\].,;:!?)]'
        bing_urls = re.findall(bing_pattern, text)
        
        # Combine and deduplicate URLs
        all_urls = list(set(found_urls + bing_urls))
        
        # Clean and validate URLs
        for url in all_urls:
            if url and len(url) > 10:  # Basic validation
                urls.append(url)
        
        return urls
    except Exception as e:
        return []

def extract_message_content(message_content):
    """Extract text content from Azure AI message content with proper handling of nested objects"""
    try:
        def extract_text_recursive(obj):
            """Recursively extract text from nested objects"""
            if obj is None:
                return ""
            elif isinstance(obj, str):
                return obj
            elif isinstance(obj, list):
                texts = []
                for item in obj:
                    texts.append(extract_text_recursive(item))
                return "".join(texts)
            elif hasattr(obj, 'text'):
                # Handle objects with text attribute
                return str(obj.text)
            elif hasattr(obj, 'value'):
                # Handle objects with value attribute  
                return extract_text_recursive(obj.value)
            elif hasattr(obj, '__dict__'):
                # Handle objects with attributes - look for text-like fields
                obj_dict = obj.__dict__
                if 'text' in obj_dict:
                    return str(obj_dict['text'])
                elif 'value' in obj_dict:
                    return extract_text_recursive(obj_dict['value'])
                elif 'content' in obj_dict:
                    return extract_text_recursive(obj_dict['content'])
                else:
                    # Try to find any string values in the object
                    text_parts = []
                    for key, val in obj_dict.items():
                        if isinstance(val, str) and val.strip():
                            text_parts.append(val)
                    return " ".join(text_parts)
            else:
                # Fallback to string conversion
                return str(obj)
        
        return extract_text_recursive(message_content)
        
    except Exception as e:
        return f"Error extracting content: {str(e)} - Content type: {type(message_content)}"

def analyze_excel_data(excel_json_data):
    """Analyze Excel data and provide business insights"""
    try:
        # Load project endpoint from .env
        project_endpoint = os.environ["PROJECT_ENDPOINT"]

        # Create an AIProjectClient instance
        project_client = AIProjectClient(
            endpoint=project_endpoint,
            credential=DefaultAzureCredential(),
        )

        agents_client = AgentsClient(
            endpoint=project_endpoint,
            credential=DefaultAzureCredential(),
        )

        # Load Bing connection ID
        conn_id = os.environ["BING_CONNECTION_NAME"]

        # Initialize tools
        bing_tool = BingGroundingTool(connection_id=conn_id)
        functions = FunctionTool(functions=user_functions)
        toolset = ToolSet()
        toolset.add(bing_tool)
        toolset.add(functions)

        agents_client.enable_auto_function_calls(toolset)

        with agents_client:
            agent = agents_client.create_agent(
                model=os.environ["MODEL_DEPLOYMENT_NAME"],
                name="business-analyst-agent",
                instructions="""You are an expert business analyst and data scientist specializing in retail, inventory management, and pricing strategies.

        CRITICAL BING SEARCH REQUIREMENTS:
        1. Always use bing_grounding tool with proper query parameter based on user input
        2. Exact format: search(query: 'your search terms')
        3. You must use exactly search(query: 'your search terms') in bing_grounding tool
        4. If user not tell you the specific date and time you must use current date and time and tell user date and time
        5. If the data is not available on current date and time you must use the nearest date and time and tell user date and time
        6. You must always provide url of bing_grounding tool in your response

        IMPORTANT URL FORMATTING:
        - Always include full URLs from your Bing searches in your response
        - Format URLs clearly like: "Source: https://example.com"
        - Include the search request URL when available
        - Add URLs at the end of each section where you used search data

        Example: For "market pricing analysis" → search(query: 'market pricing analysis 2024')
        input: search query
        output: {'requesturl': 'https://api.bing.microsoft.com/v7.0/search?q=search(query: "search query")', 'response_metadata': "{'market': 'en-US', 'num_docs_retrieved': 5, 'num_docs_actually_used': 5}"}}]}

        MANDATORY BING SEARCHES FOR BUSINESS ANALYSIS:
        1. **MUST USE BING SEARCH**: Always use bing_grounding tool to get real-time market data and context
        2. **Search for market trends**: Get current pricing trends, industry data, competitor analysis
        3. **Search for economic context**: Get current economic conditions, inflation data, market conditions
        4. **Provide URLs**: Always include URLs from bing_grounding tool in your response
        5. **Current date/time**: Use current date and time for searches, mention the search date

        TASK: Analyze the provided Excel data and provide comprehensive business insights with real-time market context.

        ANALYSIS REQUIREMENTS:
        1. **Data Understanding**: First understand what type of business data this is (sales, inventory, products, etc.)
        2. **Price Analysis**: 
           - Analyze pricing patterns in the data
           - SEARCH for current market prices and trends for similar products/services
           - Predict optimal pricing based on data + market research
           - Include URLs for pricing data sources
        3. **Stock Level Analysis**: 
           - Evaluate current stock levels and patterns
           - SEARCH for industry best practices and seasonal trends
           - Include URLs for industry research sources
        4. **Stock Recommendations**: 
           - Recommend optimal stock levels based on data trends
           - SEARCH for supply chain insights and inventory management trends
           - Include URLs for supply chain research sources
        5. **Promotion Opportunities**: 
           - Suggest promotional strategies based on data insights
           - SEARCH for current promotional trends and successful campaigns
           - Include URLs for promotional strategy sources
        6. **Market Research**: 
           - MANDATORY: Use Bing search to get current market trends
           - Search for competitor pricing, industry reports, economic indicators
           - Search for seasonal trends, consumer behavior, market forecasts
           - Include all search URLs and sources
        7. **Risk Assessment**: 
           - Identify potential risks or opportunities
           - SEARCH for current market risks, supply chain issues, economic factors
           - Include URLs for risk analysis sources

        SEARCH STRATEGY:
        - Search for industry-specific data related to the Excel data
        - Search for current pricing trends and competitor analysis
        - Search for economic indicators and market conditions
        - Search for seasonal trends and forecasting data
        - Search for supply chain and inventory management best practices

        OUTPUT FORMAT:
        Provide a structured analysis with these sections:
        - **Summary**: Brief overview of the data with market context
        - **Price Analysis**: Pricing insights with current market comparisons (include search URLs)
        - **Stock Analysis**: Stock level evaluation with industry benchmarks (include search URLs)
        - **Recommendations**: Actionable recommendations based on data + market research
        - **Promotions**: Promotional strategies with current market examples (include search URLs)
        - **Market Insights**: Current market trends from Bing search (MANDATORY - include all URLs)
        - **Risks & Opportunities**: Risks and opportunities with real-time market context (include URLs)
        - **Sources**: List all URLs used in analysis at the end

        CRITICAL: Always format URLs clearly in your response like "Source: https://example.com" or "Research: https://api.bing.microsoft.com/..."
        Always provide specific, actionable insights based on the actual data AND current market research.
        Include URLs and search dates for all market research conducted.
        """,
                toolset=toolset,
            )

            # Create a communication thread
            thread = agents_client.threads.create()

            # Prepare the Excel data for analysis
            data_content = f"""
    Please analyze this Excel data and provide comprehensive business insights:

    EXCEL DATA:
    {json.dumps(excel_json_data, indent=2)}

    Please provide detailed analysis covering:
    1. Price predictions and recommendations with market research
    2. Stock level analysis and recommendations with industry data
    3. Promotional opportunities with current market examples
    4. Market trends (MANDATORY: search for relevant market data)
    5. Risk assessment and opportunities with current market context

    IMPORTANT: Include all URLs from your Bing searches in your response.
    Format your response as structured insights with specific recommendations and source URLs.
    """

            # Add user message with Excel data
            message = agents_client.messages.create(
                thread_id=thread.id,
                role="user",
                content=data_content,
            )

            # Create and process a run for the agent to handle the message
            run = agents_client.runs.create_and_process(thread_id=thread.id, agent_id=agent.id)

            # Fetch all messages from the thread
            messages = agents_client.messages.list(thread_id=thread.id)

            # Delete the agent after use
            agents_client.delete_agent(agent.id)

            # Return the AI analysis - properly extract text content and URLs
            for message in messages:
                if message['role'] == 'assistant':
                    analysis_text = extract_message_content(message['content'])
                    
                    # Extract URLs from the analysis text
                    extracted_urls = extract_urls_from_text(analysis_text)
                    
                    return {
                        "analysis": analysis_text,
                        "urls": extracted_urls,
                        "url_count": len(extracted_urls),
                        "status": "success",
                        "search_date": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "message_type": str(type(message['content']))
                    }
            
            return {"error": "No analysis generated", "status": "error"}
            
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}", "status": "error"}

def ai():
    # Load project endpoint from .env
    project_endpoint = os.environ["PROJECT_ENDPOINT"]

    # Create an AIProjectClient instance
    project_client = AIProjectClient(
        endpoint=project_endpoint,
        credential=DefaultAzureCredential(),
    )

    agents_client = AgentsClient(
        endpoint=project_endpoint,
        credential=DefaultAzureCredential(),
    )

    # Load Bing connection ID
    conn_id = os.environ["BING_CONNECTION_NAME"]

    # Initialize tools
    bing_tool = BingGroundingTool(connection_id=conn_id)

    functions = FunctionTool(functions=user_functions)
    toolset = ToolSet()
    toolset.add(bing_tool)
    toolset.add(functions)

    agents_client.enable_auto_function_calls(toolset)

    with agents_client:
        agent = agents_client.create_agent(
            model=os.environ["MODEL_DEPLOYMENT_NAME"],
            name="my-bing-agent",
            instructions="""You are a helpful assistant with web search capabilities. 

    CRITICAL REQUIREMENTS:
    1. Always use bing_grounding tool with proper query parameter based on user input
    2. Exact format: search(query: 'your search terms')
    3. You must use exactly search(query: 'your search terms') in bing_grounding tool
    4. If user not tell you the specific date and time you must use current date and time and tell user date and time
    5. If the data is not available on current date and time you must use the nearest date and time and tell user date and time
    6. You must always provide url of bing_grounding tool in your response

    Example: For "searching query" → search(query: 'search query')
    input: search query
    output: {'requesturl': 'https://api.bing.microsoft.com/v7.0/search?q=search(query: "search query")', 'response_metadata': "{'market': 'en-US', 'num_docs_retrieved': 5, 'num_docs_actually_used': 5}"}}]}

    """,
            toolset=toolset,
        )
        print(f"✅ Created agent, ID: {agent.id}")

        # Create a communication thread
        thread = agents_client.threads.create()
        print(f"✅ Created thread, ID: {thread.id}")

        # Add user message
        message = agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            # content="Search the News to day about agriculture in Thailand and answer me. Then give me datetime and weather",
            content="Give me Stock price of Microsoft and potential of Microsoft stock and details about Microsoft. Then give me my current datetime",
        )
        print(f"✅ Created message, ID: {message['id']}")

        # Create and process a run for the agent to handle the message
        run = agents_client.runs.create_and_process(thread_id=thread.id, agent_id=agent.id)
        print(f"Run status: {run.status}")

        run_steps = agents_client.run_steps.list(thread_id=thread.id, run_id=run.id)
        for step in run_steps:
            print("STEP :", step)
            print(f"Step {step['id']} status: {step['status']}")
            step_details = step.get("step_details", {})
            tool_calls = step_details.get("tool_calls", [])
            if tool_calls:
                print("  Tool calls:")
                for call in tool_calls:
                    print(f"    Tool Call ID: {call.get('id')}")
                    print(f"    Type: {call.get('type')}")

        # Fetch and log all messages from the thread
        messages = agents_client.messages.list(thread_id=thread.id)

        # Delete the agent after use
        agents_client.delete_agent(agent.id)
        print("Deleted agent")

        for message in messages:
            return [{"Role:": message['role']}, {"Content:": message['content']}]