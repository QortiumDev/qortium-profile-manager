import { useState, useEffect, useCallback } from 'react';
import { fetchFriends, publishFriends } from '../api/qortal';

export function useFriends(primaryName: string | null) {
  const [friends, setFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!primaryName) { setFriends([]); return; }
    setLoading(true);
    fetchFriends(primaryName).then(f => { setFriends(f); setLoading(false); });
  }, [primaryName]);

  const refresh = useCallback(async () => {
    if (!primaryName) return;
    const f = await fetchFriends(primaryName);
    setFriends(f);
  }, [primaryName]);

  const add = useCallback(async (name: string) => {
    if (!primaryName) throw new Error('No registered name.');
    const next = [...new Set([...friends, name])];
    setFriends(next);
    await publishFriends(primaryName, next);
  }, [primaryName, friends]);

  const remove = useCallback(async (name: string) => {
    if (!primaryName) throw new Error('No registered name.');
    const next = friends.filter(f => f !== name);
    setFriends(next);
    await publishFriends(primaryName, next);
  }, [primaryName, friends]);

  return { friends, loading, add, remove, refresh };
}
