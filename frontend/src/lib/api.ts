const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

type LoginResponse = {
  ok: boolean
  user: {
    id: number
    email: string
    fname: string
    lname: string
    role: string
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse | null> {
  const body = new URLSearchParams()
  body.set("username", email)
  body.set("password", password)

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: "include",
    body,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Login failed")
  }

  if (res.status === 204) {
    return null
  }

  return res.json().catch(() => null)
}

type CurrentUserResponse = {
  id: number
  email: string
  fname: string
  lname: string
  role: string
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: "include",
  })

  if (res.status === 401) {
    return null
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Failed to fetch current user")
  }

  return res.json()
}

export async function logout() {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Logout failed")
  }

  return res.json().catch(() => null)
}

export type GmailMessage = {
  id: string
  thread_id: string | null
  label_ids: string[]
  snippet: string | null
  from_email: string | null
  to: string | null
  cc: string | null
  bcc: string | null
  subject: string | null
  date: string | null
  internal_date: string | null
  message_id: string | null
  references: string | null
  body: string | null
}

type GmailMessagesResponse = {
  messages: GmailMessage[]
  next_page_token: string | null
  result_size_estimate: number
}

type GetGmailMessagesOptions = {
  folder?: "inbox" | "starred" | "sent" | "archive"
  query?: string
  maxResults?: number
  includeBody?: boolean
}

function getFolderQuery(folder: GetGmailMessagesOptions["folder"]) {
  if (folder === "starred") return "is:starred"
  if (folder === "sent") return "in:sent"
  if (folder === "archive") return "-in:inbox -in:sent"
  return "in:inbox"
}

export async function getGmailMessages({
  folder = "inbox",
  query = "",
  maxResults = 20,
  includeBody = true,
}: GetGmailMessagesOptions = {}): Promise<GmailMessagesResponse> {
  const params = new URLSearchParams()
  const gmailQuery = [getFolderQuery(folder), query.trim()]
    .filter(Boolean)
    .join(" ")

  params.set("q", gmailQuery)
  params.set("max_results", String(maxResults))
  params.set("include_body", String(includeBody))

  const res = await fetch(`${API_BASE_URL}/api/email/messages?${params}`, {
    credentials: "include",
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Failed to fetch Gmail messages")
  }

  return res.json()
}

type SendEmailPayload = {
  recipients: string[]
  subject: string
  body: string
  html_body?: string | null
  class_id?: number | null
  classlist?: string | null
  prof?: string | null
}

export async function sendEmail(payload: SendEmailPayload) {
  const res = await fetch(`${API_BASE_URL}/api/email/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Failed to send email")
  }

  return res.json().catch(() => null)
}

type GmailMessageAction =
  | "read"
  | "unread"
  | "star"
  | "unstar"
  | "archive"
  | "trash"

export async function updateGmailMessage(
  messageId: string,
  action: GmailMessageAction,
) {
  const res = await fetch(`${API_BASE_URL}/api/email/messages/${messageId}/${action}`, {
    method: "POST",
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to update Gmail message")
  }

  return res.json().catch(() => null)
}

export type ClassRecord = {
  class_id: number
  name: string
  term: string
}

export type UserRecord = {
  id: number
  fname: string
  lname: string
  email: string
  role: string
}

export type StudentRecord = {
  student_id: number
  fname: string
  lname: string
  email: string
  classes: ClassRecord[]
}

export type ClassDetailRecord = ClassRecord & {
  students: Omit<StudentRecord, "classes">[]
  instructors: UserRecord[]
}

async function parseApiError(res: Response, fallback: string) {
  const errorData = await res.json().catch(() => null)
  return new Error(errorData?.detail || fallback)
}

export async function getStudents(): Promise<StudentRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/students`, {
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to fetch students")
  }

  return res.json()
}

export async function createStudent(payload: {
  fname: string
  lname: string
  email: string
}): Promise<StudentRecord> {
  const res = await fetch(`${API_BASE_URL}/api/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to create student")
  }

  const student = await res.json()
  return { ...student, classes: student.classes ?? [] }
}

export async function deleteStudent(studentId: number) {
  const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to delete student")
  }
}

export async function getClasses(): Promise<ClassRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/classes`, {
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to fetch classes")
  }

  return res.json()
}

export async function getClassDetail(classId: number): Promise<ClassDetailRecord> {
  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to fetch class")
  }

  return res.json()
}

export async function createClass(payload: {
  name: string
  term: string
}): Promise<ClassRecord> {
  const res = await fetch(`${API_BASE_URL}/api/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to create class")
  }

  return res.json()
}

export async function deleteClass(classId: number) {
  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to delete class")
  }
}

export async function enrollStudent(classId: number, studentId: number) {
  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ student_id: studentId }),
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to enroll student")
  }

  return res.json().catch(() => null)
}

export async function replyToEmail(messageId: string, payload: {
  body: string
  html_body?: string | null
}) {
  const res = await fetch(`${API_BASE_URL}/api/email/messages/${messageId}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Failed to send reply")
  }

  return res.json().catch(() => null)
}

export async function assignInstructor(classId: number, instructorId: number) {
  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/instructors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ instructor_id: instructorId }),
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to assign instructor")
  }

  return res.json().catch(() => null)
}

export async function removeStudentFromClass(classId: number, studentId: number) {
  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/students/${studentId}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to remove student from class")
  }
}

export async function removeInstructorFromClass(classId: number, instructorId: number) {
  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/instructors/${instructorId}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to remove instructor from class")
  }
}

export async function getUsers(): Promise<UserRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/users/`, {
    credentials: "include",
  })

  if (!res.ok) {
    throw await parseApiError(res, "Failed to fetch instructors")
  }

  return res.json()
}

export async function changePassword(password: string) {
  const res = await fetch(`${API_BASE_URL}/api/users/change-pass`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ password }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.detail || "Failed to change password")
  }

  return res.json().catch(() => null)
}
