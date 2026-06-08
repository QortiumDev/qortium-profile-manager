import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAtom, useSetAtom } from 'jotai';
import { lightTheme, darkTheme } from './theme/theme';
import { lightColors, darkColors } from './theme/tokens';
import { ColorTokensContext } from './theme/ColorTokensContext';
import { themeAtom, accountAtom } from './state/atoms';
import { EnumTheme } from './types';
import { AppRoutes } from './routes/Routes';
import { getUserAccount } from './api/qortal';

export function App() {
  const [theme] = useAtom(themeAtom);
  const setAccount = useSetAtom(accountAtom);

  const isDark = theme === EnumTheme.DARK;
  const muiTheme = isDark ? darkTheme : lightTheme;
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    getUserAccount()
      .then(a => setAccount({ address: a.address, name: a.name }))
      .catch(() => {});
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
