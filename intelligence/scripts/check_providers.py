"""
Pre-demo / post-deploy key check: one small real call per outside provider, so a dead,
exhausted or mistyped key shows up here instead of in front of a client.

  cd intelligence && /Users/bhavya_040/map-companies/venv/bin/python -m scripts.check_providers

Costs about 1 Places call, 1 short LLM call, 1 Serper search and 1-2 Apollo calls.
Never prints a key. Exit code 1 if a provider the pipeline needs (Places, LLM, Serper) fails.
"""

import sys
import time

import requests

from app.config import get_settings

results: list[tuple[str, bool, bool, str]] = []  # name, ok, required, detail


def record(name: str, ok: bool, required: bool, detail: str) -> None:
    results.append((name, ok, required, detail))
    tag = "PASS" if ok else ("FAIL" if required else "WARN")
    print(f"  {tag:4}  {name:<22} {detail}")


def check_places(settings) -> None:
    from discovery.places_api import search_nearby_companies

    if not settings.places_api:
        record("Google Places", False, True, "PLACES_API is not set")
        return
    try:
        t = time.time()
        found = search_nearby_companies(21.4779173, 72.7234733, 2000, settings.places_api, max_results=3)
        record("Google Places", True, True, f"{len(found)} places near Olpad in {time.time() - t:.1f}s")
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else "?"
        hint = {403: "key rejected: check the Places API (New) is enabled, billing is on and the key's restrictions",
                429: "quota exhausted / rate limited"}.get(code, "")
        record("Google Places", False, True, f"HTTP {code} {hint}".strip())
    except Exception as e:  # noqa: BLE001
        record("Google Places", False, True, f"{type(e).__name__}: {e}"[:160])


def check_llm(settings) -> None:
    from agents.factory import build_llm_provider

    name = f"LLM ({settings.llm_provider})"
    try:
        provider = build_llm_provider(settings, tier="bulk")
        spec = {
            "name": "submit_result",
            "description": "Submit the answer.",
            "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]},
        }
        t = time.time()
        res = provider.chat(
            system="You are a connectivity check. Call submit_result with answer 'ok'.",
            messages=[{"role": "user", "content": "ping"}],
            tool_specs=[spec],
            force_tool="submit_result",
        )
        ok = bool(res.tool_calls) and res.tool_calls[0].name == "submit_result"
        model = getattr(provider, "model", None) or getattr(provider, "model_id", "")
        record(name, ok, True, f"{model} tool call {'ok' if ok else 'missing'} in {time.time() - t:.1f}s")
    except Exception as e:  # noqa: BLE001
        record(name, False, True, f"{type(e).__name__}: {e}"[:160])


def check_serper(settings) -> None:
    if not settings.serper_api_key:
        record("Serper (web search)", False, True, "SERPER_API_KEY is not set: signals/revenue research would find nothing")
        return
    try:
        r = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"},
            json={"q": "warehouse leasing Surat", "num": 1},
            timeout=20,
        )
        if r.ok:
            record("Serper (web search)", True, True, f"{len(r.json().get('organic', []))} result(s)")
        else:
            record("Serper (web search)", False, True, f"HTTP {r.status_code} (401/403 = bad key, 429/400 = out of credits)")
    except Exception as e:  # noqa: BLE001
        record("Serper (web search)", False, True, f"{type(e).__name__}: {e}"[:160])


def check_apollo(settings) -> None:
    from agents.enrichment.apollo_client import ApolloApiError, ApolloClient

    if not settings.apollo_api_key:
        record("Apollo", False, False, "APOLLO_API_KEY not set: key people are added by hand")
        return
    client = ApolloClient(settings.apollo_api_key)
    try:
        org = client.enrich_organization("tatasteel.com")
        record("Apollo org enrichment", bool(org), False, "ok" if org else "no organization returned")
    except ApolloApiError as e:
        record("Apollo org enrichment", False, False, f"HTTP {e.status_code}")
    try:
        people = client.search_people("tatasteel.com", per_page=1)
        record("Apollo people search", True, False, f"ok ({len(people)} result) - contacts can be found automatically")
    except ApolloApiError as e:
        detail = "plan doesn't include People Search (free tier) - add key people by hand" if e.status_code == 403 else f"HTTP {e.status_code}"
        record("Apollo people search", False, False, detail)


def main() -> int:
    settings = get_settings()
    if settings.fake_providers:
        print("  NOTE  FAKE_PROVIDERS=true is set: the running service would use fakes, but this check tests the real keys.")
    print(f"Checking providers (environment={settings.environment})\n")
    check_places(settings)
    check_llm(settings)
    check_serper(settings)
    check_apollo(settings)
    failed = [n for n, ok, req, _ in results if req and not ok]
    print("\nReady for a live run." if not failed else f"\nNot ready: fix {', '.join(failed)}.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
