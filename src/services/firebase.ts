export async function syncUserProfileToFirebase(user: any) {
  const existing = JSON.parse(localStorage.getItem('dinewise_firebase_users') || '[]');
  const filtered = existing.filter((u: any) => u.id !== user?.id);
  filtered.push({ ...user, updatedAt: new Date().toISOString() });
  localStorage.setItem('dinewise_firebase_users', JSON.stringify(filtered));
}

export async function saveReviewMirrorToFirebase(payload: any) {
  const existing = JSON.parse(localStorage.getItem('dinewise_firebase_reviews') || '[]');
  existing.push({ ...payload, createdAt: new Date().toISOString() });
  localStorage.setItem('dinewise_firebase_reviews', JSON.stringify(existing));
}
