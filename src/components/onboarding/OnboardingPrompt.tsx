import { Dialog, Box, Typography, Button } from '@mui/material';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

interface Props {
  open: boolean;
  onAnswer: (startChecklist: boolean) => void;
}

export function OnboardingPrompt({ open, onAnswer }: Props) {
  const c = useColors();

  return (
    <Dialog
      open={open}
      onClose={() => onAnswer(false)}
      PaperProps={{
        sx: {
          bgcolor: c.surface,
          borderRadius: `${tokens.shape.radius}px`,
          border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          maxWidth: 380,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <WavingHandIcon sx={{ color: c.accent }} />
          <Typography sx={{ fontSize: '1.05rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary }}>
            New here?
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary, lineHeight: 1.5, mb: 3 }}>
          Looks like you haven't registered a name yet. Want a short checklist to help you get set up?
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={() => onAnswer(false)}
            sx={{ color: c.textSecondary, fontSize: '0.78rem', borderRadius: '50px', px: 2 }}
          >
            No thanks
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => onAnswer(true)}
            sx={{
              bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5, fontSize: '0.78rem',
              '&:hover': { bgcolor: c.accentHover },
            }}
          >
            Yes, show me
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
