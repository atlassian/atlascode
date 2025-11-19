import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Skeleton,
    Tooltip,
    Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useCallback, useState } from 'react';

const useStyles = makeStyles((theme) => ({
    dialogGifBox: {
        maxWidth: '100%',
        maxHeight: '100%',
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: 'DeepSkyBlue',
    },
}));

export type DemoDialogProps = {
    modalTitle: string;
    modalGifLink: string;
    modalDescription?: React.ReactNode;
    modalVisibility: boolean;
    onClose: () => void;
    action: () => void;
    actionNotAvailable?: boolean; //Sometimes meaningful actions are not available so the 'Try it!' button should be disabled
};

export const DemoDialog: React.FunctionComponent<DemoDialogProps> = ({
    modalTitle,
    modalGifLink,
    modalDescription,
    modalVisibility,
    onClose,
    action,
    actionNotAvailable,
}) => {
    const classes = useStyles();
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleModalClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleModalAction = useCallback(() => {
        action();
        onClose();
    }, [action, onClose]);

    const handleImageLoaded = useCallback((): void => {
        setImageLoaded(true);
    }, []);

    return (
        <Dialog fullWidth={true} maxWidth="md" open={modalVisibility} onClose={handleModalClose}>
            <DialogTitle>
                <Typography variant="h4">{modalTitle}</Typography>
            </DialogTitle>
            <DialogContent>
                <Box hidden={!modalDescription}>
                    <DialogContentText>{modalDescription}</DialogContentText>
                </Box>
                <Box hidden={imageLoaded}>
                    <Skeleton variant="rectangular" width="100%" height="400px" />
                </Box>
                <Box hidden={!imageLoaded}>
                    <img
                        aria-label={`Gif showing "${modalTitle}" action`}
                        className={classes.dialogGifBox}
                        src={modalGifLink}
                        onLoad={handleImageLoaded}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Tooltip
                    title={
                        actionNotAvailable
                            ? 'Not available for this action'
                            : 'Click to perform this action automatically'
                    }
                >
                    <span>
                        <Button
                            disabled={actionNotAvailable}
                            onClick={handleModalAction}
                            variant="contained"
                            color="primary"
                        >
                            Try it!
                        </Button>
                    </span>
                </Tooltip>
                <Button color="primary" onClick={handleModalClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};
