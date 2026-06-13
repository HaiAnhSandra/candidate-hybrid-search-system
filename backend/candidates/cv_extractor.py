import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class CVSections:
    """Raw extracted sections from CV - all fields optional/nullable."""

    raw_text: str = ""
    contact_section: str | None = None
    summary_section: str | None = None
    experience_section: str | None = None
    education_section: str | None = None
    skills_section: str | None = None
    certifications_section: str | None = None
    projects_section: str | None = None

def collapse_spaced_letters(text: str) -> str:
    """Fix PDF spaced-letter artifact: 'C H A R L E S' → 'CHARLES'"""
    lines = text.split("\n")
    fixed_lines = []

    for line in lines:
        stripped = line.strip()

        if not stripped:
            fixed_lines.append(line)
            continue

        if " " in stripped and any(len(token) > 1 for token in stripped.split()):
            fixed_lines.append(line)
            continue

        chars = stripped.split()

        if (
            len(chars) >= 3
            and all(len(c) == 1 and c.isalpha() for c in chars)
            and sum(1 for c in chars if c.isupper()) / len(chars) > 0.7
        ):
            word_groups = re.split(r" {3,}", stripped)

            if len(word_groups) > 1:
                collapsed_words = []

                for group in word_groups:
                    group_chars = group.split()

                    if group_chars and all(len(c) == 1 and c.isalpha() for c in group_chars):
                        collapsed_words.append("".join(group_chars))
                    else:
                        collapsed_words.append(group.strip())

                fixed_lines.append(" ".join(w for w in collapsed_words if w))
            else:
                fixed_lines.append("".join(chars))
        else:
            fixed_lines.append(line)

    return "\n".join(fixed_lines)

def clean_extracted_text(text: str) -> str:
    """Clean PDF artifacts that break parsing and database insertion."""
    if not text:
        return ""

    return (
        text
        .replace("\x00", " - ")
        .replace("\u0000", " - ")
        .replace("\ufeff", "")
        .replace("", " ")
        .replace("", " ")
        .strip()
    )

def extract_text_from_docx(file_bytes: bytes) -> str | None:
    """Extract raw text from DOCX using python-docx.
    Returns None if extraction fails.
    """
    try:
        import io
        import docx

        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                paragraphs.append(text)

        return "\n".join(paragraphs) if paragraphs else None

    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return None


def extract_text_from_pdf(file_bytes: bytes) -> str | None:
    """Extract raw text from PDF using pdfplumber."""
    try:
        import io
        import pdfplumber

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = []

            for page in pdf.pages:
                text = page.extract_text(
                    x_tolerance=3,
                    y_tolerance=3,
                    layout=False,
                )

                if not text:
                    text = page.extract_text(layout=False)

                if text:
                    pages.append(text)

            raw = "\n\n".join(pages).strip() if pages else None

            if raw:
                raw = collapse_spaced_letters(raw).strip()
                raw = clean_extracted_text(raw)

            return raw if raw else None

    except Exception as e:
        print(f"PDF extraction error: {e}")
        return None

def extract_text(file_bytes: bytes, filename: str) -> str | None:
    """Route to correct extractor based on file extension."""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)

    if ext == ".docx":
        return extract_text_from_docx(file_bytes)

    if ext == ".doc":
        print("DOC files are not supported. Please upload DOCX or PDF.")
        return None

    print(f"Unsupported file type: {ext}")
    return None
  
SECTION_PATTERNS = {
    "experience": r"(?i)^(work\s+experience|professional\s+experience|experience|employment\s+history|employment|career\s+history|work\s+history)$",
    "education": r"(?i)^(education|academic|qualification|degree)$",
    "skills": r"(?i)^(skills|technical\s+skills|technologies|competencies|expertise)$",
    "certifications": r"(?i)^(certifications|certification|licenses|license|credentials|achievements)$",
    "summary": r"(?i)^(professional\s+summary|summary|objective|profile|about|overview|introduction)$",
    "projects": r"(?i)^(projects|personal\s+projects|side\s+projects|portfolio)$",
}

def normalize_section_headings(raw_text: str) -> str:
    """Normalize CV section headings without breaking compound headings."""
    text = raw_text

    # Fix headings split across lines by PDF extraction
    text = re.sub(
        r"(?i)\bWORK\s*\n\s*EXPERIENCE\b",
        "\nWORK EXPERIENCE\n",
        text,
    )

    text = re.sub(
        r"(?i)\bPROFESSIONAL\s*\n\s*EXPERIENCE\b",
        "\nPROFESSIONAL EXPERIENCE\n",
        text,
    )

    # Normalize compound headings first
    compound_headings = [
        "WORK EXPERIENCE",
        "PROFESSIONAL EXPERIENCE",
        "TECHNICAL SKILLS",
    ]

    for heading in compound_headings:
        text = re.sub(
            rf"(?im)^\s*{re.escape(heading)}\s*$",
            f"\n{heading}\n",
            text,
        )

    # Normalize single-word headings only when they are standalone lines
    single_headings = [
        "CONTACT",
        "SUMMARY",
        "PROFILE",
        "EDUCATION",
        "SKILLS",
        "CERTIFICATIONS",
        "PROJECTS",
        "EMPLOYMENT",
        "EMPLOYMENT HISTORY",
        "CAREER HISTORY",
        "PROFESSIONAL EXPERIENCE",
    ]

    for heading in single_headings:
        text = re.sub(
            rf"(?im)^\s*{re.escape(heading)}\s*$",
            f"\n{heading}\n",
            text,
        )

    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()

def segment_sections(raw_text: str) -> CVSections:
    """Split raw text into sections using regex heuristics.
    All sections are optional and return None if not found.
    """
    if not raw_text:
        return CVSections(raw_text="")

    raw_text = normalize_section_headings(raw_text)

    sections = CVSections(raw_text=raw_text)
    lines = raw_text.split("\n")

    current_section = "contact"
    section_content = {"contact": []}

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if len(stripped) < 40:
            matched_section = None
            for section_name, pattern in SECTION_PATTERNS.items():
                if re.search(pattern, stripped):
                    matched_section = section_name
                    break

            if matched_section:
                current_section = matched_section
                if current_section not in section_content:
                    section_content[current_section] = []
                continue

        if current_section not in section_content:
            section_content[current_section] = []
        section_content[current_section].append(stripped)

    def get_section(key: str) -> str | None:
        content = section_content.get(key, [])
        return "\n".join(content) if content else None

    sections.contact_section = get_section("contact")
    sections.summary_section = get_section("summary")
    sections.experience_section = get_section("experience")
    sections.education_section = get_section("education")
    sections.skills_section = get_section("skills")
    sections.certifications_section = get_section("certifications")
    sections.projects_section = get_section("projects")

    return sections
