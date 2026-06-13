from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import UUID

import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from candidates.models import Candidate
from candidates.schemas import CandidateCard, SearchQuery, SearchResponse
from candidates.upload import (
    confirm_save_candidate_cv,
    ConfirmSaveRequest,
    parse_preview_candidate_cv,
    upload_candidate_cv,
)
from candidates.search import search_candidates
from candidates.export import export_shortlist, ExportRequest
from core.config import settings
from core.database import get_db

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    from candidates.search import _load_reranker

    _load_reranker()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/v1/search", response_model=SearchResponse)
async def search_endpoint(
    query: SearchQuery, db: AsyncSession = Depends(get_db)
) -> SearchResponse:
    return await search_candidates(query, db)


@app.get("/api/v1/candidates/{candidate_id}", response_model=CandidateCard)
async def get_candidate_endpoint(candidate_id: UUID, db: AsyncSession = Depends(get_db)) -> CandidateCard:
    sql = text(
        """
        SELECT *
        FROM candidates
        WHERE candidate_id = :candidate_id;
        """
    )
    result = await db.execute(sql, {"candidate_id": candidate_id})
    row = result.mappings().first()

    if row is None:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate = Candidate(**row)
    return CandidateCard.model_validate(candidate)


@app.get("/api/v1/health")
async def health_check() -> dict:
    return {"status": "ok", "model": settings.EMBEDDING_MODEL}


@app.post("/api/v1/export/shortlist")
async def export_endpoint(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db)
):
    return await export_shortlist(request, db)


@app.post("/api/v1/candidates/upload")
async def upload_cv_endpoint(
    file: UploadFile = File(...),
    full_name: str = Form(default=""),
    contact_email: str = Form(default=""),
    contact_phone: str = Form(default=""),
    salary_min: str = Form(default=""),
    salary_max: str = Form(default=""),
    source: str = Form(default="Direct Application"),
    job_order: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    return await upload_candidate_cv(
        file=file,
        full_name=full_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
        salary_min=salary_min,
        salary_max=salary_max,
        source=source,
        job_order=job_order,
    )


@app.post("/api/v1/candidates/parse-preview")
async def parse_preview_cv_endpoint(
    file: UploadFile = File(...),
    full_name: str = Form(default=""),
    contact_email: str = Form(default=""),
    contact_phone: str = Form(default=""),
    salary_min: str = Form(default=""),
    salary_max: str = Form(default=""),
    source: str = Form(default="Direct Application"),
    job_order: str = Form(default=""),
):
    return await parse_preview_candidate_cv(
        file=file,
        full_name=full_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
        salary_min=salary_min,
        salary_max=salary_max,
        source=source,
        job_order=job_order,
    )


@app.post("/api/v1/candidates/confirm-save")
async def confirm_save_cv_endpoint(request: ConfirmSaveRequest, db: AsyncSession = Depends(get_db)):
    return await confirm_save_candidate_cv(request, db)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
