const PATIENT_PROFILE_KEY = "mediqueue_patient_profile";

export function savePatientProfile({ name, age, phone }) {
  if (!name || !age || !phone) {
    throw new Error("Patient name, age, and phone number are required.");
  }

  const profile = {
    name,
    age,
    phone,
    token: 13,
  };

  localStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function getPatientProfile() {
  const storedProfile = localStorage.getItem(PATIENT_PROFILE_KEY);

  if (!storedProfile) {
    return null;
  }

  try {
    return JSON.parse(storedProfile);
  } catch {
    localStorage.removeItem(PATIENT_PROFILE_KEY);
    return null;
  }
}

export function getPatientDisplayProfile() {
  return (
    getPatientProfile() || {
      name: "Patient Queue Entry",
      age: "Not provided",
      phone: "Not provided",
      token: 13,
    }
  );
}
