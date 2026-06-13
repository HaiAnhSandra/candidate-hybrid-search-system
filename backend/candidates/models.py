from datetime import datetime
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Integer, SmallInteger, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from core.database import Base
from candidates.enums import AvailabilityStatus, DegreeLevel, SeniorityLevel


class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    location_city: Mapped[str] = mapped_column(String, nullable=False)
    years_of_experience: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    seniority_level: Mapped[SeniorityLevel] = mapped_column(SmallInteger, nullable=False)
    salary_expectation_min: Mapped[int | None] = mapped_column(Integer)
    salary_expectation_max: Mapped[int | None] = mapped_column(Integer)
    degree_level: Mapped[DegreeLevel | None] = mapped_column(SmallInteger)
    is_technical_degree: Mapped[bool | None] = mapped_column(Boolean)
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        String,
        nullable=False,
        default=AvailabilityStatus.AVAILABLE.value,
    )
    skills_primary: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    skills_secondary: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    skills_exposure: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    job_titles_canonical: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    certifications: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    business_domains: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    technical_domains: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    degree_field_raw: Mapped[str | None] = mapped_column(String)
    holistic_summary_text: Mapped[str | None] = mapped_column(Text)
    career_trajectory_text: Mapped[str | None] = mapped_column(Text)
    experience_block_text: Mapped[str | None] = mapped_column(Text)
    holistic_vector: Mapped[list[float] | None] = mapped_column(Vector(768))
    career_trajectory_vector: Mapped[list[float] | None] = mapped_column(Vector(768))
    experience_vector: Mapped[list[float] | None] = mapped_column(Vector(768))
    search_tsvector: Mapped[str | None] = mapped_column(TSVECTOR)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
