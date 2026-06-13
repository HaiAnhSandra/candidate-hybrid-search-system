from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from candidates.enums import AvailabilityStatus, SeniorityLevel


class SearchFilters(BaseModel):
    location_city: str | None = None
    seniority_level_min: int | None = None
    seniority_level_max: int | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    years_of_experience_min: int | None = None
    years_of_experience_max: int | None = None
    availability_status: list[AvailabilityStatus] | None = None
    required_skills: list[str] | None = None
    business_domains: list[str] | None = None
    technical_domains: list[str] | None = None


class SearchQuery(BaseModel):
    raw_query: str = ""
    location_city: str | None = None
    seniority_level: int | None = None
    availability_status: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    experience_min: int | None = None
    experience_max: int | None = None
    date_from: str | None = None
    date_to: str | None = None
    required_skills: list[str] = []
    business_domains: list[str] = []
    technical_only: bool = False


class ExtractedEntities(BaseModel):
    location_city: str | None = None
    seniority_level_min: int | None = None
    seniority_level_max: int | None = None
    seniority_level: int | None = None
    years_of_experience_min: int | None = None
    years_of_experience_max: int | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    required_skills: list[str] = []
    related_skills: list[str] = []
    certifications: list[str] = []
    job_titles: list[str] = []
    business_domains: list[str] = []
    technical_domains: list[str] = []
    availability_status: AvailabilityStatus | None = None
    expanded_query: str

    @model_validator(mode="after")
    def sync_seniority(self):
        if self.seniority_level is not None:
            if self.seniority_level_min is None:
                self.seniority_level_min = self.seniority_level
            if self.seniority_level_max is None:
                self.seniority_level_max = self.seniority_level
        return self


class CandidateCard(BaseModel):
    candidate_id: UUID
    first_name: str | None = None
    last_name: str | None = None
    location_city: str | None = None
    years_of_experience: int | None = None
    seniority_level: SeniorityLevel | None = None
    availability_status: AvailabilityStatus | None = None
    salary_expectation_min: int | None = None
    salary_expectation_max: int | None = None
    skills_primary: list[str]
    skills_secondary: list[str] 
    skills_exposure: list[str] = [] 
    job_titles_canonical: list[str] 
    business_domains: list[str]
    technical_domains: list[str]
    certifications: list[str] = []
    holistic_summary_text: str | None = None
    career_trajectory_text: str | None = None
    experience_block_text: str | None = None
    degree_level: int | None = None
    degree_field_raw: str | None = None
    is_technical_degree: bool | None = None
    relevance_score: float | None = None

    model_config = ConfigDict(from_attributes=True)


class SearchResponse(BaseModel):
    query: str
    total_found: int
    candidates: list[CandidateCard]
    search_time_ms: float
    error: str | None = None
