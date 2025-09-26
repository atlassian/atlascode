import { Checkbox, FormControlLabel, Typography } from '@mui/material';
import React from 'react';

interface RovoDevToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const RovoDevToggle: React.FunctionComponent<RovoDevToggleProps> = ({ checked, onChange }) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.checked);
    };

    return (
        <FormControlLabel
            control={<Checkbox checked={checked} onChange={handleChange} color="primary" />}
            label={
                <Typography variant="body1" style={{ fontWeight: 500 }}>
                    Start work with Rovo Dev
                </Typography>
            }
        />
    );
};
