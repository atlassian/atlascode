import React, { useCallback } from 'react';
import { Container, Typography, Radio, Button, Box, Card, CardActionArea, CardContent } from '@material-ui/core';
import { Product } from '../common/types';

type Props = {
    product: Product;
    handleOptionChange: (value: string) => void;
    executeSetup: () => void;
    handleNext: () => void;
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
                    <Radio size="small" checked={checked === value} />
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
    handleNext,
    handleBack,
    signInText,
    valueSet,
}) => {
    const [checked, setChecked] = React.useState('');

    const handleValueChange = useCallback(
        (value: string) => {
            setChecked(value);
            handleOptionChange(value);
        },
        [handleOptionChange],
    );

    return (
        <Container maxWidth="xs">
            <Box style={wrapperStyles} flexDirection="column">
                <Typography style={{ fontWeight: 'bold' }} variant="h2">
                    What version of {product} do you use?
                </Typography>
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
                    <Button
                        disabled={!handleBack}
                        onClick={() => {
                            handleBack && handleBack();
                        }}
                        size="small"
                    >
                        Back
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                            executeSetup();
                            handleNext();
                        }}
                    >
                        {signInText}
                    </Button>
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
    border: '1px solid token(color.border)',
    backgroundColor: 'token(color.background)',
};

const radioGroupStyles = {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
};
