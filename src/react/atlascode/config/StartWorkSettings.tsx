import { InlineTextEditor, InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import { Box, FormHelperText, Grid, Link, Typography } from '@mui/material';
import Mustache from 'mustache';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { useBorderBoxStyles } from '../common/useBorderBoxStyles';
import { ConfigControllerContext } from './configController';

type StartWorkSettings = {
    customTemplate: string;
    customPrefixes: string[];
};

export const StartWorkSettings: React.FunctionComponent<StartWorkSettings> = ({ customTemplate, customPrefixes }) => {
    const controller = useContext(ConfigControllerContext);
    const boxClass = useBorderBoxStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [template, setTemplate] = useState<string>(customTemplate);

    useEffect(() => {
        setTemplate(customTemplate);
    }, [customTemplate]);

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
        const usernameBase = 'trevinavery';
        const prefixBase = 'feature/';
        const issueKeyBase = 'VSCODE-257';
        const summaryBase = 'allow-users-to-configure-the-way-branch-name-is-co';
        const view = {
            username: usernameBase.toLowerCase(),
            UserName: usernameBase,
            USERNAME: usernameBase.toUpperCase(),
            prefix: prefixBase.toLowerCase(),
            Prefix: prefixBase,
            PREFIX: prefixBase.toUpperCase(),
            issuekey: issueKeyBase.toLowerCase(),
            IssueKey: issueKeyBase,
            issueKey: issueKeyBase,
            ISSUEKEY: issueKeyBase.toUpperCase(),
            summary: summaryBase.toLowerCase(),
            Summary: summaryBase,
            SUMMARY: summaryBase.toUpperCase(),
        };

        //Mustache doesn't seem to throw errors in most cases when the template is invalid, it just ignores variables that are entered wrong.
        //However, it is possible to cause it to error if the entire format is messed up, so it's better to catch those cases than to
        //crash the entire page.
        try {
            return `Preview: ${Mustache.render(template, view)}`;
        } catch {
            return 'Invalid template: please follow the format described above';
        }
    }, [template]);

    return (
        <Grid container direction="column">
            <Grid item>
                <Box margin={2}>
                    <Typography variant="h4">Custom Branch Template</Typography>

                    <Typography variant="caption">
                        Branch names will be generated based on the template. Use the keywords <code>username</code>,{' '}
                        <code>prefix</code>, <code>issuekey</code>, and <code>summary</code> surrounded by triple curly
                        brackets to build a template. Any of the keywords can be excluded if they are not needed, but do
                        not put a non-keyword in triple curly brackets.
                        <br />
                        E.g. <code>{'{{{username}}}/{{{prefix}}}{{{issueKey}}}-{{{summary}}}'}</code> will generate
                        something of the format:{' '}
                        <code>
                            {'trevinavery/feature/VSCODE-1005-allow-users-to-configure-the-way-branch-name-is-co'}
                        </code>
                        <br />
                        Note that <code>prefix</code> automatically appends a <code>/</code> character after it.
                        <br />
                        <br />
                        Upper-case: <code>USERNAME, PREFIX, ISSUEKEY, SUMMARY</code>
                        <br />
                        Mixed-case: <code>UserName, Prefix, IssueKey, Summary</code>
                        <br />
                        Lower-case: <code>username, prefix, issuekey, summary</code>
                    </Typography>

                    <Box marginTop={1} paddingBottom={2}>
                        <InlineTextEditor
                            fullWidth
                            label="Custom Template Text"
                            defaultValue={customTemplate}
                            onSave={handleTemplateChange}
                        />
                        <FormHelperText id="my-helper-text">{getTemplatePreview()}</FormHelperText>
                    </Box>
                </Box>
            </Grid>
            <Grid item>
                <Box margin={2}>
                    <Typography variant="h4">Custom Prefixes</Typography>

                    <Typography variant="caption">
                        <Typography variant="body2">
                            For repos with no branching model, custom prefixes can be created here.
                        </Typography>
                        <Typography variant="body2">
                            <b>Bitbucket Users:</b> Prefixes are part of your branching model and can be configured on
                            the{' '}
                            <Link href="https://bitbucket.org/blog/introducing-bitbucket-branching-model-support">
                                Bitbucket Website
                            </Link>
                        </Typography>
                    </Typography>

                    <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                        <InlineTextEditorList
                            options={customPrefixes}
                            reverseButtons={true}
                            addOptionButtonContent="Add Custom Prefix"
                            inputLabel="Custom Prefix Text"
                            onChange={handlePrefixesChange}
                            disabled={false}
                            emptyComponent={
                                <Box width="100%">
                                    <Typography align="center">No prefixes found.</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};
