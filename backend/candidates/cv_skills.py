from collections import Counter
from dataclasses import dataclass, field
import re


@dataclass
class SkillsResult:
    """SkillNER extraction result."""

    skills_primary: list[str] = field(default_factory=list)
    skills_secondary: list[str] = field(default_factory=list)
    skills_exposure: list[str] = field(default_factory=list)
    certifications_raw: list[str] = field(default_factory=list)


def extract_skills_with_skillner(text: str) -> list[str]:
    """Extract skills from text using SkillNer.
    Returns list of skill names or empty list if fails.
    """
    try:
        import spacy
        from skillner import SkillExtractor
        from spacy.matcher import PhraseMatcher

        nlp = spacy.load("en_core_web_lg")
        skill_extractor = SkillExtractor(nlp, "/path/to/emsi", PhraseMatcher)

        annotations = skill_extractor.annotate(text)
        skills = []
        for skill in annotations.get("results", {}).get("full_matches", []):
            skill_name = skill.get("doc_node_value", "").strip()
            if skill_name and len(skill_name) > 1:
                skills.append(skill_name)
        return list(set(skills))
    except Exception:
        return extract_skills_fallback(text)


def extract_skills_fallback(text: str) -> list[str]:
    """Fallback skill extraction using common IT skill keywords.
    Used when SkillNer is not available.
    """
    common_skills = [
        "Python",
        "Java",
        "JavaScript",
        "TypeScript",
        "Go",
        "Golang",
        "C#",
        "PHP",
        "Ruby",
        "Rust",
        "Kotlin",
        "Swift",
        "Scala",
        "React",
        "Vue.js",
        "Angular",
        "Next.js",
        "Node.js",
        "Spring Boot",
        "Django",
        "FastAPI",
        "Flask",
        "Laravel",
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Redis",
        "Elasticsearch",
        "Docker",
        "Kubernetes",
        "Terraform",
        "AWS",
        "GCP",
        "Azure",
        "Kafka",
        "RabbitMQ",
        "Apache Spark",
        "Airflow",
        "dbt",
        "Machine Learning",
        "PyTorch",
        "TensorFlow",
        "scikit-learn",
        "React Native",
        "Flutter",
        "iOS",
        "Android",
        "Git",
        "CI/CD",
        "Jenkins",
        "GitHub Actions",
        "REST API",
        "GraphQL",
        "gRPC",
        "Microservices",
        "Linux",
        "Bash",
        "SQL",
        "HTML",
        "CSS",
        "Selenium",
        "Playwright",
        "Cypress",
        "TestNG",
        "JUnit",
        "Postman",
        "JMeter",
        "Tosca",
        "Tricentis",
        "SoapUI",
        "Appium",
        "Robot Framework",
        "Cucumber",
        "BDD",
        "Page Object Model",
        "ISTQB",
        "Manual Testing",
        "API Testing",
        "Performance Testing",
        "Load Testing",
        "Regression Testing",
        "UAT",
        "Test Automation",
        "Jira",
        "Confluence",
        "Trello",
        "Azure DevOps",
        "GitHub",
        "GitLab",
        "Bitbucket",
        "GitLab CI",
        "SQL Server",
        "Oracle DB",
        "SQLite",
        "PowerShell",
        "Express.js",
        "NestJS",
        "React Native",
        "Flutter",
        ".NET",
        "ASP.NET",
        "Ansible",
        "Nginx",
        "Agile",
        "Scrum",
        "Kanban",
        "Waterfall",
        "DevOps",
        "TDD",
        "DDD",
        "Deep Learning",
        "Pandas",
        "NumPy",
        "GitHub Copilot",
    ]

    text_lower = text.lower()
    found = []
    for skill in common_skills:
        if skill.lower() in text_lower:
            found.append(skill)
    return found


def tier_skills(
    skills_section_skills: list[str],
    experience_skills: list[str],
    projects_skills: list[str],
) -> SkillsResult:
    """
    Assign skills to tiers based on frequency across sections:
    - Primary: appears in skills section AND experience (daily use)
    - Secondary: appears in experience section (regular use)
    - Exposure: appears only in projects (basic familiarity)

    Max 5 primary, 5 secondary, 5 exposure.
    """
    result = SkillsResult()

    all_skills = set(skills_section_skills + experience_skills + projects_skills)

    primary = []
    secondary = []
    exposure = []

    for skill in all_skills:
        in_skills_section = skill in skills_section_skills
        in_experience = skill in experience_skills
        in_projects = skill in projects_skills

        if in_skills_section and in_experience:
            primary.append(skill)
        elif in_experience:
            secondary.append(skill)
        elif in_projects or in_skills_section:
            exposure.append(skill)

    result.skills_primary = primary[:4]
    result.skills_secondary = secondary[:3]
    result.skills_exposure = exposure[:3]

    return result


def extract_certifications_raw(
    certifications_text: str,
    raw_text: str = ""
) -> list[str]:
    """Extract certification names from certifications section
    and raw text fallback. Returns empty list if not found."""
    
    CERT_PATTERNS = [
        r'certificate\s+of\s+[\w\s]{3,50}',
        r'certified\s+[\w\s]{3,30}',
        r'ISTQB[\w\s]*',
        r'AWS[\w\s]*(?:certified|associate|professional)[\w\s]*',
        r'[A-Z]{2,5}\s+(?:certificate|certification|certified)',
        r'B[1-2]\s+(?:language|english)[\w\s]*',
        r'IELTS[\s\d\.]*',             
        r'TOEIC[\s\d]*',                
        r'TOEFL[\s\d]*',                
        r'PMP[\w\s]*',
        r'AZ-\d{3}[\w\s]*',
        r'CKA[\w\s]*',
        r'CKAD[\w\s]*',
        r'course\s+[\w\s]{3,40}\([\w-]+\)',
    ]
    
    try:
        # Search certifications section first
        search_text = certifications_text or ""
        
        # If section is small or empty also scan raw text
        if len(search_text) < 50 and raw_text:
            search_text = search_text + " " + raw_text
        
        if not search_text.strip():
            return []
        
        found = []
        
        # Pattern matching for known cert formats
        for pattern in CERT_PATTERNS:
            matches = re.findall(pattern, search_text, re.IGNORECASE)
            for m in matches:
                cleaned = m.strip()
                if 3 < len(cleaned) < 100:
                    found.append(cleaned)
        
        # Also try line-by-line from certifications section
        if certifications_text:
            print(f"CV Skills: certifications_section: {certifications_text[:300]}")
            lines = [l.strip() for l in certifications_text.split("\n") 
                    if l.strip()]
            EXCLUDE_WORDS = [
                'engineer', 'developer', 'manager', 'lead',
                'architect', 'analyst', 'tester', 'senior', 'junior',
                'scrum', 'kanban', 'agile', 'safe', 'jira',      
                'technologies', 'role:', 'team size', 'responsibilities',
                'sprint', 'framework', 'leveraging', 'tracking'
            ]
            for line in lines:
                if 3 < len(line) < 100:
                    if line.startswith('('):          
                        continue
                if re.search(r'To \d', line):     # skip date lines
                        continue
                if not any(w in line.lower() for w in EXCLUDE_WORDS):
                        found.append(line)
        
        # Deduplicate keeping order
        seen = set()
        unique = []
        for cert in found:
            key = cert.lower()[:20]
            if key not in seen:
                seen.add(key)
                unique.append(cert)
        
        return unique[:5]
    except Exception:
        return []
    

def run_skill_extraction(sections) -> SkillsResult:
    """Run skill extraction on all relevant sections."""
    skills_section_skills = []
    experience_skills = []
    projects_skills = []

    if sections.skills_section:
        skills_section_skills = extract_skills_fallback(sections.skills_section)

    if not skills_section_skills and sections.contact_section:
        skills_section_skills = extract_skills_fallback(sections.contact_section)

    if sections.experience_section:
        experience_skills = extract_skills_fallback(sections.experience_section)

    if sections.projects_section:
        projects_skills = extract_skills_fallback(sections.projects_section)

    all_found = skills_section_skills + experience_skills + projects_skills
    if len(all_found) < 3 and sections.raw_text:
        print("NER: too few skills found, scanning raw text")
        raw_skills = extract_skills_fallback(sections.raw_text)
        experience_skills = raw_skills  

    result = tier_skills(skills_section_skills, experience_skills, projects_skills)

    result.certifications_raw = extract_certifications_raw(
        sections.certifications_section,
        raw_text=sections.raw_text
    )

    if sections.raw_text:
        import re
        lang_cert_pattern = r'(?:IELTS[\s\d\.]+|TOEIC[\s\d]+|TOEFL[\s\d]+|B[1-2]\s+(?:language|english)[\w\s]*)'
        lang_certs = re.findall(lang_cert_pattern, sections.raw_text, re.IGNORECASE)
        print(f"CV Skills: lang_certs found: {lang_certs}")
        for cert in lang_certs:
            cleaned = cert.strip()
            if cleaned and cleaned not in result.certifications_raw:
                result.certifications_raw.append(cleaned)

    return result
