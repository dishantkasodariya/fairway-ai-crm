"""
SearchTool is the protocol every web-search backend implements. Serper is
the current implementation (real Google SERP results, ~$1/1,000 queries);
Google's own Custom Search JSON API can drop in later as a second
implementation of the same protocol — swapping is a config change in
agents/*_agent.py, not a rewrite.
"""

import requests

from agents.tools.base import Tool


class SearchTool(Tool):
    name = "web_search"
    description = "Search the web and return the top results (title, url, snippet) for a query."
    parameters = {
        "type": "object",
        "properties": {"query": {"type": "string", "description": "Search query"}},
        "required": ["query"],
    }


class SerperSearchTool(SearchTool):
    URL = "https://google.serper.dev/search"

    def __init__(self, api_key: str, num_results: int = 8):
        self.api_key = api_key
        self.num_results = num_results

    def run(self, query: str) -> str:
        if not self.api_key:
            return (
                "web_search is not configured (no SERPER_API_KEY set) — you cannot search right "
                "now. Submit your best result with empty signals rather than retrying this tool."
            )
        try:
            resp = requests.post(
                self.URL,
                headers={"X-API-KEY": self.api_key, "Content-Type": "application/json"},
                json={"q": query, "num": self.num_results},
                timeout=20,
            )
            if resp.status_code in (401, 403):
                return (
                    "web_search failed: the configured SERPER_API_KEY was rejected (401/403). "
                    "This will not succeed on retry — submit your best result with empty signals."
                )
            resp.raise_for_status()
        except requests.RequestException as e:
            return f"Search error for '{query}': {e}"

        data = resp.json()
        lines = []
        for item in data.get("organic", [])[: self.num_results]:
            lines.append(f"- {item.get('title')}\n  {item.get('link')}\n  {item.get('snippet', '')}")
        for item in (data.get("news") or [])[:5]:
            lines.append(
                f"- [news] {item.get('title')} ({item.get('date', '')})\n"
                f"  {item.get('link')}\n  {item.get('snippet', '')}"
            )
        return "\n".join(lines) if lines else "No results found."
