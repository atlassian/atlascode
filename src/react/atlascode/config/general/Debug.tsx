import { InlineTextEditor, ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import {
    Divider,
    Fade,
    Grid,
    IconButton,
    Link,
    List,
    ListItem,
    ListItemText,
    makeStyles,
    Switch,
    Theme,
    Tooltip,
    Typography,
} from '@material-ui/core';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import clsx from 'clsx';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigControllerContext } from '../configController';
import * as l10n from '@vscode/l10n';

type DebugProps = {
    enableCurl: boolean;
    enableCharles: boolean;
    charlesCertPath: string;
    charlesDebugOnly: boolean;
    showCreateIssueProblems: boolean;
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            box: {
                marginLeft: theme.spacing(3),
                paddingLeft: theme.spacing(3),
                paddingRight: theme.spacing(1),
                paddingTop: theme.spacing(1),
                paddingBottom: theme.spacing(1),
                borderWidth: 1,
                borderColor: theme.palette.divider,
                borderStyle: 'solid',
            },
            hidden: {
                display: 'none',
            },
        }) as const,
);

interface FileWithPath extends File {
    readonly path: string;
}

interface FileWithWebkitPath extends File {
    readonly webkitRelativePath: string;
}

function toFileWithPath(f: File): FileWithPath {
    const { webkitRelativePath } = f as FileWithWebkitPath;
    Object.defineProperty(f, 'path', {
        value: typeof webkitRelativePath === 'string' && webkitRelativePath.length > 0 ? webkitRelativePath : f.name,
        writable: false,
        configurable: false,
        enumerable: true,
    });

    return f as FileWithPath;
}
export const Debug: React.FunctionComponent<DebugProps> = memo(
    ({ enableCurl, enableCharles, charlesCertPath, charlesDebugOnly, showCreateIssueProblems }) => {
        const controller = useContext(ConfigControllerContext);

        const classes = useStyles();

        const [changes, setChanges] = useState<{ [key: string]: any }>({});
        const handleCheckedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                const changes = Object.create(null);
                changes['charlesCertPath'] = toFileWithPath(e.target.files[0]).path;
                setChanges(changes);
            }
        }, []);

        const handleInlineEdit = useCallback((value: string) => {
            const changes = Object.create(null);
            changes['charlesCertPath'] = value;
            setChanges(changes);
        }, []);

        const fileAdorment = useMemo(() => {
            return (
                <div>
                    <input className={classes.hidden} id="cert-path-button" type="file" onChange={handleFileChange} />
                    <label htmlFor="cert-path-button">
                        <Tooltip title={l10n.t('Choose Certificate File')}>
                            <IconButton component="span">
                                <InsertDriveFileIcon fontSize="small" color="inherit" />
                            </IconButton>
                        </Tooltip>
                    </label>
                </div>
            );
        }, [classes.hidden, handleFileChange]);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, charlesCertPath, controller]);

        return (
            <Grid container direction="column" spacing={3}>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                size="small"
                                color="primary"
                                id="enableCurlLogging"
                                value="enableCurlLogging"
                                checked={enableCurl}
                                onChange={handleCheckedChange}
                            />
                        }
                        label={l10n.t('Output curl commands for every API call')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                size="small"
                                color="primary"
                                id="showCreateIssueProblems"
                                value="jira.showCreateIssueProblems"
                                checked={showCreateIssueProblems}
                                onChange={handleCheckedChange}
                            />
                        }
                        label={l10n.t('Show a link to view non-renderable fields on Jira create issue page')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                size="small"
                                color="primary"
                                id="enableCharles"
                                value="enableCharles"
                                checked={enableCharles}
                                onChange={handleCheckedChange}
                            />
                        }
                        label={l10n.t('Enable Charles Web Debug Proxy')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <Fade in={enableCharles} timeout={1000}>
                        <div
                            className={clsx(classes.box, {
                                [classes.hidden]: !enableCharles,
                            })}
                        >
                            <Grid container direction="column" spacing={3}>
                                <Grid item>
                                    <Typography variant="body1">
                                        When using Charles, you must{' '}
                                        <Link href="https://www.charlesproxy.com/documentation/using-charles/ssl-certificates/">
                                            save the Charles Root Certificate
                                        </Link>{' '}
                                        and provide the absolute path to it here
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <InlineTextEditor
                                        fullWidth
                                        label={l10n.t('Charles SSL Certificate Path')}
                                        defaultValue={charlesCertPath}
                                        InputProps={{ endAdornment: fileAdorment }}
                                        onSave={handleInlineEdit}
                                    />
                                </Grid>
                                <Grid item>
                                    <Typography variant="body1">
                                        You also need to{' '}
                                        <Link href="https://www.charlesproxy.com/documentation/proxying/ssl-proxying/">
                                            specify the following hosts in Charles
                                        </Link>{' '}
                                        to have SSL proxying enabled for them.
                                    </Typography>
                                    <List>
                                        <ListItem key="api.atlassian.com">
                                            <ListItemText primary="api.atlassian.com" />
                                        </ListItem>
                                        <Divider />
                                        <ListItem key="auth.atlassian.com">
                                            <ListItemText primary="auth.atlassian.com" />
                                        </ListItem>
                                        <Divider />
                                        <ListItem key="api.bitbucket.org">
                                            <ListItemText primary="api.bitbucket.org" />
                                        </ListItem>
                                        <Divider />
                                        <ListItem key="bitbucket.org">
                                            <ListItemText primary="bitbucket.org" />
                                        </ListItem>
                                        <Divider />
                                        <ListItem key="as.atlassian.com">
                                            <ListItemText primary="as.atlassian.com" />
                                        </ListItem>
                                        <Divider />
                                    </List>
                                </Grid>
                                <Grid item>
                                    <ToggleWithLabel
                                        control={
                                            <Switch
                                                size="small"
                                                color="primary"
                                                id="charelsDebugOnly"
                                                value="charlesDebugOnly"
                                                checked={charlesDebugOnly}
                                                onChange={handleCheckedChange}
                                            />
                                        }
                                        label={l10n.t(
                                            'Only enable Charles when debugging this extension (internal use)',
                                        )}
                                        spacing={1}
                                        variant="body1"
                                    />
                                </Grid>
                            </Grid>
                        </div>
                    </Fade>
                </Grid>
            </Grid>
        );
    },
);
