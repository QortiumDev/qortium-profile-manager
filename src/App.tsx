import { useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { createAppTheme } from './theme/theme';
import { getColorTokens } from './theme/tokens';
import { ColorTokensContext } from './theme/ColorTokensContext';
import { themeAtom, accentAtom, accountAtom, accountLoadingAtom, accountErrorAtom, accountRetryAtom, uiStyleAtom } from './state/atoms';
import { EnumTheme } from './types';
import { AppRoutes } from './routes/Routes';
import { getUserAccount } from './api/qortal';

export function App() {
  const [theme] = useAtom(themeAtom);
  const [accent] = useAtom(accentAtom);
  const [uiStyle] = useAtom(uiStyleAtom);
  const setAccount = useSetAtom(accountAtom);
  const setAccountLoading = useSetAtom(accountLoadingAtom);
  const setAccountError = useSetAtom(accountErrorAtom);
  const retryCount = useAtomValue(accountRetryAtom);

  const mode = theme === EnumTheme.DARK ? 'dark' : 'light';
  const colors = useMemo(() => getColorTokens(mode, uiStyle, accent), [mode, uiStyle, accent]);
  const muiTheme = useMemo(
    () => createAppTheme({ mode, uiStyle, colors }),
    [mode, uiStyle, colors],
  );

  useEffect(() => {
    setAccountLoading(true);
    setAccountError(false);
    getUserAccount()
      .then(a => {
        setAccount({ address: a.address, name: a.name });
        setAccountLoading(false);
      })
      .catch(() => {
        setAccountLoading(false);
        setAccountError(true);
      });
  }, [retryCount, setAccount, setAccountLoading, setAccountError]);

  useEffect(() => {
    function onMessage(e: MessageEvent<unknown>) {
      if (
        (e.source === window.parent || e.source === window) &&
        typeof e.data === 'object' && e.data !== null &&
        (e.data as { action?: unknown }).action === 'SELECTED_ACCOUNT_CHANGED'
      ) {
        getUserAccount()
          .then(a => setAccount({ address: a.address, name: a.name }))
          .catch(() => {});
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setAccount]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ColorTokensContext.Provider value={colors}>
        <AppRoutes />
      </ColorTokensContext.Provider>
    </ThemeProvider>
  );
}
