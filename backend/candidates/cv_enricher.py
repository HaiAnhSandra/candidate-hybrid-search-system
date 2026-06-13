import json
from dataclasses import dataclass, field

from anthropic import AsyncAnthropic

from core.config import settings


@dataclass
class EnrichmentResult:
    """Claude Sonnet enrichment result - all nullable."""

    seniority_level: int | None = None
    job_titles_canonical: list[str] = field(default_factory=list)
    business_domains: list[str] = field(default_factory=list)
    technical_domains: list[str] = field(default_factory=list)
    certifications: list[str] = field(default_factory=list)
    skills_primary: list[str] = field(default_factory=list)
    skills_secondary: list[str] = field(default_factory=list)
    skills_exposure: list[str] = field(default_factory=list)

    holistic_summary_text: str | None = None
    career_trajectory_text: str | None = None
    experience_block_text: str | None = None


ENRICHMENT_PROMPT = """
You are a CV parsing assistant for an IT recruitment system.

Given structured data extracted from a CV, your job is to:
1. Classify seniority level
2. Identify business and technical domains
3. Canonicalize and validate skills
4. Clean up certifications
5. Generate three text fields for semantic search

Return ONLY valid JSON - no markdown, no preamble.

Schema:
{
  "seniority_level": integer 0-5 or null,
  "job_titles_canonical": [string],
  "business_domains": [string],
  "technical_domains": [string],
  "certifications": [string],
  "skills_primary": [string],
  "skills_secondary": [string],
  "skills_exposure": [string],
  "holistic_summary_text": string or null,
  "career_trajectory_text": string or null,
  "experience_block_text": string or null
}

SENIORITY MAPPING:
  0 = Fresher/Intern (0-1 years)
  1 = Junior (1-2 years)
  2 = Mid (2-4 years)
  3 = Senior (4-7 years)
  4 = Lead/Tech Lead (7-10 years)
  5 = Principal/Expert/Staff (10+ years)

SKILL CANONICALIZATION:
  "ReactJS" -> "React"
  "NodeJS" -> "Node.js"
  "Postgres" -> "PostgreSQL"
  "golang" -> "Go"
  "ML" -> "Machine Learning"

SKILL TIERS — strict limits:
  skills_primary: max 4 items — daily-use core technologies only
  skills_secondary: max 3 items — supporting tools used regularly  
  skills_exposure: max 3 items — basic familiarity only
  
  Total max 10 skills across all tiers.
  Be selective — only the most important skills per tier.

BUSINESS DOMAINS — extract up to 5 clearly evidenced domains:
  Look at ALL projects in the CV not just the most recent ones.
  Scan every project description for domain indicators.
  
  Prefer these canonical strings:
  FinTech, Banking, E-commerce, Healthcare, Logistics,
  Insurance, SaaS, Gaming, Media, EdTech, Telecommunications,
  Enterprise, Retail, Manufacturing, Government, AI, Reservation, CMS
  
  If none match exactly use a short descriptive string.
  Maximum 5 — prioritize most recent and most prominent.
  Never fabricate — only extract what is explicitly in the CV.

TECHNICAL DOMAINS (use these exact strings):
  Backend Engineering, Frontend Engineering, Fullstack,
  Mobile, DevOps & CI/CD, Data Engineering, Machine Learning & AI,
  Distributed Systems, QA & Testing, Security, Cloud Infrastructure
If none match, use a short Title Case descriptive string.

holistic_summary_text:
  Template:
  [Seniority] [Current Title] with [X] years of experience, primarily in 
  [top 2–3 business domains]. Core technical expertise in [top 5 skills]. 
  Has [developed/built/scaled/optimized/maintained/etc.] [3-5 representative works - can include metrics as achievements].
  [Leadership scope: led N engineers / formulated strategic plans / mentored a team of N / etc.].
  Rule:
- Representative works capped at 3–5 — most impressive or most recent only
- Skills capped at 5 — the skills arrays handle full coverage
- Exclude Leadership role if not expressed specifically in the CV or if the candidate is a junior IC.

career_trajectory_text:
  Template:
  Consistently specialized in [backend engineering / DevOps / frontend /
  data engineering / mobile / QA], working primarily as [Job Title 1]
  and [Job Title 2].
  OR (if trajectory is diverse or cross-domain):
  Career trajectory from [earliest technical domain / title] toward
  [current technical domain / title], having held roles as [Title 1],
  [Title 2], and currently [Title 3].
  Rule:
  - Use "Consistently specialized" when all or most roles share one technical
  domain — e.g. all backend, all DevOps
  - Use "Career trajectory from X toward Y" when the candidate has meaningfully
  changed domain — e.g. from mobile to fullstack, from IC to engineering manager
  - Never use both forms in the same text — pick one per candidate
  - Can add more Job Titles if it helps clarify trajectory, but keep it concise, NO repeated phrases and not list Intern Role.

experience_block_text:
  IMPORTANT:   Include all recent and/or dominant, impressive roles/projects.
  Most recent first. ONLY Skip roles older than 7 years unless they show significant career transition.
  For EACH role write a structured block:
  [Job Title] at [Business Domain] Project
  Technical Capabilities: [systems like "Recommendation Engine", "Payment Gateway", 
  "Real-time Pipeline", "Search Engine", "Chat System"]
  Responsibilities: [3-5 core actions — verb + object, no metrics].
  Technologies: [primary tools first, max 5].
  Methodologies: [max 3: Microservices / Event-driven / Agile / etc.].
  Rule:
  - Separate roles with double newline.
  - If technologies are not listed or technical capabilities are not explicitly specified, omit it.

IMPORTANT: If any field cannot be determined from the data, return null for that field. Never fabricate information.
""".strip()


async def enrich_with_claude(
    raw_text: str,
    ner_result,
    skills_result,
    form_data: dict,
  sections=None,
) -> EnrichmentResult:
    """Send extracted CV data to Claude Sonnet for enrichment.
    Returns EnrichmentResult with all available fields populated.
    """

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    user_content = f"""
CV RAW TEXT:
{raw_text[:7000]}

EXTRACTED DATA FROM PREVIOUS LAYERS:
Name: {ner_result.first_name} {ner_result.last_name}
Location: {ner_result.location_city}
Years of Experience (calculated from dates): {ner_result.years_of_experience}
Degree: {ner_result.degree_field_raw} (level: {ner_result.degree_level})

Skills found by SkillNER:
  Primary candidates: {skills_result.skills_primary}
  Secondary candidates: {skills_result.skills_secondary}
  Exposure candidates: {skills_result.skills_exposure}

Raw certifications: {skills_result.certifications_raw}

EXPERIENCE SECTION (complete - include ALL roles):
{sections.experience_section if sections else 'Not provided'}

Form data provided by uploader:
  Full name override: {form_data.get('full_name', 'not provided')}
  Source: {form_data.get('source', 'not provided')}

Please enrich this data and generate the required fields.
If information is missing or unclear return null for that field.
"""
    print(f"CV Enricher: sending {len(user_content)} chars to Claude")
    result = EnrichmentResult()

    try:
        response = await client.messages.create(
            model=settings.LLM_MODEL_PARSE,
            system=ENRICHMENT_PROMPT,
            max_tokens=6000,
            temperature=0,
            messages=[{"role": "user", "content": user_content}],
        )
        print(f"CV Enricher: input_tokens={response.usage.input_tokens}, output_tokens={response.usage.output_tokens}")

        content = response.content[0].text if response.content else ""
        clean = (
            content.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )

        data = json.loads(clean)

        result.seniority_level = data.get("seniority_level")
        result.job_titles_canonical = data.get("job_titles_canonical") or []
        result.business_domains = data.get("business_domains") or []
        result.technical_domains = data.get("technical_domains") or []
        result.certifications = data.get("certifications") or []
        result.skills_primary = data.get("skills_primary") or []
        result.skills_secondary = data.get("skills_secondary") or []
        result.skills_exposure = data.get("skills_exposure") or []
        result.holistic_summary_text = data.get("holistic_summary_text")
        result.career_trajectory_text = data.get("career_trajectory_text")
        result.experience_block_text = data.get("experience_block_text")

    except Exception as exc:
        print(f"CV enrichment error: {exc}")

    return result
