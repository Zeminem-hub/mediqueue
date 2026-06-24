const ABSENT_TOKENS_KEY = "mediqueue_absent_tokens";

export function getAbsentTokens() {
  const storedTokens = localStorage.getItem(ABSENT_TOKENS_KEY);

  if (!storedTokens) {
    return [];
  }

  try {
    return JSON.parse(storedTokens);
  } catch {
    localStorage.removeItem(ABSENT_TOKENS_KEY);
    return [];
  }
}

export function isTokenAbsent(token) {
  return getAbsentTokens().includes(token);
}

export function markTokenAbsent(token) {
  const absentTokens = getAbsentTokens();

  if (absentTokens.includes(token)) {
    return absentTokens;
  }

  const nextAbsentTokens = [...absentTokens, token];
  localStorage.setItem(ABSENT_TOKENS_KEY, JSON.stringify(nextAbsentTokens));
  return nextAbsentTokens;
}
