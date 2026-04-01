function trimTrailingSlash(value = '') {
  return value.replace(/\/+$/, '');
}

export function getPublicAppOrigin() {
  const configuredOrigin = trimTrailingSlash(import.meta.env.VITE_PUBLIC_APP_URL || '');

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window !== 'undefined') {
    return trimTrailingSlash(window.location.origin);
  }

  return '';
}

export function getSharedSpaceUrl(shareLink) {
  return `${getPublicAppOrigin()}/shared/${shareLink}`;
}

export function getPostShareUrl(post) {
  if (post?.spaces?.share_link) {
    const url = new URL(getSharedSpaceUrl(post.spaces.share_link));
    url.searchParams.set('post', post.id);
    return url.toString();
  }

  return `${getPublicAppOrigin()}/post/${post.id}`;
}
