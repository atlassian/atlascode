import { QuickInputButton, QuickPickItem, ThemeIcon } from 'vscode';

import { Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';

export const onboardingQuickPickItems = (product: Product) => {
    return [
        {
            iconPath: new ThemeIcon('cloud'),
            label: `Sign in to ${product.name} Cloud`,
            description: 'For most of our users.',
            detail: 'The URL for accessing your site will typically be in the format mysite.atlassian.net.',
            onboardingId: 'onboarding:cloud',
        },
        {
            iconPath: new ThemeIcon('server'),
            label: `Sign in to ${product.name} Server`,
            description: 'For users with a custom site.',
            detail: 'The URL is usually a custom domain or IP address set up by your organization.',
            onboardingId: 'onboarding:server',
        },
        {
            iconPath: new ThemeIcon('debug-step-over'),
            label: `I don't have ${product.name}`,
            description: 'Skip this step',
            detail: `You can always set up a new ${product.name} account later.`,
            onboardingId: 'onboarding:skip',
        },
    ];
};

export const onboardingHelperText = (product: Product, env: string) => {
    if (product !== ProductJira && product !== ProductBitbucket) {
        return '';
    }

    const site = env === 'Cloud' ? 'cloud' : 'server';
    let baseUrl = '';

    if (product.key === ProductJira.key) {
        baseUrl = env === 'Cloud' ? 'https://jira.atlassian.net' : 'https://jira.mydomain.com';
    } else if (product.key === ProductBitbucket.key) {
        baseUrl = env === 'Cloud' ? 'https://bitbucket.org' : 'https://bitbucket.mydomain.com';
    }

    return `You can enter a ${site} url like ${baseUrl}\n`;
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
        iconPath: new ThemeIcon('key'),
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
