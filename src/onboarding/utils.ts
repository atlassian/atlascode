import { QuickInputButton, QuickPickItem, ThemeIcon } from 'vscode';

import { Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';

export const onboardingQuickPickItems = (product: Product) => {
    return [
        {
            iconPath: new ThemeIcon('cloud'),
            label: `Sign in to ${product.name} Cloud`,
            detail: 'For most users - site usually ends in .atlassian.net.',
            onboardingId: 'onboarding:cloud',
        },
        {
            iconPath: new ThemeIcon('server'),
            label: `Sign in to ${product.name} Server`,
            detail: 'For users with a custom site.',
            onboardingId: 'onboarding:server',
        },
        {
            iconPath: new ThemeIcon('live-share'),
            label: `I don't have ${product.name}`,
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
        tooltip: 'Settings',
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
