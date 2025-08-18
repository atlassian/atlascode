import { Theme } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';

export const useBorderBoxStyles = makeStyles(
    (theme: Theme) =>
        ({
            box: {
                borderWidth: 1,
                borderColor: theme.palette.divider,
                borderStyle: 'solid',
            },
        }) as const,
);
