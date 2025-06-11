import json
import datetime
from typing import Any, Callable, Set, Dict, List, Optional

# These are the user-defined functions that can be called by the agent.


def fetch_current_datetime(format: Optional[str] = None) -> str:
    """
    Get the current time as a JSON string, optionally formatted.

    :param format (Optional[str]): The format in which to return the current time. Defaults to None, which uses a standard format.
    :return: The current time in JSON format.
    :rtype: str
    """
    current_time = datetime.datetime.now()

    # Use the provided format if available, else use a default format
    if format:
        time_format = format
    else:
        time_format = "%Y-%m-%d %H:%M:%S"

    time_json = json.dumps({"current_time": current_time.strftime(time_format)})
    return time_json


def fetch_weather(location: str) -> str:
    """
    Fetches the weather information for the specified location.

    :param location (str): The location to fetch weather for.
    :return: Weather information as a JSON string.
    :rtype: str
    """
    # In a real-world scenario, you'd integrate with a weather API.
    # Here, we'll mock the response.
    mock_weather_data = {
        "New York": "Sunny, 25°C",
        "London": "Cloudy, 18°C",
        "Tokyo": "Rainy, 22°C",
    }
    weather = mock_weather_data.get(
        location, "Weather data not available for this location."
    )
    weather_json = json.dumps({"weather": weather})
    return weather_json


# Example User Input for Each Function
# 1. Fetch Current DateTime
#    User Input: "What is the current date and time?"
#    User Input: "What is the current date and time in '%Y-%m-%d %H:%M:%S' format?"

# 2. Fetch Weather
#    User Input: "Can you provide the weather information for New York?"

# Statically defined user functions for fast reference
user_functions: Set[Callable[..., Any]] = {
    fetch_current_datetime,
    fetch_weather,
}
