import re
from dataclasses import dataclass
from datetime import datetime
from unittest import result

@dataclass
class NERResult:
    """spaCy NER extraction result - all nullable."""

    first_name: str | None = None
    last_name: str | None = None
    location_city: str | None = None
    years_of_experience: int | None = None
    degree_level: int | None = None
    is_technical_degree: bool | None = None
    degree_field_raw: str | None = None


KNOWN_CITIES = [
    "Hanoi",
    "Ho Chi Minh City",
    "Da Nang",
    "Hue",
    "Hai Phong",
    "Can Tho",
    "Ho Chi Minh",
    "HCMC",
    "HCM",
    "Saigon",
    "New York",
    "New York, NY",
    "Washington",
    "Washington, DC",
    "Pittsburgh",
    "Pittsburgh, PA",
    "Singapore",
    "Bangkok",
    "Tokyo",
    "Seoul",
    "London",
    "Berlin",
]

TECHNICAL_DEGREE_KEYWORDS = [
    "computer science",
    "software engineering",
    "information technology",
    "computer engineering",
    "data science",
    "artificial intelligence",
    "AI",
    "machine learning",
    "electrical engineering",
    "electronics",
    "telecommunications",
    "information systems",
    "cybersecurity",
    "network",
    "IT",
    "computing",
    "engineering and technology",
    "politechnic",
    "technical",
    "engineering",
    "technology",
]

DEGREE_LEVEL_MAP = {
    0: ["none", "no degree", "high school", "secondary"],
    1: ["associate", "diploma", "foundation"],
    2: ["bachelor", "b.sc", "b.eng", "b.tech", "undergraduate", "bs", "ba", "b.s.", "b.s", "university", "college", "graduated", "engineer degree", "engineering degree"],
    3: ["master", "m.sc", "m.eng", "mba", "post graduate", "ms", "ma"],
    4: ["phd", "doctorate", "doctoral", "d.phil"],
}


def extract_name(text: str) -> tuple[str | None, str | None]:
    """Extract first and last name using spaCy PERSON entity.
    Returns (first_name, last_name) or (None, None).
    """
    try:
        print(f"NER: extract_name input: '{text[:200]}'")
        import spacy
        nlp = spacy.load("en_core_web_lg")
        
        text_for_ner = text[:500]
        if text_for_ner.isupper() or sum(1 for c in text_for_ner if c.isupper()) > len(text_for_ner) * 0.6:
            text_for_ner = text_for_ner.title()
        
        doc = nlp(text_for_ner)
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                parts = ent.text.strip().split()
                TITLE_WORDS = [
                    'senior', 'junior', 'lead', 'engineer', 'developer',
                    'manager', 'director', 'analyst', 'consultant',
                    'automation', 'qa', 'backend', 'frontend', 'fullstack',
                    'software', 'fullstack'
                ]
                parts = [p for p in parts if p.lower() not in TITLE_WORDS]
                if len(parts) >= 2:
                    return parts[0], " ".join(parts[1:])
                elif len(parts) == 1:
                    return parts[0], None
        
        # Fallback: if spaCy finds no PERSON entity
        # try extracting from first non-empty short line
        lines = [l.strip() for l in text[:200].split('\n') if l.strip()]
        SKIP_WORDS = [
            'developer', 'engineer', 'manager', 'designer',
            'frontend', 'backend', 'fullstack', 'senior', 'junior',
            'lead', 'architect', 'analyst', 'consultant', 'specialist',
            'professional', 'responsibilities', 'technologies',
            'role:', 'client:', 'experience', 'project', 'optimized',
            'implemented', 'developed', 'built', 'designed', 'led'
        ]
        for line in lines:
            words = line.split()
            
            # Handle single concatenated name word (PDF artifact)
            # e.g. "CHARLESMCTURLAND" → try to split at uppercase boundary
            if len(words) == 1 and len(words[0]) > 8 and words[0].isupper():
                token = words[0]

                mc_match = re.match(r"^([A-Z]+)(MC[A-Z]+)$", token)
                if mc_match:
                    return mc_match.group(1).title(), mc_match.group(2).title()

                name = token.title()
                if not any(w in name.lower() for w in SKIP_WORDS):
                    return name, None
            
            if 2 <= len(words) <= 5:
                line_lower = line.lower()
                if not any(w in line_lower for w in SKIP_WORDS):
                    if not any(c in line for c in ['@', ':', '/', '|', '+']):
                        # Convert to title case if all caps
                        if line.isupper():
                            line = line.title()
                        parts = line.split()
                        return parts[0], " ".join(parts[1:])
                    
        return None, None
    except Exception:
        return None, None


def extract_location(text: str) -> str | None:
    """Extract city from CV using rule-based patterns first, then spaCy GPE fallback."""
    if not text:
        return None

    try:
        text_head = text[:1500]
        text_lower = text_head.lower()

        # Rule-based matching first: more reliable for CV contact section
        location_patterns = [
            (r"\bnew york,\s*ny\b", "New York, NY"),
            (r"\bnew york\b", "New York, NY"),
            (r"\bwashington,\s*dc\b", "Washington, DC"),
            (r"\bpittsburgh,\s*pa\b", "Pittsburgh, PA"),
            (r"\baustin,\s*texas\b", "Austin, Texas"),
            (r"\baustin,\s*tx\b", "Austin, Texas"),
            (r"\bho chi minh city\b|\bho chi minh\b|\bhcmc\b|\bhcm\b|\bsaigon\b", "Ho Chi Minh City"),
            (r"\bha noi\b|\bhanoi\b", "Hanoi"),
            (r"\bda nang\b|\bdanang\b", "Da Nang"),
        ]

        for pattern, normalized_city in location_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return normalized_city

        # spaCy fallback
        import spacy

        nlp = spacy.load("en_core_web_lg")
        doc = nlp(text_head)

        for ent in doc.ents:
            if ent.label_ == "GPE":
                city = ent.text.strip()
                city_lower = city.lower()

                if city_lower in ["hcmc", "hcm", "saigon", "ho chi minh", "ho chi minh city"]:
                    return "Ho Chi Minh City"
                if city_lower in ["hanoi", "ha noi"]:
                    return "Hanoi"
                if city_lower in ["da nang", "danang"]:
                    return "Da Nang"
                if city_lower == "new york":
                    return "New York, NY"
                if city_lower == "washington":
                    return "Washington, DC"
                if city_lower == "pittsburgh":
                    return "Pittsburgh, PA"

                if city in KNOWN_CITIES:
                    return city

        return None

    except Exception as e:
        print(f"NER location extraction error: {e}")
        return None


def is_present(term: str) -> bool:
    """Check if a date term means current/ongoing."""
    if not term or not term.strip():
        return False
    return bool(
        re.search(
            r'present|current|now|today|ongoing|till\s+date|till\s+now|to\s+date',
            term.strip(),
            re.IGNORECASE,
        )
    )

def remove_education_blocks_for_yoe(text: str) -> str:
    """Remove likely education blocks before calculating years of experience."""
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines = []

    skip_mode = False
    skip_count = 0

    education_keywords = [
        "education",
        "university",
        "college",
        "b.s.",
        "b.s",
        "bachelor",
        "master",
        "degree",
        "computer science",
        "information technology",
        "software engineering",
    ]

    stop_keywords = [
        "work experience",
        "professional experience",
        "experience",
        "employment",
        "career history",
        "work history",
        "skills",
        "projects",
        "certifications",
    ]

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        if any(keyword in lower for keyword in stop_keywords):
            skip_mode = False
            skip_count = 0
            cleaned_lines.append(line)
            continue

        if any(keyword in lower for keyword in education_keywords):
            skip_mode = True
            skip_count = 8
            continue

        if skip_mode and skip_count > 0:
            skip_count -= 1
            continue

        skip_mode = False
        cleaned_lines.append(line)

    return "\n".join(cleaned_lines)

def extract_dates_and_yoe(experience_text: str) -> int | None:
    """Extract date ranges from experience section and
    calculate total years of experience.
    Returns integer years or None if cannot calculate.
    """
    if not experience_text:
        return None
    try:
        # Normalize date separators before regex
        experience_text = experience_text.replace(' To ', ' – ')
        experience_text = experience_text.replace(' to ', ' – ')
        experience_text = experience_text.replace(' TO ', ' – ')
        experience_text = experience_text.replace('\u2013', '–')
        experience_text = experience_text.replace('\u2014', '–')
        experience_text = experience_text.replace(' - ', ' – ')
        experience_text = experience_text.replace('–', '–')

        # Recover date ranges when PDF extraction removes the dash.
        # Example: "01/2021  Present" -> "01/2021 – Present"
        # Example: "01/2011  01/2013" -> "01/2011 – 01/2013"
        experience_text = re.sub(
            r"(\d{1,2}/\d{4})\s+(\d{1,2}/\d{4})",
            r"\1 – \2",
            experience_text,
        )

        experience_text = re.sub(
            r"(\d{1,2}/\d{4})\s+(present|current|now)",
            r"\1 – \2",
            experience_text,
            flags=re.IGNORECASE,
        )

        experience_text = remove_education_blocks_for_yoe(experience_text)

        print(f"NER experience text preview: {experience_text[:300]}")

        current_year = datetime.now().year
        current_month = datetime.now().month
        print(f"NER: current_year={current_year} current_month={current_month}")
        total_months = 0
        PRESENT_PATTERN = r'present|current|now|today|ongoing|till\s*date|till\s*now|to\s*date'

        # Collect ALL date ranges from ALL patterns simultaneously
        # Use min(start) to max(end) for full career span
        all_start_dates = []
        all_end_dates = []

        # Pattern 1: MM/YYYY – MM/YYYY or MM/YYYY – present
        pattern1 = rf'(\d{{1,2}})/(\d{{4}})\s*[-–—]\s*(?:(\d{{1,2}})/(\d{{4}})|({PRESENT_PATTERN}))'
        matches1 = re.findall(pattern1, experience_text, re.IGNORECASE)
        print(f"NER date pattern1 matches: {matches1}")
        for m in matches1:
            start_month, start_year = int(m[0]), int(m[1])
            if is_present(m[4]):
                end_month, end_year = current_month, current_year
            elif m[2] and m[3]:
                end_month, end_year = int(m[2]), int(m[3])
            else:
                continue
            if 1990 <= start_year <= current_year:
                all_start_dates.append(start_year * 12 + start_month)
                all_end_dates.append(end_year * 12 + end_month)

        # Pattern 2: YYYY – YYYY or YYYY – present
        pattern2 = rf'(?<!\d)(\d{{4}})\s*[-–—]\s*(\d{{4}}|{PRESENT_PATTERN})(?!\d)'
        matches2 = re.findall(pattern2, experience_text, re.IGNORECASE)
        print(f"NER date pattern2 matches: {matches2}")
        for start_str, end_str in matches2:
            start_year = int(start_str)
            if is_present(end_str):
                end_year = current_year
                end_month = current_month
            else:
                try:
                    end_year = int(end_str)
                    end_month = 12
                except Exception:
                    continue
            if 1990 <= start_year <= current_year and end_year >= start_year:
                all_start_dates.append(start_year * 12 + 1)
                all_end_dates.append(end_year * 12 + end_month)

        # Pattern 3: Month YYYY – Month YYYY or Month YYYY – present
        months_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
            'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9,
            'oct': 10, 'nov': 11, 'dec': 12
        }
        months_str = '|'.join(months_map.keys())
        PRESENT_PATTERN3 = r'present|current|now|today|ongoing|till\s*date|till\s*now|to\s*date'
        pattern3 = rf'({months_str})\s+(\d{{4}})\s*[-–—/]\s*(?:({months_str})\s+(\d{{4}})|({PRESENT_PATTERN3}))'
        matches3 = re.findall(pattern3, experience_text, re.IGNORECASE)
        print(f"NER date pattern3 matches: {matches3}")
        for m in matches3:
            start_month = months_map.get(m[0].lower(), 1)
            start_year = int(m[1])
            if is_present(m[4]):
                end_month, end_year = current_month, current_year
            elif m[2] and m[3]:
                end_month = months_map.get(m[2].lower(), 1)
                end_year = int(m[3])
            else:
                continue
            if 1990 <= start_year <= current_year:
                all_start_dates.append(start_year * 12 + start_month)
                all_end_dates.append(end_year * 12 + end_month)

        # Pattern 4: "11/2019 –" or "2022 –" with no end date → implies current
        pattern4_mm = r'(\d{1,2})/(\d{4})\s*[-–—]\s*$'
        pattern4_yyyy = r'(?<!\d)(\d{4})\s*[-–—]\s*$'
        matches4_mm = re.findall(pattern4_mm, experience_text, re.MULTILINE)
        for m in matches4_mm:
            start_month, start_year = int(m[0]), int(m[1])
            if 1990 <= start_year <= current_year:
                all_start_dates.append(start_year * 12 + start_month)
                all_end_dates.append(current_year * 12 + current_month)
        matches4_yyyy = re.findall(pattern4_yyyy, experience_text, re.MULTILINE)
        for start_str in matches4_yyyy:
            start_year = int(start_str)
            if 1990 <= start_year <= current_year:
                all_start_dates.append(start_year * 12 + 1)
                all_end_dates.append(current_year * 12 + current_month)

        # Calculate total career span: latest end - earliest start
        # Filter out likely education date range before calculating span
        # Education: 3-5 years long, earliest period, ends when work starts
        if len(all_start_dates) >= 3:
            date_pairs = sorted(zip(all_start_dates, all_end_dates))
            earliest_start, earliest_end = date_pairs[0]
            earliest_duration = earliest_end - earliest_start
            second_start = date_pairs[1][0]
            
            if (36 <= earliest_duration <= 60 and
                    earliest_end <= second_start + 6):
                print(f"NER: excluding likely education period: {earliest_start}-{earliest_end}")
                idx = all_start_dates.index(earliest_start)
                all_start_dates.pop(idx)
                all_end_dates.pop(idx)

        # Calculate total career span: latest end - earliest start
        if all_start_dates and all_end_dates:
            total_months = max(all_end_dates) - min(all_start_dates)

        print(f"NER total_months: {total_months}")
        if total_months == 0:
            return None

        years = round(total_months / 12)
        return max(1, min(years, 40))
    except Exception as e:
        print(f"NER date error: {e}")
        return None


def extract_yoe_from_summary(text: str) -> int | None:
    """Extract YOE from summary text as fallback.
    Looks for patterns like '6+ years', '5 years of experience'"""
    if not text:
        return None
    try:
        patterns = [
            r'(\d+)\+?\s*years?\s+of\s+experience',
            r'(\d+)\+?\s*years?\s+experience',
            r'over\s+(\d+)\s*years?',
            r'more\s+than\s+(\d+)\s*years?',
            r'(\d+)\+\s*years?',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                years = int(match.group(1))
                if 0 < years < 40:
                    print(f"NER: YOE from summary text: {years}")
                    return years
        return None
    except Exception:
        return None


def extract_education(education_text: str) -> tuple[int | None, bool | None, str | None]:
    """Extract degree level, is_technical_degree, degree_field_raw.
    Returns (degree_level, is_technical, field_raw) - all nullable.
    """
    if not education_text:
        return None, None, None
    try:
        text_lower = education_text.lower()

        degree_level = None
        for level, keywords in DEGREE_LEVEL_MAP.items():
            for kw in keywords:
                if kw in text_lower:
                    degree_level = level
                    break
            if degree_level is not None:
                print(f"NER education text for technical check: {text_lower[:300]}")
                break

        is_technical = None
        if degree_level is not None:
            is_technical = any(kw in text_lower for kw in TECHNICAL_DEGREE_KEYWORDS)
            print(f"NER is_technical result: {is_technical}")

        # Skip job title lines when extracting degree_field_raw
        SKIP_WORDS = [
            'developer', 'engineer', 'manager', 'designer',
            'frontend', 'backend', 'fullstack', 'senior', 'junior',
            'lead', 'architect', 'analyst', 'consultant', 'specialist',
            'professional', 'responsibilities', 'technologies', 'role:', 'client:'
        ]

        # Find degree-containing line specifically
        DEGREE_KEYWORDS = [
            'bachelor', 'master', 'phd', 'b.sc', 'b.eng', 'b.s.', 
            'b.s','b.tech', 'mba', 'm.sc', 'm.eng', 'ms', 'ma',
            'university', 'college', 'graduated', 'degree'
        ]

        lines = [l.strip() for l in education_text.split("\n") if l.strip()]
        print(f"NER: education lines: {lines}")
        print(f"NER: checking line: '{lines[0] if lines else None}'")
        
        degree_field_raw = None

        # First pass: extract degree name only (not university name)
        FIELD_OF_STUDY_WORDS = [
            'science', 'engineering', 'technology', 'mathematics',
            'business', 'arts', 'economics', 'management', 'information',
            'computer', 'software', 'data', 'electrical', 'mechanical',
            'administration', 'commerce', 'finance', 'accounting'
        ]

        for i, line in enumerate(lines):
            line_lower = line.lower()
            if any(kw in line_lower for kw in DEGREE_KEYWORDS):
                # Look ahead up to 3 lines for field of study
                combined = line.strip()
                for j in range(1, 4):
                    if i + j >= len(lines):
                        break
                    next_line = lines[i + j].strip()
                    next_lower = next_line.lower()
            
                    # Skip non-field lines
                    SKIP_NEXT = [
                        'during', 'while', 'through', 'after', 'before',
                        'using', 'with', 'from', 'to', 'and', 'the',
                        'implemented', 'developed', 'built', 'optimized'
                    ]
                    if any(w in next_lower.split()[:2] for w in SKIP_NEXT):
                        continue
            
                    # Accept if looks like field of study
                    if any(w in next_lower for w in FIELD_OF_STUDY_WORDS):
                        if len(next_line) < 50:  # field names are short
                            combined = f"{line.strip()} {next_line}"
                            break
        
                # Stop at university/separator
                for sep in [' – ', ' - ', ',', ' at ', ' from ',
                            ' university', ' college', ' institute']:
                    if sep.lower() in combined.lower():
                        degree_part = combined[:combined.lower().index(sep.lower())].strip()
                        if any(kw in degree_part.lower() for kw in DEGREE_KEYWORDS):
                            degree_field_raw = degree_part[:100]
                            break
        
                if not degree_field_raw:
                    degree_field_raw = combined[:100]
                break

        print(f"NER: degree first pass found: {degree_field_raw}")
        
        # Second pass: any non-job-title line
        if not degree_field_raw:
            for line in lines:
                line_lower = line.lower()
                if any(w in line_lower for w in SKIP_WORDS):
                    continue
                if len(line) > 5:
                    degree_field_raw = line[:100]
                    break
        if degree_field_raw:
            degree_field_raw = re.sub(
                r"^\s*\d{1,2}/\d{4}\s*[-–—]?\s*\d{1,2}/\d{4}\s*",
                "",
                degree_field_raw,
            ).strip()
        
        print(f"NER: degree final: {degree_field_raw}")

        return degree_level, is_technical, degree_field_raw
    except Exception:
        return None, None, None


def run_ner(sections) -> NERResult:
    """Run all NER extractions on CV sections.
    All fields default to None if extraction fails.
    """
    result = NERResult()

    source_text = sections.contact_section or sections.raw_text
    if source_text:
        result.first_name, result.last_name = extract_name(source_text)
    
    # Try contact section first, fallback to raw_text if name not found
    if not result.first_name and sections.raw_text:
        result.first_name, result.last_name = extract_name(sections.raw_text[:500])

    # Location: only from contact section to avoid client location false positives
    location_source = "\n".join(
        part for part in [
            sections.contact_section,
            sections.raw_text[:1500] if sections.raw_text else None,
        ]
        if part
    )

    result.location_city = extract_location(location_source)


    experience_text = sections.experience_section or ""
    if len(experience_text) < 500 and sections.raw_text:
        print("NER: experience section too small, using raw text for YOE")
        raw_for_yoe = sections.raw_text

        if sections.education_section and len(sections.education_section) > 20:
            raw_for_yoe = raw_for_yoe.replace(sections.education_section, "")
            print("NER: removed education section from YOE text")

        experience_text = raw_for_yoe

    yoe_from_dates = extract_dates_and_yoe(experience_text)
    print(f"NER: YOE from dates: {yoe_from_dates}")

    summary_source = "\n".join(
        part for part in [
            sections.summary_section,
            sections.contact_section,
            sections.raw_text[:2000] if sections.raw_text else None,
        ]
        if part
    )

    yoe_from_summary = extract_yoe_from_summary(summary_source)
    print(f"NER: YOE from summary: {yoe_from_summary}")

    if yoe_from_dates and yoe_from_summary:
        if abs(yoe_from_dates - yoe_from_summary) >= 4:
            print(
                f"NER warning: YOE conflict. dates={yoe_from_dates}, summary={yoe_from_summary}. "
                "Using date-based YOE."
            )

        result.years_of_experience = yoe_from_dates

    elif yoe_from_dates:
        result.years_of_experience = yoe_from_dates

    elif yoe_from_summary:
        result.years_of_experience = yoe_from_summary

    else:
        result.years_of_experience = None

    if sections.education_section:
        (
            result.degree_level,
            result.is_technical_degree,
            result.degree_field_raw,
        ) = extract_education(sections.education_section)

    # Fallback: scan raw text if education section not detected
    if result.degree_level is None and sections.raw_text:
        print("NER: education section missing, scanning raw text")
        (
            result.degree_level,
            result.is_technical_degree,
            result.degree_field_raw,
        ) = extract_education(sections.raw_text)

    return result
