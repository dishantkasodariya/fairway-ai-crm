"""
Plain REST wrapper against Apollo.io - same plain-HTTP style as the rest of
this codebase's tools (no dedicated SDK). People Search/Match require a paid
Apollo plan; Organization Enrichment works on the Free tier (verified live
2026-09-26 against the configured key: Org Enrichment 200s, People Match
403s with error_code=API_INACCESSIBLE).
"""

import requests

APOLLO_BASE_URL = "https://api.apollo.io/api/v1"

DECISION_MAKER_TITLES = [
    "VP Supply Chain",
    "Head of Supply Chain",
    "Director of Operations",
    "VP Operations",
    "Head of Procurement",
    "Facilities Manager",
    "Logistics Manager",
]


class ApolloApiError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


class ApolloClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def _headers(self) -> dict:
        return {"Content-Type": "application/json", "x-api-key": self.api_key}

    def search_people(
        self,
        organization_domain: str,
        titles: list[str] | None = None,
        per_page: int = 10,
    ) -> list[dict]:
        """Apollo People Search - finds decision-makers at a company by domain.
        Requires a paid Apollo plan; raises ApolloApiError(403) on Free tier."""
        payload = {
            "q_organization_domains_list": [organization_domain] if organization_domain else [],
            "person_titles": titles or DECISION_MAKER_TITLES,
            "per_page": per_page,
        }
        response = requests.post(
            f"{APOLLO_BASE_URL}/mixed_people/search", json=payload, headers=self._headers(), timeout=20
        )
        if not response.ok:
            raise ApolloApiError(response.status_code, response.text)
        return response.json().get("people", [])

    def enrich_organization(self, domain: str) -> dict | None:
        """Apollo Organization Enrichment - works on the Free tier."""
        response = requests.get(
            f"{APOLLO_BASE_URL}/organizations/enrich", params={"domain": domain}, headers=self._headers(), timeout=20
        )
        if not response.ok:
            raise ApolloApiError(response.status_code, response.text)
        return response.json().get("organization")
