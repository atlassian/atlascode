import { Chip, Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';

type LozengeProps = {
    appearance: 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';
    label: string;
};

const useStyles = makeStyles((theme: Theme) => ({
    default: {
        color: '#42526E',
        backgroundColor: '#DFE1E6',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    inprogress: {
        color: '#0747A6',
        backgroundColor: '#DEEBFF',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    moved: {
        color: '#172B4D',
        backgroundColor: '#FFF0B3',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    new: {
        color: '#403294',
        backgroundColor: '#EAE6FF',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    removed: {
        color: '#BF2600',
        backgroundColor: '#FFEBE6',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    success: {
        color: '#006644',
        backgroundColor: '#E3FCEF',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
}));

const Lozenge: React.FC<LozengeProps> = ({ appearance, label }: LozengeProps) => {
    const classes = useStyles();
    return <Chip className={classes[appearance]} size="small" label={label} />;
};

export default Lozenge;
