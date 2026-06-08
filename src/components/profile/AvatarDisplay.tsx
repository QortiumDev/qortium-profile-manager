import { useState } from 'react';
import { Box } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

interface Props {
  name: string | null;
  size?: number;
}

export function AvatarDisplay({ name, size = 96 }: Props) {
  const c = useColors();
  const [errored, setErrored] = useState(false);

  if (!name || errored) {
    return (
      <Box
        sx={{
          width: size, height: size,
          borderRadius: '50%',
          bgcolor: c.borderLight,
          border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PersonIcon sx={{ fontSize: size * 0.45, color: c.textSecondary }} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={`/arbitrary/THUMBNAIL/${name}/qortal_avatar`}
      alt={name}
      onError={() => setErrored(true)}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
}
