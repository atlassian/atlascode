import React, { useCallback } from 'react';
import { Container, Typography, Box, Card, CardActionArea, CardContent } from '@material-ui/core';
import { Product } from './types';
import { VSCodeRadio, VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { BitbucketOnboardingLogo } from '../icons/BitbucketOnboardingLogo';
import { JiraOnboardingLogo } from '../icons/JiraOnboardingLogo';

type Props = {
    product: Product;
    handleOptionChange: (value: string) => void;
    executeSetup: () => void;
    handleBack?: () => void;
    signInText: string;
    valueSet: {
        cloud: string;
        server: string;
        none: string;
    };
};
const OnboardingRadio = ({
    checked,
    handleValueChange,
    value,
    title,
    description,
}: {
    checked: string;
    handleValueChange: (v: string) => void;
    value: string;
    title: string;
    description?: string;
}) => {
    return (
        <Card variant="outlined" style={{ width: '100%' }}>
            <CardActionArea
                onClick={() => {
                    handleValueChange(value);
                }}
            >
                <CardContent style={formControlStyles}>
                    <VSCodeRadio checked={checked === value} />
                    <Box flexDirection={'column'}>
                        <Typography style={{ fontWeight: 'bold' }}>{title}</Typography>
                        {description && <Typography>{description}</Typography>}
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

export const JiraBitbucketOnboarding: React.FC<Props> = ({
    product,
    handleOptionChange,
    executeSetup,
    handleBack,
    signInText,
    valueSet,
}) => {
    const [checked, setChecked] = React.useState(valueSet.cloud);

    const handleValueChange = useCallback(
        (value: string) => {
            setChecked(value);
            handleOptionChange(value);
        },
        [handleOptionChange],
    );

    return (
        <Container style={{ justifyContent: 'center' }} maxWidth="xs">
            <Box style={wrapperStyles} flexDirection="column">
                {product === 'Jira' ? <JiraOnboardingLogo /> : <BitbucketOnboardingLogo />}
                <Typography variant="h2">What version of {product} do you use?</Typography>
                <Box flexDirection="column" style={radioGroupStyles}>
                    <OnboardingRadio
                        checked={checked}
                        handleValueChange={handleValueChange}
                        value={valueSet.cloud}
                        title="Cloud"
                        description="For most of our users. The URL for accessing your site will typically be in the format mysite.atlassian.net"
                    />
                    <OnboardingRadio
                        checked={checked}
                        handleValueChange={handleValueChange}
                        value={valueSet.server}
                        title="Server"
                        description="For users with a custom site. The URL is usually a custom domain or IP address set up by your organization"
                    />
                    <OnboardingRadio
                        checked={checked}
                        handleValueChange={handleValueChange}
                        value={valueSet.none}
                        title={product === 'Jira' ? "I don't have Jira" : "I don't have Bitbucket"}
                    />
                </Box>
                <Box
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        alignSelf: 'stretch',
                    }}
                >
                    <VSCodeButton
                        disabled={!handleBack}
                        onClick={() => {
                            handleBack && handleBack();
                        }}
                        appearance="secondary"
                    >
                        Back
                    </VSCodeButton>
                    <VSCodeButton
                        onClick={() => {
                            executeSetup();
                        }}
                    >
                        {signInText}
                    </VSCodeButton>
                </Box>
            </Box>
        </Container>
    );
};

const wrapperStyles = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
};

const formControlStyles = {
    display: 'flex',
    padding: '12px',
    alignItems: 'flex-start',
    gap: '8px',
    alignSelf: 'stretch',
    borderRadius: '4px',
};

const radioGroupStyles = {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
};
