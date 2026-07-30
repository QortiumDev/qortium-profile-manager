import { useEffect, useRef, useState } from 'react';
import { getAccountData, getBalance, getAccountNames } from '../api/qortal';
import {
  fetchGroupsByMember, fetchFirstTxTimestamp, fetchQdnResourceCount,
  fetchRewardShareCount, fetchRecentActivityCount,
} from '../api/rest';
import type { QortalAccount, QortalGroup, QortalName } from '../types';

type S<T> = { loading: boolean; value: T };
const mk = <T,>(v: T): S<T> => ({ loading: true, value: v });

export function useAccountStats(address: string | null, name: string | null) {
  const [acct, setAcct] = useState(mk<QortalAccount | null>(null));
  const [bal, setBal] = useState(mk<number | null>(null));
  const [statNames, setStatNames] = useState(mk<QortalName[]>([]));
  const [groups, setGroups] = useState(mk<QortalGroup[]>([]));
  const [firstTx, setFirstTx] = useState(mk<number | null>(null));
  const [qdnCount, setQdnCount] = useState(mk<number>(0));
  const [rewardShares, setRewardShares] = useState(mk<number>(0));
  const [activity, setActivity] = useState(mk<number>(0));
  const requestId = useRef(0);

  useEffect(() => {
    if (!address) return;
    const id = ++requestId.current;
    const guard = <T,>(fn: (v: T) => void) => (v: T) => { if (requestId.current === id) fn(v); };
    const done = <T,>(set: (s: S<T>) => void) => (value: T) => guard(set)({ loading: false, value });
    const fail = <T,>(set: (s: S<T>) => void, fb: T) => () => guard(set)({ loading: false, value: fb });

    setAcct(mk(null)); setBal(mk(null)); setStatNames(mk([])); setGroups(mk([]));
    setFirstTx(mk(null)); setQdnCount(mk(0)); setRewardShares(mk(0)); setActivity(mk(0));

    getAccountData(address).then(done(setAcct)).catch(fail(setAcct, null));
    getBalance(address).then(done(setBal)).catch(fail(setBal, null));
    getAccountNames(address).then(done(setStatNames)).catch(fail(setStatNames, []));
    fetchGroupsByMember(address).then(done(setGroups)).catch(fail(setGroups, []));
    fetchFirstTxTimestamp(address).then(done(setFirstTx)).catch(fail(setFirstTx, null));
    fetchRewardShareCount(address).then(done(setRewardShares)).catch(fail(setRewardShares, 0));
    fetchRecentActivityCount(address).then(done(setActivity)).catch(fail(setActivity, 0));
    if (name) {
      fetchQdnResourceCount(name).then(done(setQdnCount)).catch(fail(setQdnCount, 0));
    } else {
      setQdnCount({ loading: false, value: 0 });
    }
  }, [address, name]);

  return { acct, bal, statNames, groups, firstTx, qdnCount, rewardShares, activity };
}
