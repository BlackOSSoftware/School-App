import RNFS from 'react-native-fs';

const SESSION_FILE = `${RNFS.DocumentDirectoryPath}/mmps-session.json`;

function normalizeSession(value) {
  const token = String(value?.token ?? '').trim();
  const role = String(value?.role ?? '').trim().toLowerCase();
  const user = value?.user && typeof value.user === 'object' ? value.user : null;
  if (!token || !role) {
    return null;
  }
  return { token, role, user };
}

export async function saveLocalSession(session) {
  const normalized = normalizeSession(session);
  if (!normalized) {
    return;
  }
  await RNFS.writeFile(SESSION_FILE, JSON.stringify(normalized), 'utf8');
}

export async function readLocalSession() {
  try {
    const exists = await RNFS.exists(SESSION_FILE);
    if (!exists) {
      return null;
    }
    const text = await RNFS.readFile(SESSION_FILE, 'utf8');
    const parsed = JSON.parse(text);
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export async function clearLocalSession() {
  try {
    const exists = await RNFS.exists(SESSION_FILE);
    if (exists) {
      await RNFS.unlink(SESSION_FILE);
    }
  } catch {
    // Ignore cleanup errors to avoid blocking logout.
  }
}
