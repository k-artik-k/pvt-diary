import { supabase } from '../supabaseClient';

export function mapTagsToPostRelations(tags = []) {
  return tags.map((tag) => ({
    tag_id: tag.id,
    tags: tag
  }));
}

export async function syncPostTags(postId, previousTagIds = [], nextTagIds = []) {
  const tagIdsToRemove = previousTagIds.filter((tagId) => !nextTagIds.includes(tagId));
  const tagIdsToAdd = nextTagIds.filter((tagId) => !previousTagIds.includes(tagId));

  if (tagIdsToRemove.length > 0) {
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)
      .in('tag_id', tagIdsToRemove);

    if (error) {
      return { error };
    }
  }

  if (tagIdsToAdd.length > 0) {
    const { error } = await supabase
      .from('post_tags')
      .insert(tagIdsToAdd.map((tagId) => ({ post_id: postId, tag_id: tagId })));

    if (error) {
      return { error };
    }
  }

  return { error: null };
}

export async function duplicatePostWithTags(post, tags = []) {
  const title = post.title?.trim() || 'Untitled';
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: post.user_id,
      title: `${title} (Copy)`,
      subtitle: post.subtitle || '',
      body: post.body || '',
      is_markdown: post.is_markdown,
      is_draft: true,
      passphrase_hash: post.passphrase_hash || null,
      encrypted_body: post.encrypted_body || null,
      date_tag: post.date_tag || null,
      space_id: post.space_id || null
    })
    .select('*, spaces(id, name, icon, share_link)')
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  if (tags.length > 0) {
    const { error: tagError } = await supabase
      .from('post_tags')
      .insert(tags.map((tag) => ({ post_id: data.id, tag_id: tag.id })));

    if (tagError) {
      return { data, error: tagError };
    }
  }

  return { data, error: null };
}
