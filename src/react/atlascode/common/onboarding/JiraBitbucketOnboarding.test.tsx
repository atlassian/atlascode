import React from 'react';
import { JiraBitbucketOnboarding } from './JiraBitbucketOnboarding';
import { render, screen } from '@testing-library/react';

const MockJiraComponent = ({ callback }: { callback?: () => void }) => {
    const jiraValueSet = {
        cloud: 'jira-setup-radio-cloud',
        server: 'jira-setup-radio-server',
        none: 'jira-setup-radio-none',
    };
    const [signInText, setSignInText] = React.useState('Sign in to Jira Cloud');
    const handleJiraOptionChange = React.useCallback((value: string) => {
        if (value === 'jira-setup-radio-cloud') {
            setSignInText('Sign in to Jira Cloud');
        } else if (value === 'jira-setup-radio-server') {
            setSignInText('Sign in to Jira Server');
        } else {
            setSignInText('Next');
        }
    }, []);
    return (
        <JiraBitbucketOnboarding
            valueSet={jiraValueSet}
            product="Jira"
            executeSetup={callback ?? (() => {})}
            signInText={signInText}
            handleOptionChange={handleJiraOptionChange}
        />
    );
};

describe('JiraBitbucketOnboarding', () => {
    it('should render with correct title', async () => {
        render(<MockJiraComponent />);
        expect(screen.getByText('Sign in to Jira')).toBeTruthy();
    });
    it('should render with correct radio options', async () => {
        render(<MockJiraComponent />);
        expect(screen.getByText('Cloud')).toBeTruthy();
        expect(screen.getByText('Server')).toBeTruthy();
        expect(screen.getByText("I don't have Jira")).toBeTruthy();
    });
    it('should select Jira Cloud on initial render', async () => {
        render(<MockJiraComponent />);
        expect(screen.getByText('Sign in to Jira Cloud')).toBeTruthy();
    });
    it('should change sign in text to Jira Server on radio change', async () => {
        render(<MockJiraComponent />);
        screen.getByText('Server').click();
        expect(screen.getByText('Sign in to Jira Server')).toBeTruthy();
    });
    it('should change sign in text to Next on radio change', async () => {
        render(<MockJiraComponent />);
        screen.getByText("I don't have Jira").click();
        expect(screen.getByText('Next')).toBeTruthy();
    });
    it('should call callback on select option', async () => {
        const callback = jest.fn();
        render(<MockJiraComponent callback={callback} />);
        screen.getByText('Sign in to Jira Cloud').click();
        expect(callback).toHaveBeenCalled();
    });
});
