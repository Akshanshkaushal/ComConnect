const baseUrl = process.env.AI_SERVICE_URL || "http://ai-service:5001";

const requestAiService = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.AI_SERVICE_TIMEOUT_MS || 120000)
  );

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": process.env.AI_SERVICE_TOKEN || "",
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(body.message || "AI service request failed");
      error.statusCode = response.status >= 500 ? 503 : response.status;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
};

const indexWorkspace = (workspaceId, documents) =>
  requestAiService(`/v1/workspaces/${workspaceId}/index`, {
    method: "POST",
    body: JSON.stringify({ documents }),
  });

const askWorkspace = (workspaceId, question) =>
  requestAiService(`/v1/workspaces/${workspaceId}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });

const planTasks = (workspaceId, request, members) =>
  requestAiService(`/v1/workspaces/${workspaceId}/task-plan`, {
    method: "POST",
    body: JSON.stringify({ request, members }),
  });

module.exports = { indexWorkspace, askWorkspace, planTasks };
