import uuid
import asyncio

from fastapi import BackgroundTasks, Depends, Form, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from candidates.cv_parser import parse_cv
from core.database import get_db, SessionLocal

def sanitize_for_postgres(value):
    """Remove characters PostgreSQL cannot store in TEXT/VARCHAR/ARRAY fields."""
    if value is None:
        return None

    if isinstance(value, str):
        return (
            value
            .replace("\x00", "")
            .replace("\u0000", "")
            .replace("\ufeff", "")
            .strip()
        )

    if isinstance(value, list):
        cleaned_items = []

        for item in value:
            cleaned_item = sanitize_for_postgres(item)

            if cleaned_item not in (None, ""):
                cleaned_items.append(cleaned_item)

        return cleaned_items

    if isinstance(value, dict):
        return {
            key: sanitize_for_postgres(item)
            for key, item in value.items()
        }

    return value


def build_form_data(
    full_name: str,
    contact_email: str,
    contact_phone: str,
    salary_min: str,
    salary_max: str,
    source: str,
    job_order: str,
):
    return {
        "full_name": full_name,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "source": source,
        "job_order": job_order,
    }


def build_preview_response(file: UploadFile, parsed, source: str) -> JSONResponse:
    preview_id = str(uuid.uuid4())
    raw_text = parsed.raw_text

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "preview_id": preview_id,
            "filename": file.filename,
            "raw_text": raw_text,
            "parsed_fields": {
                "name": f"{parsed.first_name or ''} {parsed.last_name or ''}".strip(),
                "location": parsed.location_city,
                "yoe": parsed.years_of_experience,
                "seniority": parsed.seniority_level,
                "skills_count": len(parsed.skills_primary or []),
                "has_summary": parsed.holistic_summary_text is not None,
                "has_vectors": False,
            },
            "candidate_data": {
                "first_name": parsed.first_name,
                "last_name": parsed.last_name,
                "location_city": parsed.location_city,
                "years_of_experience": parsed.years_of_experience,
                "seniority_level": parsed.seniority_level,
                "salary_expectation_min": parsed.salary_expectation_min,
                "salary_expectation_max": parsed.salary_expectation_max,
                "job_titles_canonical": parsed.job_titles_canonical or [],
                "skills_primary": parsed.skills_primary or [],
                "skills_secondary": parsed.skills_secondary or [],
                "skills_exposure": parsed.skills_exposure or [],
                "business_domains": parsed.business_domains or [],
                "technical_domains": parsed.technical_domains or [],
                "certifications": parsed.certifications or [],
                "degree_level": parsed.degree_level,
                "degree_field_raw": parsed.degree_field_raw,
                "is_technical_degree": parsed.is_technical_degree,
                "holistic_summary_text": parsed.holistic_summary_text,
                "career_trajectory_text": parsed.career_trajectory_text,
                "experience_block_text": parsed.experience_block_text,
                "availability_status": parsed.availability_status,
                "source": source,
            },
        },
    )


class ConfirmSaveCandidateData(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    location_city: str | None = None
    years_of_experience: int | None = None
    seniority_level: int | None = None
    salary_expectation_min: int | None = None
    salary_expectation_max: int | None = None
    job_titles_canonical: list[str] = Field(default_factory=list)
    skills_primary: list[str] = Field(default_factory=list)
    skills_secondary: list[str] = Field(default_factory=list)
    skills_exposure: list[str] = Field(default_factory=list)
    business_domains: list[str] = Field(default_factory=list)
    technical_domains: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    degree_level: int | None = None
    degree_field_raw: str | None = None
    is_technical_degree: bool | None = None
    holistic_summary_text: str | None = None
    career_trajectory_text: str | None = None
    experience_block_text: str | None = None
    availability_status: str = "available"
    source: str = "Direct Application"


class ConfirmSaveRequest(BaseModel):
    candidate_data: ConfirmSaveCandidateData


def vec_to_str(vector):
    if vector is None:
        return None
    return "[" + ",".join(str(x) for x in vector) + "]"


async def upload_candidate_cv(
    file: UploadFile,
    full_name: str = Form(default=""),
    contact_email: str = Form(default=""),
    contact_phone: str = Form(default=""),
    salary_min: str = Form(default=""),
    salary_max: str = Form(default=""),
    source: str = Form(default="Direct Application"),
    job_order: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.endswith((".pdf", ".docx", ".doc")):
        return JSONResponse(
            status_code=400,
            content={"error": "Only PDF and DOCX files supported"},
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        return JSONResponse(
            status_code=400,
            content={"error": "File too large. Max 10MB"},
        )

    form_data = {
        "full_name": full_name,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "source": source,
        "job_order": job_order,
    }

    parsed = await parse_cv(file_bytes, file.filename, form_data)

    holistic_vec = vec_to_str(parsed.holistic_vector)
    career_vec = vec_to_str(parsed.career_trajectory_vector)
    experience_vec = vec_to_str(parsed.experience_vector)

    candidate_id = str(uuid.uuid4())

    candidate_values = sanitize_for_postgres(
        {
            "candidate_id": candidate_id,
            "first_name": parsed.first_name or "Unknown",
            "last_name": parsed.last_name or "",
            "location_city": parsed.location_city,
            "years_of_experience": parsed.years_of_experience,
            "seniority_level": parsed.seniority_level,
            "salary_min": parsed.salary_expectation_min,
            "salary_max": parsed.salary_expectation_max,
            "degree_level": parsed.degree_level,
            "is_technical": parsed.is_technical_degree,
            "availability": parsed.availability_status,
            "degree_field": parsed.degree_field_raw,
            "skills_primary": (parsed.skills_primary or [])[:4],
            "skills_secondary": (parsed.skills_secondary or [])[:3],
            "skills_exposure": (parsed.skills_exposure or [])[:3],
            "job_titles": parsed.job_titles_canonical or [],
            "certifications": parsed.certifications or [],
            "business_domains": parsed.business_domains or [],
            "technical_domains": parsed.technical_domains or [],
            "holistic_summary": parsed.holistic_summary_text,
            "career_trajectory": parsed.career_trajectory_text,
            "experience_block": parsed.experience_block_text,
        }
    )

async def generate_candidate_embeddings_background(
    candidate_id: str,
    holistic_summary: str | None,
    career_trajectory: str | None,
    experience_block: str | None,
) -> None:
    try:
        print(f"Background: generating embeddings for candidate {candidate_id}")

        from core.embedder import embed

        loop = asyncio.get_running_loop()

        holistic_vec = None
        career_vec = None
        experience_vec = None

        if holistic_summary:
            holistic_vec = await loop.run_in_executor(None, embed, holistic_summary)

        if career_trajectory:
            career_vec = await loop.run_in_executor(None, embed, career_trajectory)

        if experience_block:
            experience_vec = await loop.run_in_executor(None, embed, experience_block)

        holistic_vec_str = vec_to_str(holistic_vec)
        career_vec_str = vec_to_str(career_vec)
        experience_vec_str = vec_to_str(experience_vec)

        update_sql = text(
            f"""
            UPDATE candidates
            SET
                holistic_vector = {f"'{holistic_vec_str}'::vector" if holistic_vec_str else "NULL"},
                career_trajectory_vector = {f"'{career_vec_str}'::vector" if career_vec_str else "NULL"},
                experience_vector = {f"'{experience_vec_str}'::vector" if experience_vec_str else "NULL"}
            WHERE candidate_id = :candidate_id;
            """
        )

        async with SessionLocal() as db:
            await db.execute(update_sql, {"candidate_id": candidate_id})
            await db.commit()

        print(
            "Background: vector update committed",
            {
                "candidate_id": candidate_id,
                "has_holistic_vector": holistic_vec_str is not None,
                "has_career_vector": career_vec_str is not None,
                "has_experience_vector": experience_vec_str is not None,
            },
        )
        
        print(f"Background: embeddings completed for candidate {candidate_id}")

    except Exception as e:
        print(f"Background embedding error for candidate {candidate_id}: {e}")

async def confirm_save_candidate_cv(
    request: ConfirmSaveRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    print("API: confirm-save endpoint called")
    
    candidate_data = sanitize_for_postgres(request.candidate_data.model_dump())

    print("API: saving candidate first; embeddings will run in background")

    holistic_vec = None
    career_vec = None
    experience_vec = None

    candidate_id = str(uuid.uuid4())

    insert_values = {
        "candidate_id": candidate_id,
        "first_name": candidate_data.get("first_name") or "Unknown",
        "last_name": candidate_data.get("last_name") or "",
        "location_city": candidate_data.get("location_city"),
        "years_of_experience": candidate_data.get("years_of_experience"),
        "seniority_level": candidate_data.get("seniority_level"),
        "salary_min": candidate_data.get("salary_expectation_min"),
        "salary_max": candidate_data.get("salary_expectation_max"),
        "degree_level": candidate_data.get("degree_level"),
        "is_technical": candidate_data.get("is_technical_degree"),
        "availability": candidate_data.get("availability_status") or "available",
        "degree_field": candidate_data.get("degree_field_raw"),
        "skills_primary": (candidate_data.get("skills_primary") or [])[:4],
        "skills_secondary": (candidate_data.get("skills_secondary") or [])[:3],
        "skills_exposure": (candidate_data.get("skills_exposure") or [])[:3],
        "job_titles": candidate_data.get("job_titles_canonical") or [],
        "certifications": candidate_data.get("certifications") or [],
        "business_domains": candidate_data.get("business_domains") or [],
        "technical_domains": candidate_data.get("technical_domains") or [],
        "holistic_summary": candidate_data.get("holistic_summary_text"),
        "career_trajectory": candidate_data.get("career_trajectory_text"),
        "experience_block": candidate_data.get("experience_block_text"),
    }

    insert_values = sanitize_for_postgres(insert_values)

    sql = text(
        f"""
        INSERT INTO candidates (
            candidate_id,
            first_name, last_name,
            location_city, years_of_experience,
            seniority_level,
            salary_expectation_min, salary_expectation_max,
            degree_level, is_technical_degree,
            availability_status, degree_field_raw,
            skills_primary, skills_secondary, skills_exposure,
            job_titles_canonical, certifications,
            business_domains, technical_domains,
            holistic_summary_text, career_trajectory_text,
            experience_block_text,
            holistic_vector,
            career_trajectory_vector,
            experience_vector
        ) VALUES (
            :candidate_id,
            :first_name, :last_name,
            :location_city, :years_of_experience,
            :seniority_level,
            :salary_min, :salary_max,
            :degree_level, :is_technical,
            :availability, :degree_field,
            :skills_primary, :skills_secondary, :skills_exposure,
            :job_titles, :certifications,
            :business_domains, :technical_domains,
            :holistic_summary, :career_trajectory,
            :experience_block,
            {f"'{holistic_vec}'::vector" if holistic_vec else "NULL"},
            {f"'{career_vec}'::vector" if career_vec else "NULL"},
            {f"'{experience_vec}'::vector" if experience_vec else "NULL"}
        )
        RETURNING candidate_id;
        """
    )

    await db.execute(sql, insert_values)
    await db.commit()

    background_tasks.add_task(
        generate_candidate_embeddings_background,
        candidate_id,
        insert_values["holistic_summary"],
        insert_values["career_trajectory"],
        insert_values["experience_block"],
    )

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "candidate_id": candidate_id,
            "message": "Candidate saved successfully. Embeddings are being generated in the background.",
            "candidate_data": {
                "candidate_id": candidate_id,
                "first_name": insert_values["first_name"],
                "last_name": insert_values["last_name"],
                "location_city": insert_values["location_city"],
                "years_of_experience": insert_values["years_of_experience"],
                "seniority_level": insert_values["seniority_level"],
                "salary_expectation_min": insert_values["salary_min"],
                "salary_expectation_max": insert_values["salary_max"],
                "job_titles_canonical": insert_values["job_titles"],
                "skills_primary": insert_values["skills_primary"],
                "skills_secondary": insert_values["skills_secondary"],
                "skills_exposure": insert_values["skills_exposure"],
                "business_domains": insert_values["business_domains"],
                "technical_domains": insert_values["technical_domains"],
                "certifications": insert_values["certifications"],
                "degree_level": insert_values["degree_level"],
                "degree_field_raw": insert_values["degree_field"],
                "is_technical_degree": insert_values["is_technical"],
                "holistic_summary_text": insert_values["holistic_summary"],
                "career_trajectory_text": insert_values["career_trajectory"],
                "experience_block_text": insert_values["experience_block"],
                "availability_status": insert_values["availability"],
                "source": candidate_data.get("source") or "Direct Application",
            },
        },
    )

async def parse_preview_candidate_cv(
    file: UploadFile,
    full_name: str = Form(default=""),
    contact_email: str = Form(default=""),
    contact_phone: str = Form(default=""),
    salary_min: str = Form(default=""),
    salary_max: str = Form(default=""),
    source: str = Form(default="Direct Application"),
    job_order: str = Form(default=""),
):
    print("API: parse-preview endpoint called")

    if not file.filename or not file.filename.endswith((".pdf", ".docx", ".doc")):
        return JSONResponse(
            status_code=400,
            content={"error": "Only PDF and DOCX files supported"},
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        return JSONResponse(
            status_code=400,
            content={"error": "File too large. Max 10MB"},
        )

    form_data = build_form_data(
        full_name,
        contact_email,
        contact_phone,
        salary_min,
        salary_max,
        source,
        job_order,
    )
    print("API: calling parse_cv with generate_embeddings=False")

    parsed = await parse_cv(
        file_bytes,
        file.filename,
        form_data,
        generate_embeddings=False,
    )

    return build_preview_response(file, parsed, source)
