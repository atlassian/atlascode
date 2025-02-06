import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Container, Grid, lighten, makeStyles, Typography } from '@material-ui/core';
import React from 'react';
import BitbucketIcon from '../icons/BitbucketIcon';
import { AltProductEnabler } from './AltProductEnabler';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
    selectionTitleText: {
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
    },
}));

export type ProductSelectorProps = {
    bitbucketToggleHandler: (enabled: boolean) => void;
    jiraToggleHandler: (enabled: boolean) => void;
    bitbucketEnabled: boolean;
    jiraEnabled: boolean;
};

export const ProductSelector: React.FunctionComponent<ProductSelectorProps> = ({
    bitbucketToggleHandler,
    jiraToggleHandler,
    jiraEnabled,
    bitbucketEnabled,
}) => {
    const classes = useStyles();

    return (
        <div className={classes.root}>
            <Grid container spacing={3} justify="center" alignItems={'stretch'}>
                <Grid item xs={12}>
                    <Typography variant="h1" align="center" className={classes.selectionTitleText}>
                        {l10n.t('Select the products you want to enable')}
                    </Typography>
                </Grid>
                <Grid item lg={6} md={10} sm={12} xs={12}>
                    <Container maxWidth="lg" disableGutters style={{ height: '100%' }}>
                        <AltProductEnabler
                            label={l10n.t('Jira')}
                            enabled={jiraEnabled}
                            onToggle={jiraToggleHandler}
                            subtext={l10n.t('Create and view Jira issues within VS Code')}
                            ProductIcon={<JiraIcon fontSize={'inherit'} />}
                        />
                    </Container>
                </Grid>
                <Grid item lg={6} md={10} sm={12} xs={12}>
                    <Container maxWidth="lg" disableGutters style={{ height: '100%' }}>
                        <AltProductEnabler
                            label={l10n.t('Bitbucket')}
                            enabled={bitbucketEnabled}
                            onToggle={bitbucketToggleHandler}
                            subtext={l10n.t('Pull requests, issues, and pipelines all within VS Code')}
                            ProductIcon={<BitbucketIcon color={'primary'} fontSize={'inherit'} />}
                        />
                    </Container>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3" align="center">
                        {l10n.t('Products can be enabled/disabled later in the extension settings')}
                    </Typography>
                </Grid>
            </Grid>
        </div>
    );
};

export default ProductSelector;
