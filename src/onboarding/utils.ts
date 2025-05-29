import { QuickInputButton, QuickPickItem, ThemeIcon } from 'vscode';

import { Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';

export const jiraOnboardingItems = [
    {
        iconPath: new ThemeIcon('cloud'),
        label: 'Sign in to Jira Cloud',
        description: 'For most of our users.',
        detail: 'The URL for accessing your site will typically be in the format mysite.atlassian.net.',
        onboardingId: 'onboarding:jira-cloud',
    },
    {
        iconPath: new ThemeIcon('server'),
        label: 'Sign in to Jira Server',
        description: 'For users with a custom site.',
        detail: 'The URL is usually a custom domain or IP address set up by your organization.',
        onboardingId: 'onboarding:jira-server',
    },
    {
        iconPath: new ThemeIcon('chevron-right'),
        label: "I don't have Jira",
        description: 'Skip this step',
        detail: 'You can always set up a new Jira account later.',
        onboardingId: 'onboarding:jira-skip',
    },
];

export const bitbucketOnboardingItems = [
    {
        iconPath: new ThemeIcon('cloud'),
        label: 'Sign in to Bitbucket Cloud',
        description: 'For most of our users.',
        detail: 'The URL for accessing your site will typically be in the format mysite.atlassian.net.',
        onboardingId: 'onboarding:bitbucket-cloud',
    },
    {
        iconPath: new ThemeIcon('server'),
        label: 'Sign in to Bitbucket Server',
        description: 'For users with a custom site.',
        detail: 'The URL is usually a custom domain or IP address set up by your organization.',
        onboardingId: 'onboarding:bitbucket-server',
    },
    {
        iconPath: new ThemeIcon('chevron-right'),
        label: "I don't have Bitbucket",
        description: 'Skip this step',
        detail: 'You can always set up a new Bitbucket account later.',
        onboardingId: 'onboarding:bitbucket-skip',
    },
];

export const onboardingHelperText = (product: Product, env: string) => {
    if (product.key === ProductJira.key) {
        const site = env === 'Cloud' ? 'cloud' : 'server';
        const baseUrl = env === 'Cloud' ? 'https://jira.atlassian.net' : 'https://jira.mydomain.com';
        return `You can enter a ${site} url like ${baseUrl}\n`;
    } else if (product.key === ProductBitbucket.key) {
        const site = env === 'Cloud' ? 'cloud' : 'server';
        const baseUrl = env === 'Cloud' ? 'https://bitbucket.org' : 'https://bitbucket.mydomain.com';
        return `You can enter a ${site} url like ${baseUrl}\n`;
    }
    return '';
};

export interface OnboardingQuickPickItem extends QuickPickItem {
    onboardingId: string;
}

export const OnboardingButtons: Record<string, QuickInputButton> = {
    settings: {
        iconPath: new ThemeIcon('gear'),
        tooltip: 'Configure in settings',
    },
    createApiToken: {
        iconPath: new ThemeIcon('link-external'),
        tooltip: 'Create API tokens',
    },
};

export enum OnboardingStep {
    Jira = 1,
    Bitbucket = 2,
}

export enum OnboardingInputBoxStep {
    Domain = 0,
    Username = 1,
    Password = 2,
}
