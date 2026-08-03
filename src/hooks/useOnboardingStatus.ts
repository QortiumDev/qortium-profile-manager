import { useEffect, useRef, useState, useCallback } from 'react';
import { hasWalletCard, getFollowedNames } from '../api/qortal';
import { fetchGroupsByMember } from '../api/rest';

type S<T> = { loading: boolean; value: T };
const mk = <T,>(v: T): S<T> => ({ loading: true, value: v });

function probeImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export function useOnboardingStatus(address: string | null, primaryName: string | null) {
  const [avatar, setAvatar] = useState(mk<boolean>(false));
  const [groups, setGroups] = useState(mk<boolean>(false));
  const [walletCard, setWalletCard] = useState(mk<boolean>(false));
  const [followedNodes, setFollowedNodes] = useState(mk<boolean>(false));
  const requestId = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const id = ++requestId.current;
    const guard = <T,>(fn: (v: T) => void) => (v: T) => { if (requestId.current === id) fn(v); };
    const done = <T,>(set: (s: S<T>) => void) => (value: T) => guard(set)({ loading: false, value });
    const fail = <T,>(set: (s: S<T>) => void, fb: T) => () => guard(set)({ loading: false, value: fb });

    getFollowedNames().then(list => done(setFollowedNodes)(list.length > 0)).catch(fail(setFollowedNodes, false));

    if (!address) {
      setGroups({ loading: false, value: false });
    } else {
      fetchGroupsByMember(address).then(list => done(setGroups)(list.length > 0)).catch(fail(setGroups, false));
    }

    if (!primaryName) {
      setAvatar({ loading: false, value: false });
      setWalletCard({ loading: false, value: false });
    } else {
      probeImage(`/arbitrary/THUMBNAIL/${primaryName}/avatar`).then(done(setAvatar)).catch(fail(setAvatar, false));
      hasWalletCard(primaryName).then(done(setWalletCard)).catch(fail(setWalletCard, false));
    }
  }, [address, primaryName, refreshKey]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refetch();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refetch]);

  return { avatar, groups, walletCard, followedNodes, refetch };
}
