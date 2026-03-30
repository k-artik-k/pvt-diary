import { supabase } from '../supabaseClient';

export async function exportAllData(userId) {
  const [
    { data: posts },
    { data: tags },
    { data: spaces },
    { data: postTags },
    { data: profile }
  ] = await Promise.all([
    supabase.from('posts').select('*').eq('user_id', userId),
    supabase.from('tags').select('*').eq('user_id', userId),
    supabase.from('spaces').select('*').eq('user_id', userId),
    supabase.from('post_tags').select('*').in(
      'post_id',
      (await supabase.from('posts').select('id').eq('user_id', userId)).data?.map(p => p.id) || []
    ),
    supabase.from('profiles').select('*').eq('id', userId).single()
  ]);

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    profile: profile?.data || profile,
    posts: posts || [],
    tags: tags || [],
    spaces: spaces || [],
    post_tags: postTags || []
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pvt-diary-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(userId, jsonFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version) throw new Error('Invalid export file');

        // Import tags first
        if (data.tags?.length) {
          const tagsToInsert = data.tags.map(t => ({
            ...t,
            user_id: userId,
            id: undefined
          }));
          const { error } = await supabase.from('tags').upsert(tagsToInsert, {
            onConflict: 'user_id,name'
          });
          if (error) console.warn('Tags import warning:', error);
        }

        // Import spaces
        if (data.spaces?.length) {
          for (const space of data.spaces) {
            await supabase.from('spaces').insert({
              ...space,
              user_id: userId,
              id: undefined,
              tag_id: null // we can't map old tag IDs reliably
            });
          }
        }

        // Import posts
        if (data.posts?.length) {
          for (const post of data.posts) {
            await supabase.from('posts').insert({
              ...post,
              user_id: userId,
              id: undefined,
              space_id: null
            });
          }
        }

        resolve({ success: true, message: 'Data imported successfully' });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(jsonFile);
  });
}
