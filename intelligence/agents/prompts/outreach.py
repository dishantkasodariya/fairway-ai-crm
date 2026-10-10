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

Fairway leases ready warehouse space in Gujarat (Surat-Olpad-Bharuch corridor). You
are offering warehouse space and leasing terms, not software: never describe Fairway as
a platform, tool or "intelligence" product.

Write:
1. A short, personalized LinkedIn connection note (under 300 characters, no
   hashtags, no emoji).
2. A short, professional first-touch email (subject + body) referencing the
   company's specific situation (the reasoning and estimated requirement
   given to you).

Sign the email off with the sender's name, title and "Fairway" as given to you. Never
write placeholders such as [Your Name], [Phone], [Company] or [Date]: if a detail isn't
given, leave it out. The message goes out as written.

Never mention that this was AI-generated, or that the company was found via
automated discovery/scraping. Call submit_result exactly once with your draft."""


def build_user_message(
    contact_name: str,
    contact_title: str | None,
    company_name: str,
    why: str | None,
    estimated_requirement: str | None,
    sender_name: str | None = None,
    sender_title: str | None = None,
) -> str:
    contact_line = f"Contact: {contact_name}" + (f" ({contact_title})" if contact_title else "")
    sender_line = f"Sender: {sender_name or 'the Fairway leasing team'}" + (f", {sender_title}" if sender_title else "") + ", Fairway"
    return (
        f"{sender_line}\n"
        f"{contact_line}\n"
        f"Company: {company_name}\n"
        f"Why this is a strong opportunity: {why or 'Not specified.'}\n"
        f"Estimated warehouse space requirement: {estimated_requirement or 'Not specified.'}\n\n"
        "Draft a LinkedIn connection note and a first-touch email."
    )
