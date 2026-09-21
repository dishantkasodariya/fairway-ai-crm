import requests
from bs4 import BeautifulSoup

from agents.tools.base import Tool


class PageFetchTool(Tool):
    name = "fetch_page"
    description = "Fetch a URL and return its visible text content, so you can read past a search snippet."
    parameters = {
        "type": "object",
        "properties": {"url": {"type": "string", "description": "URL to fetch"}},
        "required": ["url"],
    }

    def __init__(self, max_chars: int = 4000):
        self.max_chars = max_chars

    def run(self, url: str) -> str:
        try:
            resp = requests.get(
                url,
                timeout=15,
                headers={"User-Agent": "Mozilla/5.0 (compatible; FairwayResearchBot/1.0)"},
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            return f"Error fetching {url}: {e}"

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = " ".join(soup.get_text(separator=" ").split())
        return text[: self.max_chars]
