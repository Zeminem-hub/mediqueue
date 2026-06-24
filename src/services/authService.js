const STAFF_SESSION_KEY = "mediqueue_staff_session";

function saveStaffSession(session) {
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
}

export function getStaffSession() {
  const storedSession = localStorage.getItem(STAFF_SESSION_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession);
  } catch {
    localStorage.removeItem(STAFF_SESSION_KEY);
    return null;
  }
}

export function logoutStaff() {
  localStorage.removeItem(STAFF_SESSION_KEY);
}

// Placeholder auth services. Replace these implementations with Supabase calls later.
export async function loginDoctor({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const session = {
    id: "doctor-demo",
    role: "doctor",
    email,
  };

  saveStaffSession(session);
  return session;
}

export async function loginReceptionist({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const session = {
    id: "receptionist-demo",
    role: "receptionist",
    email,
  };

  saveStaffSession(session);
  return session;
}

export async function createDoctor({
  name,
  specialization,
  email,
  temporaryPassword,
}) {
  const session = getStaffSession();

  if (session?.role !== "receptionist") {
    throw new Error("Only receptionists can create doctor accounts.");
  }

  if (!name || !specialization || !email || !temporaryPassword) {
    throw new Error("All doctor details are required.");
  }

  return {
    id: crypto.randomUUID(),
    name,
    specialization,
    email,
  };
}
