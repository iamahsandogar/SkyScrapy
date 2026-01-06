import apiRequest from "../components/services/api";

const BASE_URL = "/api/leads/reminders";

export async function fetchReminders() {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch reminders: ${res.status}`);
  return res.json();
}

export async function createReminder(payload) {
  // Expected fields: { title, description, priority, due, checklist, members, status }
  return apiRequest("/api/leads/reminders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReminder(id, data) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update reminder: ${res.status}`);
  return res.json();
}

export async function updateReminderDue(id, dueISO) {
  // Patch only the due field (ISO string)
  return updateReminder(id, { due: dueISO });
}

export async function updateReminderMembers(id, members) {
  // Patch only the members field (array of member IDs or objects as your backend expects)
  return updateReminder(id, { members });
}

export async function deleteReminder(id) {
  // DELETE api/leads/reminders/{id}/
  return apiRequest(`/api/leads/reminders/${id}/`, {
    method: "DELETE",
  });
}
