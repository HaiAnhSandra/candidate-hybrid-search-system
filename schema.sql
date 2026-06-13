-- PostgreSQL 15 schema for candidate search demo

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS candidates (
    -- Identity
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    -- B-tree indexed scalar columns (hard filter fields)
    location_city TEXT,
    years_of_experience INTEGER,
    seniority_level SMALLINT CHECK (seniority_level BETWEEN 0 AND 5),
    salary_expectation_min INTEGER,
    salary_expectation_max INTEGER,
    degree_level SMALLINT CHECK (degree_level BETWEEN 0 AND 4),
    is_technical_degree BOOLEAN,
    availability_status TEXT CHECK (availability_status IN ('available', 'open', 'closed')),

    -- GIN indexed arrays
    skills_primary TEXT[] CHECK (cardinality(skills_primary) <= 4),
    skills_secondary TEXT[] CHECK (cardinality(skills_secondary) <= 3),
    skills_exposure TEXT[] CHECK (cardinality(skills_exposure) <= 3),
    job_titles_canonical TEXT[],
    certifications TEXT[],
    business_domains TEXT[],
    technical_domains TEXT[],

    -- Vectorization input texts (stored for regeneration, displayed on profile)
    holistic_summary_text TEXT,
    career_trajectory_text TEXT,
    experience_block_text TEXT,

    -- Vector columns — full float32, no precision tradeoff
    holistic_vector vector(768),
    career_trajectory_vector vector(768),
    experience_vector vector(768),

    -- Full-text search
    search_tsvector TSVECTOR,

    -- Display only
    degree_field_raw TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Search tsvector update function
CREATE OR REPLACE FUNCTION candidates_search_tsvector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_tsvector := to_tsvector(
        'english',
        coalesce(NEW.holistic_summary_text, '') || ' ' ||
        coalesce(NEW.career_trajectory_text, '') || ' ' ||
        coalesce(NEW.experience_block_text, '') || ' ' ||
        coalesce(array_to_string(NEW.certifications, ' '), '') || ' ' ||
        coalesce(array_to_string(NEW.job_titles_canonical, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh tsvector on insert/update
DROP TRIGGER IF EXISTS candidates_search_tsvector_trigger ON candidates;
CREATE TRIGGER candidates_search_tsvector_trigger
BEFORE INSERT OR UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION candidates_search_tsvector_update();

-- HNSW vector indexes (cosine distance)
CREATE INDEX IF NOT EXISTS candidates_holistic_vector_hnsw
    ON candidates USING hnsw (holistic_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS candidates_career_trajectory_vector_hnsw
    ON candidates USING hnsw (career_trajectory_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS candidates_experience_vector_hnsw
    ON candidates USING hnsw (experience_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- GIN indexes
CREATE INDEX IF NOT EXISTS candidates_skills_primary_gin
    ON candidates USING gin (skills_primary);

CREATE INDEX IF NOT EXISTS candidates_skills_secondary_gin
    ON candidates USING gin (skills_secondary);

CREATE INDEX IF NOT EXISTS candidates_skills_exposure_gin
    ON candidates USING gin (skills_exposure);

CREATE INDEX IF NOT EXISTS candidates_job_titles_canonical_gin
    ON candidates USING gin (job_titles_canonical);

CREATE INDEX IF NOT EXISTS candidates_certifications_gin
    ON candidates USING gin (certifications);

CREATE INDEX IF NOT EXISTS candidates_business_domains_gin
    ON candidates USING gin (business_domains);

CREATE INDEX IF NOT EXISTS candidates_technical_domains_gin
    ON candidates USING gin (technical_domains);

CREATE INDEX IF NOT EXISTS candidates_search_tsvector_gin
    ON candidates USING gin (search_tsvector);

-- B-tree indexes
CREATE INDEX IF NOT EXISTS candidates_seniority_level_idx
    ON candidates (seniority_level);

CREATE INDEX IF NOT EXISTS candidates_years_of_experience_idx
    ON candidates (years_of_experience);

CREATE INDEX IF NOT EXISTS candidates_location_city_idx
    ON candidates (location_city);

CREATE INDEX IF NOT EXISTS candidates_availability_status_idx
    ON candidates (availability_status);

CREATE INDEX IF NOT EXISTS candidates_salary_expectation_min_idx
    ON candidates (salary_expectation_min);

CREATE INDEX IF NOT EXISTS candidates_salary_expectation_max_idx
    ON candidates (salary_expectation_max);
