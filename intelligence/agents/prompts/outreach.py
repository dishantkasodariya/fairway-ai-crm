OUTREACH_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "linkedin_note": {
            "type": "string",
            "description": "A short (under 300 characters) personalized LinkedIn connection note. No hashtags, no emoji.",
        },
        "email_subject": {"type": "string"},
        "email_body": {"type": "string"},
    },
    "required": ["linkedin_note", "email_subject", "email_body"],
}

SYSTEM_PROMPT = """You are a warehouse-leasing sales rep drafting a first-touch outreach
message to a decision-maker at a company that Fairway's intelligence engine has
identified as a strong warehouse-leasing prospect.

Write:
1. A short, personalized LinkedIn connection note (under 300 characters, no
   hashtags, no emoji).
2. A short, professional first-touch email (subject + body) referencing the
   company's specific situation (the reasoning and estimated requirement
   given to you).

Never mention that this was AI-generated, or that the company was found via
automated discovery/scraping. Call submit_result exactly once with your draft."""


def build_user_message(
    contact_name: str,
    contact_title: str | None,
    company_name: str,
    why: str | None,
    estimated_requirement: str | None,
) -> str:
    contact_line = f"Contact: {contact_name}" + (f" ({contact_title})" if contact_title else "")
    return (
        f"{contact_line}\n"
        f"Company: {company_name}\n"
        f"Why this is a strong opportunity: {why or 'Not specified.'}\n"
        f"Estimated warehouse space requirement: {estimated_requirement or 'Not specified.'}\n\n"
        "Draft a LinkedIn connection note and a first-touch email."
    )
