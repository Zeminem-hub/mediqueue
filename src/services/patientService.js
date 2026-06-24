const PATIENT_PROFILE_KEY = "mediqueue_patient_profile";

export function savePatientProfile({ name, dob }) {
  if (!name || !dob) {
    throw new Error("Patient name and date of birth are required.");
  }

  const profile = {
    name,
    dob,
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
      dob: "Not provided",
      token: 13,
    }
  );
}
