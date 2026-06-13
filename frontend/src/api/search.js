export async function searchCandidates(query, filters = {}) {
  const response = await fetch("/api/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw_query: query,
      location_city: filters.location_city || null,
      seniority_level: filters.seniority_level ?? null,
      availability_status: filters.availability_status || null,
      required_skills: filters.required_skills || [],
      business_domains: filters.business_domains || [],
      salary_min: filters.salary_min ? filters.salary_min * 1000000 : null,
      salary_max: filters.salary_max ? filters.salary_max * 1000000 : null,
      experience_min: filters.experience_min || null,
      experience_max: filters.experience_max || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      technical_only: filters.technical_only || false
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Search request failed");
  }

  return response.json();
}
