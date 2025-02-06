import { InlineTextEditor, InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import { Box, FormHelperText, Grid, Link, Typography } from '@material-ui/core';
import Mustache from 'mustache';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useBorderBoxStyles } from '../common/useBorderBoxStyles';
import { ConfigControllerContext } from './configController';
import * as l10n from '@vscode/l10n';

type StartWorkSettings = {
    customTemplate: string;
    customPrefixes: string[];
};

export const StartWorkSettings: React.FunctionComponent<StartWorkSettings> = ({ customTemplate, customPrefixes }) => {
    const controller = useContext(ConfigControllerContext);
    const boxClass = useBorderBoxStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [template, setTemplate] = useState<string>(customTemplate);

    const handlePrefixesChange = useCallback((newOptions: string[]) => {
        const changes = Object.create(null);
        changes['jira.startWorkBranchTemplate.customPrefixes'] = newOptions;
        setChanges(changes);
    }, []);

    const handleTemplateChange = useCallback((template: string) => {
        setTemplate(template);
        const changes = Object.create(null);
        changes['jira.startWorkBranchTemplate.customTemplate'] = template;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    const getTemplatePreview = useCallback(() => {
        const view = {
            prefix: 'feature',
            PREFIX: 'FEATURE',
            issueKey: 'VSCODE-1005',
            issuekey: 'vscode-1005',
            summary: 'allow-users-to-configure-the-way-branch-name-is-co',
            SUMMARY: 'ALLOW-USERS-TO-CONFIGURE-THE-WAY-BRANCH-NAME-IS-CO',
        };

        //Mustache doesn't seem to throw errors in most cases when the template is invalid, it just ignores variables that are entered wrong.
        //However, it is possible to cause it to error if the entire format is messed up, so it's better to catch those cases than to
        //crash the entire page.
        try {
            return l10n.t('Preview: {0}', Mustache.render(template, view));
        } catch {
            return l10n.t('Invalid template: please follow the format described above');
        }
    }, [template]);

    return (
        <Grid container direction="column">
            <Grid item>
                <Box margin={2}>
                    <Typography variant="h4">{l10n.t('Custom Branch Template')}</Typography>

                    <Typography variant="caption">
                        Branch names will be generated based on the template. Use the keywords <code>prefix</code>,{' '}
                        <code>issueKey</code>, and <code>summary</code> surrounded by triple curly brackets to build a
                        template. Any of the keywords can be excluded if they are not needed, but do not put a
                        non-keyword in double curly brackets. E.g.{' '}
                        <code>{'{{{prefix}}}/{{{issueKey}}}-{{{summary}}}'}</code> will generate something of the format{' '}
                        <code>{'feature/VSCODE-1005-allow-users-to-configure-the-way-branch-name-is-co'}</code>
                        <br />
                        Upper-case: <code>PREFIX, SUMMARY</code>
                        <br />
                        Mixed-case: <code>Prefix, Summary, issueKey</code>
                        <br />
                        Lower-case: <code>prefix, issuekey, summary</code>
                    </Typography>

                    <Box marginTop={1} paddingBottom={2}>
                        <InlineTextEditor
                            fullWidth
                            label={l10n.t('Custom Template Text')}
                            defaultValue={customTemplate}
                            onSave={handleTemplateChange}
                        />
                        <FormHelperText id="my-helper-text">{getTemplatePreview()}</FormHelperText>
                    </Box>
                </Box>
            </Grid>
            <Grid item>
                <Box margin={2}>
                    <Typography variant="h4">{l10n.t('Custom Prefixes')}</Typography>

                    <Typography variant="caption">
                        <Typography variant="body2">
                            {l10n.t('For repos with no branching model, custom prefixes can be created here.')}
                        </Typography>
                        <Typography variant="body2">
                            <b>Bitbucket Users:</b> Prefixes are part of your branching model and can be configured on
                            the{' '}
                            <Link href="https://bitbucket.org/blog/introducing-bitbucket-branching-model-support">
                                {l10n.t('Bitbucket Website')}
                            </Link>
                        </Typography>
                    </Typography>

                    <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                        <InlineTextEditorList
                            options={customPrefixes}
                            reverseButtons={true}
                            addOptionButtonContent={l10n.t('Add Custom Prefix')}
                            inputLabel={l10n.t('Custom Prefix Text')}
                            onChange={handlePrefixesChange}
                            disabled={false}
                            emptyComponent={
                                <Box width="100%">
                                    <Typography align="center">{l10n.t('No prefixes found.')}</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};
