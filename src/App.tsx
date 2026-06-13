import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { lightTheme, darkTheme } from './theme/theme';
import { lightColors, darkColors, applyAccent } from './theme/tokens';
import { ColorTokensContext } from './theme/ColorTokensContext';
import { themeAtom, accentAtom, accountAtom, accountLoadingAtom, accountErrorAtom, accountRetryAtom } from './state/atoms';
import { EnumTheme } from './types';
import { AppRoutes } from './routes/Routes';
import { getUserAccount } from './api/qortal';

export function App() {
  const [theme] = useAtom(themeAtom);
  const [accent] = useAtom(accentAtom);
  const setAccount = useSetAtom(accountAtom);
  const setAccountLoading = useSetAtom(accountLoadingAtom);
  const setAccountError = useSetAtom(accountErrorAtom);
  const retryCount = useAtomValue(accountRetryAtom);

  const isDark = theme === EnumTheme.DARK;
  const muiTheme = isDark ? darkTheme : lightTheme;
  const colors = applyAccent(isDark ? darkColors : lightColors, accent);

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
