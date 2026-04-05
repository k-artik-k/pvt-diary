import { supabase } from '../supabaseClient';

function mapProfilesByUsername(profiles = []) {
  return new Map((profiles || []).map((profile) => [profile.username, profile]));
}

function decoratePerson(username, spaces, profile) {
  return {
    username,
    displayName: profile?.display_name || profile?.username || username,
    avatarUrl: profile?.avatar_url || '',
    spaceCount: spaces.length,
    spaces
  };
}

export async function fetchOwnedSpacePeople(userId) {
  if (!userId) return [];

  const { data: spacesData } = await supabase
    .from('spaces')
    .select('id, name, icon')
    .eq('user_id', userId)
    .order('name');

  const spaces = spacesData || [];
  if (spaces.length === 0) return [];

  const spaceIds = spaces.map((space) => space.id);
  const spacesById = new Map(spaces.map((space) => [space.id, space]));

  const { data: membersData } = await supabase
    .from('space_members')
    .select('space_id, member_username')
    .in('space_id', spaceIds)
    .order('member_username');

  const members = membersData || [];
  if (members.length === 0) return [];

  const usernames = [...new Set(members.map((member) => member.member_username).filter(Boolean))];

  const { data: profilesData } = usernames.length
    ? await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .in('username', usernames)
    : { data: [] };

  const profilesByUsername = mapProfilesByUsername(profilesData);
  const peopleMap = new Map();

  members.forEach((member) => {
    const username = member.member_username;
    if (!username) return;

    const space = spacesById.get(member.space_id);
    if (!space) return;

    if (!peopleMap.has(username)) {
      peopleMap.set(username, new Map());
    }

    peopleMap.get(username).set(space.id, space);
  });

  return [...peopleMap.entries()]
    .map(([username, personSpaces]) => decoratePerson(
      username,
      [...personSpaces.values()],
      profilesByUsername.get(username)
    ))
    .sort((left, right) =>
      (left.displayName || left.username).localeCompare(right.displayName || right.username)
    );
}

export async function fetchOwnedSpacePerson(userId, targetUsername) {
  if (!userId || !targetUsername) return null;

  const { data: spacesData } = await supabase
    .from('spaces')
    .select('id, name, icon')
    .eq('user_id', userId)
    .order('name');

  const spaces = spacesData || [];
  if (spaces.length === 0) return null;

  const spaceIds = spaces.map((space) => space.id);
  const spacesById = new Map(spaces.map((space) => [space.id, space]));

  const { data: membersData } = await supabase
    .from('space_members')
    .select('space_id, member_username')
    .eq('member_username', targetUsername)
    .in('space_id', spaceIds);

  const memberSpaces = [...new Set((membersData || []).map((member) => member.space_id))]
    .map((spaceId) => spacesById.get(spaceId))
    .filter(Boolean);

  if (memberSpaces.length === 0) return null;

  const { data: profileData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('username', targetUsername)
    .maybeSingle();

  return decoratePerson(targetUsername, memberSpaces, profileData);
}
