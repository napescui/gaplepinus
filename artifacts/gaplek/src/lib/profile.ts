export interface Profile {
  profileId: string;
  nickname: string;
  avatar: string;
}

export const AVATARS = [
  "🐯", "🦁", "🐻", "🐼", "🐸", "🦊", "🐺", "🦝",
  "🐧", "🦅", "🦋", "🐉", "🎭", "👑", "🔥", "⚡",
];

const STORAGE_KEY = "gp_profile";

function generateId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.profileId && p?.nickname && p?.avatar) return p as Profile;
    return null;
  } catch {
    return null;
  }
}

export function saveProfile(nickname: string, avatar: string): Profile {
  const existing = loadProfile();
  const profile: Profile = {
    profileId: existing?.profileId ?? generateId(),
    nickname: nickname.trim().slice(0, 14),
    avatar,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function getOrCreateProfile(): Profile | null {
  return loadProfile();
}
