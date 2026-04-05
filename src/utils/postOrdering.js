export function comparePostsByCreatedAt(a, b) {
  const aTime = new Date(a?.created_at || 0).getTime();
  const bTime = new Date(b?.created_at || 0).getTime();
  return bTime - aTime;
}

export function sortPostsByCreatedAt(posts = []) {
  return [...posts].sort(comparePostsByCreatedAt);
}
