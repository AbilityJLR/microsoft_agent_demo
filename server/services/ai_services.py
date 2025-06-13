import os
import time
import pandas as pd
import io
from typing import Dict, Any
from dotenv import load_dotenv
from azure.ai.projects import AIProjectClient
from azure.ai.agents import AgentsClient
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.ai.agents.models import (
    BingGroundingTool,
    FunctionTool,
    ToolSet,
    ConnectedAgentTool,
)
from utils.user_functions import user_functions
import json
from openai import AzureOpenAI

load_dotenv()


def ai_analyze():
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

    with agents_client:
        agent = agents_client.create_agent(
            model=os.environ["MODEL_DEPLOYMENT_NAME"],
            name="my-bing-agent",
            instructions="""You are a helpful assistant with web search capabilities.""",
            tools=bing_tool.definitions,
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
            content="Thailand and Cambodia war.",
        )
        print(f"✅ Created message, ID: {message['id']}")

        # Create and process a run for the agent to handle the message
        run = agents_client.runs.create_and_process(
            thread_id=thread.id, agent_id=agent.id
        )
        print(f"Created run, ID: {run.id}")
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
            # Extract text content from MessageTextContent/MessageTextDetails objects
            content = message["content"]

            # Initialize text content
            text_content = ""

            if isinstance(content, list):
                # Handle list of content objects
                for item in content:
                    if hasattr(item, "text"):
                        text_content += str(item.text)
                    elif hasattr(item, "value"):
                        text_content += str(item.value)
                    elif isinstance(item, dict):
                        if "text" in item:
                            text_content += str(item["text"])
                        elif "value" in item:
                            text_content += str(item["value"])
                        else:
                            text_content += str(item)
                    else:
                        text_content += str(item)
            elif hasattr(content, "text"):
                # Handle single content object with text attribute
                text_content = str(content.text)
            elif hasattr(content, "value"):
                # Handle single content object with value attribute
                text_content = str(content.value)
            elif isinstance(content, str):
                # Already a string
                text_content = content
            else:
                # Convert any other type to string
                text_content = str(content)

            return [{"Role:": message["role"]}, {"Content:": text_content}]


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
        run = agents_client.runs.create_and_process(
            thread_id=thread.id, agent_id=agent.id
        )
        print(f"Created run, ID: {run.id}")
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
            # Extract text content from MessageTextContent/MessageTextDetails objects
            content = message["content"]

            # Initialize text content
            text_content = ""

            if isinstance(content, list):
                # Handle list of content objects
                for item in content:
                    if hasattr(item, "text"):
                        text_content += str(item.text)
                    elif hasattr(item, "value"):
                        text_content += str(item.value)
                    elif isinstance(item, dict):
                        if "text" in item:
                            text_content += str(item["text"])
                        elif "value" in item:
                            text_content += str(item["value"])
                        else:
                            text_content += str(item)
                    else:
                        text_content += str(item)
            elif hasattr(content, "text"):
                # Handle single content object with text attribute
                text_content = str(content.text)
            elif hasattr(content, "value"):
                # Handle single content object with value attribute
                text_content = str(content.value)
            elif isinstance(content, str):
                # Already a string
                text_content = content
            else:
                # Convert any other type to string
                text_content = str(content)

            return [{"Role:": message["role"]}, {"Content:": text_content}]


async def ai_analyze_excel_data(file_contents: bytes, filename: str) -> Dict[str, Any]:
    """
    Process Excel file and analyze data using AI for comprehensive business intelligence
    """
    try:
        # Convert Excel to JSON (all sheets)
        excel_data = {}
        
        # Read Excel file with all sheets
        excel_file = pd.read_excel(io.BytesIO(file_contents), sheet_name=None)
        
        # Convert each sheet to JSON
        for sheet_name, df in excel_file.items():
            # Convert DataFrame to JSON
            excel_data[sheet_name] = df.to_dict('records')
        
        # Prepare data summary for AI analysis
        data_summary = {
            "filename": filename,
            "sheets": list(excel_data.keys()),
            "total_sheets": len(excel_data),
            "data": excel_data
        }
        
        # Generate AI analysis
        analysis_result = await analyze_business_data_with_ai(data_summary)
        
        return {
            "excel_data": excel_data,
            "ai_analysis": analysis_result
        }
        
    except Exception as e:
        raise Exception(f"Error processing Excel data: {str(e)}")


async def analyze_business_data_with_ai(data_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use AI to analyze business data and provide comprehensive insights
    """
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

    # Create comprehensive analysis prompt with improved JSON requirements
    data_json = json.dumps(data_summary, indent=2, default=str)
    
    analysis_prompt = f"""
    You are an expert business intelligence analyst with advanced forecasting capabilities. Analyze the following Excel data and provide comprehensive insights with external factor analysis.

    Excel Data:
    {data_json}

    **ANALYSIS REQUIREMENTS:**

    1. **Advanced Sales Prediction & Forecasting**:
       - Analyze historical sales patterns and trends from the provided data
       - Create detailed future sales predictions for next 12 months (monthly breakdown)
       - Include confidence intervals and prediction ranges based on data volatility
       - Factor in seasonal variations and cyclical patterns evident in the data
       - Provide specific numerical forecasts with month names and years

    2. **External Factors Impact Analysis**:
       - **Economic Factors**: Search for current Thailand economic conditions, inflation rates, GDP growth, consumer spending trends
       - **Seasonal Patterns**: Analyze seasonal demand variations relevant to the business type
       - **Holiday Effects**: Thai holidays, festivals, cultural events affecting sales
       - **Market Conditions**: Supply chain disruptions, commodity prices, currency fluctuations in Thailand
       - **Industry Trends**: Technology changes, consumer behavior shifts, regulatory changes in Thailand
       - **Competitive Landscape**: Market analysis for the specific business sector

    3. **Data-Driven Predictions**:
       - Base forecasts on actual data patterns from the Excel file
       - Generate month-by-month sales forecasts for next 12 months with realistic numbers
       - Include best-case (+30% scenario), worst-case (-40% scenario), and most-likely scenarios
       - Provide prediction confidence levels decreasing over time (90% month 1 to 70% month 12)

    4. **Risk-Adjusted Analysis**:
       - Identify potential disruption events specific to Thailand market
       - Calculate probability-weighted forecasts based on current economic conditions
       - Include stress testing scenarios relevant to the business type
       - Provide actionable contingency planning recommendations

    5. **Strategic Recommendations**:
       - Promotion timing based on seasonal patterns in the data
       - Inventory management based on sales patterns and external factors
       - Market intelligence specific to Thailand business environment
       - Actionable insights with specific timelines and numerical targets

    **CRITICAL JSON FORMAT REQUIREMENTS:**
    - Respond ONLY with a valid JSON object - no markdown, no code blocks, no extra text
    - Use double quotes for all strings, never single quotes
    - Ensure all numbers are numeric values, not strings
    - Include realistic numerical values based on the actual data provided
    - Base monthly forecasts on actual sales trends from the Excel data
    """

    with agents_client:
        agent = agents_client.create_agent(
            model=os.environ["MODEL_DEPLOYMENT_NAME"],
            name="business-intelligence-agent",
            instructions="""You are an expert business intelligence analyst with web search capabilities.

            **CRITICAL JSON OUTPUT REQUIREMENTS:**
            1. ALWAYS respond with a valid JSON object - NO markdown formatting, NO code blocks, NO extra text
            2. Use ONLY double quotes for strings, NEVER single quotes
            3. Ensure all numerical values are numbers, not strings
            4. Base your analysis on the actual Excel data provided
            5. Use bing_grounding tool to gather current Thailand market data and trends
            6. Provide specific, actionable recommendations with realistic timelines
            7. Include supporting data and reasoning for all suggestions
            8. Always provide URL sources for your web search findings

            Return your business analysis as a valid JSON object following this EXACT structure:
            {{
              "sales_forecasting": {{
                "title": "Advanced Sales Prediction & Forecasting",
                "summary": "Data-driven summary of sales trends and predictions based on Excel data",
                "monthly_forecasts": [
                  {{
                    "month": "July 2025",
                    "most_likely": 35000,
                    "best_case": 45500,
                    "worst_case": 21000,
                    "confidence": 85
                  }},
                  {{
                    "month": "August 2025",
                    "most_likely": 33000,
                    "best_case": 42900,
                    "worst_case": 19800,
                    "confidence": 83
                  }}
                ],
                "key_insights": [
                  "Insight based on actual Excel data patterns",
                  "Trend analysis from historical sales data"
                ],
                "recommendations": [
                  "Actionable recommendation with specific timeline",
                  "Strategy with quantified expected impact"
                ]
              }},
              "external_factors": {{
                "title": "External Factors Impact Analysis",
                "summary": "Thailand market conditions and external factor analysis",
                "economic_conditions": {{
                  "current_status": "Description of current Thailand economic status",
                  "impact_percentage": 8,
                  "trend": "positive"
                }},
                "seasonal_patterns": {{
                  "current_season_impact": 15,
                  "peak_months": ["December", "January", "May"],
                  "low_months": ["July", "August", "September"]
                }},
                "geopolitical_risks": {{
                  "risk_level": "low",
                  "impact_description": "Specific impact description for Thailand market",
                  "mitigation_strategies": [
                    "Specific mitigation strategy 1",
                    "Specific mitigation strategy 2"
                  ]
                }},
                "market_trends": [
                  "Current Thailand market trend 1",
                  "Industry-specific trend 2"
                ]
              }},
              "risk_assessment": {{
                "title": "Risk-Adjusted Forecasting",
                "summary": "Comprehensive risk analysis based on Thailand market conditions",
                "risk_factors": [
                  {{
                    "factor": "Thailand Economic Volatility",
                    "probability": 25,
                    "impact": "medium",
                    "mitigation": "Specific mitigation strategy based on data"
                  }}
                ],
                "stress_scenarios": {{
                  "economic_downturn": {{
                    "probability": 20,
                    "impact_on_sales": -25,
                    "duration_months": 4
                  }}
                }}
              }},
              "promotion_strategy": {{
                "title": "Promotion & Marketing Strategy", 
                "summary": "Data-driven promotion timing and strategies",
                "recommended_promotions": [
                  {{
                    "product": "Product name from Excel data",
                    "discount_percentage": 15,
                    "timing": "Specific month based on data patterns",
                    "expected_impact": "+20% sales increase"
                  }}
                ],
                "seasonal_calendar": {{
                  "Q1": ["New Year promotions for Thailand market", "Valentine specials"],
                  "Q2": ["Songkran festival promotions", "Mother's Day campaigns"],
                  "Q3": ["Mid-year sales", "Back-to-school promotions"],
                  "Q4": ["Loy Krathong specials", "Year-end clearance"]
                }}
              }},
              "inventory_management": {{
                "title": "Stock Management with External Factors",
                "summary": "Inventory optimization based on sales patterns and Thailand market conditions",
                "stock_recommendations": [
                  {{
                    "product": "Product name from Excel data", 
                    "current_level": 50,
                    "recommended_level": 75,
                    "reason": "Specific reason based on data analysis"
                  }}
                ],
                "reorder_points": {{
                  "high_demand_products": 100,
                  "medium_demand_products": 50,
                  "low_demand_products": 20
                }}
              }},
              "market_intelligence": {{
                "title": "Market Intelligence & Trend Analysis",
                "summary": "Current Thailand market conditions and competitive landscape",
                "industry_trends": [
                  "Thailand-specific industry trend 1",
                  "Market-specific trend 2"
                ],
                "competitor_analysis": {{
                  "market_position": "Description based on web search data",
                  "competitive_advantages": ["Advantage 1", "Advantage 2"],
                  "threats": ["Specific threat 1", "Market challenge 2"]
                }},
                "consumer_behavior": [
                  "Thailand consumer behavior insight 1",
                  "Consumer trend 2"
                ],
                "technology_disruptions": [
                  "Relevant technology disruption 1",
                  "Innovation trend 2"
                ]
              }},
              "actionable_insights": {{
                "title": "Actionable Business Insights",
                "summary": "Data-driven KPIs and strategic recommendations",
                "kpis": [
                  {{
                    "metric": "Monthly Revenue Target",
                    "current": 85000,
                    "target": 95000,
                    "timeline": "Q3 2025"
                  }}
                ],
                "immediate_actions": [
                  {{
                    "action": "Specific action based on data analysis",
                    "deadline": "Within 2 weeks",
                    "expected_impact": "Quantified expected result"
                  }}
                ],
                "long_term_strategies": [
                  "6-month strategy based on data",
                  "Annual strategy with measurable goals"
                ]
              }},
              "data_sources": [
                "https://example.com/source1",
                "https://example.com/source2"
              ]
            }}

            **CRITICAL: Return ONLY the JSON object above with actual data-driven values. NO markdown formatting, NO code blocks, NO additional text.**
            """,
            tools=bing_tool.definitions,
        )

        # Create a communication thread
        thread = agents_client.threads.create()

        # Add user message with the analysis prompt
        message = agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=analysis_prompt,
        )

        # Create and process a run for the agent to handle the message
        run = agents_client.runs.create_and_process(
            thread_id=thread.id, agent_id=agent.id
        )

        # Get the analysis result with improved extraction
        messages = agents_client.messages.list(thread_id=thread.id)
        
        # Extract the AI response with better error handling
        ai_response = ""
        for message in messages:
            if message["role"] == "assistant":
                content = message["content"]
                if isinstance(content, list):
                    for item in content:
                        if hasattr(item, "text"):
                            ai_response += str(item.text)
                        elif hasattr(item, "value"):
                            ai_response += str(item.value)
                        elif isinstance(item, dict):
                            if "text" in item:
                                ai_response += str(item["text"])
                            elif "value" in item:
                                ai_response += str(item["value"])
                break

        # Clean up
        agents_client.delete_agent(agent.id)

        # Enhanced JSON validation and cleaning
        ai_response = validate_json_openai(ai_response)

        # Additional validation to ensure proper JSON format
        try:
            # Test if the response is valid JSON
            parsed_response = json.loads(ai_response)
            
            # Check if we have the nested structure with "value" field
            if isinstance(parsed_response, dict) and "value" in parsed_response:
                # Extract the actual analysis data from the "value" field
                actual_analysis = parsed_response["value"]
                if isinstance(actual_analysis, dict):
                    print("🔧 Extracted analysis data from nested 'value' structure")
                    ai_response = json.dumps(actual_analysis)
                    
        except json.JSONDecodeError as e:
            print(f"JSON validation failed: {e}")
            # Fallback to a more aggressive cleaning approach
            ai_response = validate_json_openai(ai_response)
            
            # Try once more to extract from nested structure
            try:
                parsed_response = json.loads(ai_response)
                if isinstance(parsed_response, dict) and "value" in parsed_response:
                    actual_analysis = parsed_response["value"]
                    if isinstance(actual_analysis, dict):
                        ai_response = json.dumps(actual_analysis)
            except:
                print("⚠️ Unable to extract from nested structure, using response as-is")

        return {
            "analysis_response": ai_response,
            "data_processed": {
                "sheets_analyzed": data_summary["sheets"],
                "total_sheets": data_summary["total_sheets"],
                "filename": data_summary["filename"]
            }
        }

def validate_json_openai(json_data: str):
    endpoint = "https://tanakrit-mae-7711-resource.cognitiveservices.azure.com/"
    model_name = "gpt-4.1-mini"
    deployment = "gpt-4.1-mini"
    token_provider = get_bearer_token_provider(DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default")
    api_version = "2024-12-01-preview"

    client = AzureOpenAI(
        api_version=api_version,
        azure_endpoint=endpoint,
        azure_ad_token_provider=token_provider,
    )

    # Pre-process the input to handle common issues
    cleaned_input = json_data.strip()
    
    # Check if the entire JSON is wrapped in quotes (making it a string)
    if cleaned_input.startswith('"') and cleaned_input.endswith('"'):
        try:
            # Remove the outer quotes and unescape any escaped quotes inside
            cleaned_input = cleaned_input[1:-1]  # Remove outer quotes
            cleaned_input = cleaned_input.replace('\\"', '"')  # Unescape internal quotes
            cleaned_input = cleaned_input.replace('\\\\', '\\')  # Unescape backslashes
            print("🔧 Removed outer quotes from JSON string")
        except Exception as e:
            print(f"⚠️ Error removing outer quotes: {e}")
    
    # Remove common markdown formatting if present
    if cleaned_input.startswith("```json"):
        cleaned_input = cleaned_input.replace("```json", "").replace("```", "").strip()
    elif cleaned_input.startswith("```"):
        cleaned_input = cleaned_input.replace("```", "").strip()
    
    # Remove any leading/trailing non-JSON text
    start_brace = cleaned_input.find('{')
    end_brace = cleaned_input.rfind('}')
    if start_brace != -1 and end_brace != -1:
        cleaned_input = cleaned_input[start_brace:end_brace+1]

    # Try to parse the cleaned input first before sending to AI
    try:
        test_parse = json.loads(cleaned_input)
        print("✅ Input is already valid JSON, skipping AI validation")
        return cleaned_input
    except json.JSONDecodeError:
        print("🔄 Input needs AI validation and cleaning")

    response = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": """You are a JSON validation and cleaning expert. Your task is to ensure the output is ONLY a valid JSON object.

**CRITICAL REQUIREMENTS:**
1. Output ONLY valid JSON - no markdown, no code blocks, no explanatory text, no backslash, NO OUTER QUOTES
2. Do NOT wrap the JSON object in quotes - return the raw JSON object directly
3. Convert any Python dictionary format (single quotes) to JSON format (double quotes)
4. Replace Python literals: True → true, False → false, None → null
5. Remove any control characters that would break JSON parsing
6. Ensure all string values are properly escaped with double quotes
7. Ensure all numerical values are numbers, not strings
8. Remove any newlines or formatting that breaks JSON structure
9. If the input contains multiple JSON objects, return only the first complete one
10. Fix any malformed JSON syntax issues
11. Make sure all data is preserved and not truncated

**VALIDATION STEPS:**
- Extract JSON content from any surrounding text
- Convert Python dict format to JSON format
- Clean control characters and escape sequences
- Validate proper quote usage (double quotes only)
- Ensure proper bracket/brace matching
- Test JSON.parse compatibility
- NEVER wrap the result in outer quotes

Return ONLY the cleaned, valid JSON object - NOT as a string.""",
            },
            {
                "role": "user",
                "content": f"Clean and validate this JSON data (return raw JSON object, not as string):\n\n{cleaned_input}",
            }
        ],
        max_completion_tokens=30000,
        temperature=0.0,  # Zero temperature for most consistent output
        top_p=0.9,
        frequency_penalty=0.0,
        presence_penalty=0.0,
        model=deployment
    )

    validated_response = response.choices[0].message.content.strip()
    
    # Check again if the AI wrapped the response in quotes
    if validated_response.startswith('"') and validated_response.endswith('"'):
        try:
            # Remove the outer quotes and unescape
            validated_response = validated_response[1:-1]
            validated_response = validated_response.replace('\\"', '"')
            validated_response = validated_response.replace('\\\\', '\\')
            print("🔧 Removed AI-added outer quotes")
        except Exception as e:
            print(f"⚠️ Error removing AI-added quotes: {e}")
    
    # Additional post-processing to ensure clean JSON
    if validated_response.startswith("```json"):
        validated_response = validated_response.replace("```json", "").replace("```", "").strip()
    elif validated_response.startswith("```"):
        validated_response = validated_response.replace("```", "").strip()
    
    # Extract JSON object if there's surrounding text
    start_brace = validated_response.find('{')
    end_brace = validated_response.rfind('}')
    if start_brace != -1 and end_brace != -1:
        validated_response = validated_response[start_brace:end_brace+1]
    
    # Final validation attempt
    try:
        # Test if the response is valid JSON
        json.loads(validated_response)
        print("✅ JSON validation successful")
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON validation warning: {e}")
        # Apply emergency cleaning if still invalid
        validated_response = emergency_json_clean(validated_response)
    
    print(f"📄 Final JSON response length: {len(validated_response)} characters")
    return validated_response


def emergency_json_clean(json_str: str) -> str:
    """Emergency JSON cleaning function for badly formatted responses"""
    try:
        cleaned = json_str.strip()
        
        # Handle case where entire JSON is wrapped in quotes
        if cleaned.startswith('"') and cleaned.endswith('"'):
            try:
                cleaned = cleaned[1:-1]  # Remove outer quotes
                cleaned = cleaned.replace('\\"', '"')  # Unescape internal quotes
                cleaned = cleaned.replace('\\\\', '\\')  # Unescape backslashes
                print("🔧 Emergency: Removed outer quotes")
            except Exception as e:
                print(f"⚠️ Emergency: Error removing quotes: {e}")
        
        # Remove control characters (but keep basic whitespace)
        cleaned = ''.join(char for char in cleaned if ord(char) >= 32 or char in '\n\r\t')
        
        # Fix common Python to JSON conversions
        cleaned = cleaned.replace("'", '"')
        cleaned = cleaned.replace('True', 'true')
        cleaned = cleaned.replace('False', 'false')
        cleaned = cleaned.replace('None', 'null')
        
        # Handle problematic escape sequences more carefully
        # First, fix double escaping
        cleaned = cleaned.replace('\\\\', '\\')
        # Then fix escaped quotes that break JSON
        cleaned = cleaned.replace('\\"', '"')
        # Remove line breaks that break JSON structure
        cleaned = cleaned.replace('\\n', ' ')
        cleaned = cleaned.replace('\\r', ' ')
        cleaned = cleaned.replace('\\t', ' ')
        
        # Ensure proper JSON structure
        if not cleaned.strip().startswith('{'):
            start = cleaned.find('{')
            if start != -1:
                cleaned = cleaned[start:]
        
        if not cleaned.strip().endswith('}'):
            end = cleaned.rfind('}')
            if end != -1:
                cleaned = cleaned[:end+1]
        
        # Test the cleaned JSON
        parsed = json.loads(cleaned)
        
        # Check if we have the nested structure with "value" field
        if isinstance(parsed, dict) and "value" in parsed:
            # Extract the actual analysis data from the "value" field
            actual_data = parsed["value"]
            if isinstance(actual_data, dict):
                print("🔧 Emergency: Extracted data from 'value' field")
                return json.dumps(actual_data)
        
        return cleaned
        
    except Exception as e:
        print(f"❌ Emergency cleaning failed: {e}")
        # Try one more approach - extract JSON from the middle of the string
        try:
            start = json_str.find('{"')
            end = json_str.rfind('"}') + 2
            if start != -1 and end > start:
                extracted = json_str[start:end]
                # Clean and test
                extracted = extracted.replace('\\"', '"').replace('\\\\', '\\')
                parsed = json.loads(extracted)
                return json.dumps(parsed)
        except:
            pass
        
        # Return minimal valid JSON as last resort
        return '{"error": "JSON parsing failed", "message": "Unable to parse AI response"}'