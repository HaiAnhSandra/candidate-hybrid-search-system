from dataclasses import dataclass, field

from candidates.cv_enricher import enrich_with_claude
from candidates.cv_extractor import extract_text, segment_sections
from candidates.cv_ner import run_ner
from candidates.cv_skills import run_skill_extraction
from core.embedder import embed


@dataclass
class ParsedCandidate:
    """Final parsed candidate ready for database insertion.
    All fields nullable - whatever could be extracted.
    """

    first_name: str | None = None
    last_name: str | None = None

    location_city: str | None = None
    years_of_experience: int | None = None
    seniority_level: int | None = None
    salary_expectation_min: int | None = None
    salary_expectation_max: int | None = None
    degree_level: int | None = None
    is_technical_degree: bool | None = None
    availability_status: str = "available"
    degree_field_raw: str | None = None

    skills_primary: list[str] = field(default_factory=list)
    skills_secondary: list[str] = field(default_factory=list)
    skills_exposure: list[str] = field(default_factory=list)
    job_titles_canonical: list[str] = field(default_factory=list)
    certifications: list[str] = field(default_factory=list)
    business_domains: list[str] = field(default_factory=list)
    technical_domains: list[str] = field(default_factory=list)

    holistic_summary_text: str | None = None
    career_trajectory_text: str | None = None
    experience_block_text: str | None = None
    raw_text: str | None = None

    holistic_vector: list[float] | None = None
    career_trajectory_vector: list[float] | None = None
    experience_vector: list[float] | None = None

def clean_certifications(certifications: list[str]) -> list[str]:
    """Clean noisy certification extraction results."""
    if not certifications:
        return []

    cleaned = []
    seen = set()

    noise_fragments = [
        "river certified",
        "ained certification",
        "real project applications",
        "completed with udemy",
        "obtained certification",
        "software testing qualifications board",
        "test automation, advanced frameworks",
    ]

    for cert in certifications:
        if not cert:
            continue

        text = str(cert).replace("\x00", "").strip()
        text_lower = text.lower()

        if not text:
            continue

        if any(fragment in text_lower for fragment in noise_fragments):
            continue

        # Normalize known certifications
        if "certified tester foundation" in text_lower or "ctfl" in text_lower:
            normalized = "Certified Tester Foundation Level (CTFL) - ISTQB"
        elif "advanced selenium webdriver" in text_lower or (
            "selenium" in text_lower and "udemy" in text_lower
        ):
            normalized = "Advanced Selenium WebDriver - Udemy"
        else:
            normalized = text

        key = normalized.lower()
        if key not in seen:
            cleaned.append(normalized)
            seen.add(key)

    return cleaned

async def parse_cv(
    file_bytes: bytes,
    filename: str,
    form_data: dict,
    generate_embeddings: bool = True,
) -> ParsedCandidate:
    """
    Main CV parsing pipeline.    
    Runs all 6 layers in sequence.
    Returns ParsedCandidate with whatever could be extracted.
    Any field that cannot be extracted remains None.
    """
    result = ParsedCandidate()

    if form_data.get("full_name"):
        parts = form_data["full_name"].strip().split(" ", 1)
        result.first_name = parts[0]
        result.last_name = parts[1] if len(parts) > 1 else None

    print("CV Parser: Layer 1 - Extracting text...")
    raw_text = extract_text(file_bytes, filename)
    result.raw_text = raw_text
    if not raw_text:
        print("CV Parser: Failed to extract text from file")
        return result
    print(f"CV Parser Layer 1: extracted {len(raw_text)} chars")
    print(f"CV Parser Layer 1 preview: {raw_text[:200]}")

    print("CV Parser: Layer 1b - Segmenting sections...")
    sections = segment_sections(raw_text)
    print("CV Parser Layer 1b sections found:")
    print(f"  contact: {len(sections.contact_section or '')} chars")
    print(f"  experience: {len(sections.experience_section or '')} chars")
    print(f"  education: {len(sections.education_section or '')} chars")
    print(f"  skills: {len(sections.skills_section or '')} chars")
    print(f"  certifications: {len(sections.certifications_section or '')} chars")

    print("CV Parser: Layer 2 - Running spaCy NER...")
    ner_result = run_ner(sections)
    print(f"CV Parser Layer 2 NER result: {ner_result}")

    if not result.first_name and ner_result.first_name:
        result.first_name = ner_result.first_name
    if not result.last_name and ner_result.last_name:
        result.last_name = ner_result.last_name

    result.location_city = ner_result.location_city
    result.years_of_experience = ner_result.years_of_experience
    result.degree_level = ner_result.degree_level
    result.is_technical_degree = ner_result.is_technical_degree
    result.degree_field_raw = ner_result.degree_field_raw

    print("CV Parser: Layer 3 - Running skill extraction...")
    skills_result = run_skill_extraction(sections)
    print(f"CV Parser Layer 3 skills: {skills_result}")

    print("CV Parser: Layer 5 - Claude Sonnet enrichment...")
    enrichment = await enrich_with_claude(
        raw_text, ner_result, skills_result, form_data, sections=sections
    )
    print("CV Parser Layer 5 enrichment:")
    print(f"  seniority: {enrichment.seniority_level}")
    print(f"  job_titles: {enrichment.job_titles_canonical}")
    print(f"  skills_primary: {enrichment.skills_primary}")
    print(f"  has_summary: {bool(enrichment.holistic_summary_text)}")
    print(f"  has_trajectory: {bool(enrichment.career_trajectory_text)}")
    print(f"  has_experience: {bool(enrichment.experience_block_text)}")

    if enrichment.skills_primary:
        result.skills_primary = enrichment.skills_primary
    elif skills_result.skills_primary:
        result.skills_primary = skills_result.skills_primary

    if enrichment.skills_secondary:
        result.skills_secondary = enrichment.skills_secondary
    elif skills_result.skills_secondary:
        result.skills_secondary = skills_result.skills_secondary

    if enrichment.skills_exposure:
        result.skills_exposure = enrichment.skills_exposure
    elif skills_result.skills_exposure:
        result.skills_exposure = skills_result.skills_exposure

    result.seniority_level = enrichment.seniority_level
    result.job_titles_canonical = enrichment.job_titles_canonical
    result.business_domains = enrichment.business_domains
    result.technical_domains = enrichment.technical_domains
    result.holistic_summary_text = enrichment.holistic_summary_text
    result.career_trajectory_text = enrichment.career_trajectory_text
    result.experience_block_text = enrichment.experience_block_text

    if enrichment.certifications:
        result.certifications = clean_certifications(enrichment.certifications)
    elif skills_result.certifications_raw:
        result.certifications = clean_certifications(skills_result.certifications_raw)

    if form_data.get("salary_min") and str(form_data["salary_min"]).strip():
        result.salary_expectation_min = int(form_data["salary_min"])
    else:
        result.salary_expectation_min = None

    if form_data.get("salary_max") and str(form_data["salary_max"]).strip():
        result.salary_expectation_max = int(form_data["salary_max"])
    else:
        result.salary_expectation_max = None

    if generate_embeddings:
        print("CV Parser: Layer 6 - Generating embeddings...")
        if result.holistic_summary_text:
            result.holistic_vector = embed(result.holistic_summary_text)

        if result.career_trajectory_text:
            result.career_trajectory_vector = embed(result.career_trajectory_text)

        if result.experience_block_text:
            result.experience_vector = embed(result.experience_block_text)
        print(
            "CV Parser Layer 6: vectors generated: "
            f"holistic={result.holistic_vector is not None}, "
            f"career={result.career_trajectory_vector is not None}, "
            f"experience={result.experience_vector is not None}"
        )
    else:
        print("CV Parser: Layer 6 - Skipped embedding generation")

    print("CV Parser: Complete")
    return result
