function buildUploadPayload(file, formData) {
  const payload = new FormData();
  payload.append("file", file);

  Object.entries(formData).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    payload.append(key, String(value));
  });

  return payload;
}

async function readErrorMessage(response, fallbackMessage) {
  const message = await response.text();
  return message || fallbackMessage;
}

export async function getCandidateById(candidateId) {
  const response = await fetch(`/api/v1/candidates/${encodeURIComponent(candidateId)}`);

  if (!response.ok) {
    const error = new Error(await readErrorMessage(response, "Candidate lookup failed"));
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function parsePreviewCandidateCv(file, formData) {
  const response = await fetch("/api/v1/candidates/parse-preview", {
    method: "POST",
    body: buildUploadPayload(file, formData)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "CV preview failed"));
  }

  return response.json();
}

export async function confirmSaveCandidateCv(candidateData) {
  const response = await fetch("/api/v1/candidates/confirm-save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ candidate_data: candidateData })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Candidate save failed"));
  }

  return response.json();
}