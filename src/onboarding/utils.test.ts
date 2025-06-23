import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { onboardingHelperText, onboardingQuickPickItems } from './utils';

describe('onboardingHelperText', () => {
    it('should return correct helper text for Jira Cloud', () => {
        const text = onboardingHelperText(ProductJira, 'Cloud');
        expect(text).toContain('cloud');
        expect(text).toContain('atlassian.net');
        expect(text).toMatch(/You can enter a cloud url like https:\/\/jira\.atlassian\.net/);
    });

    it('should return correct helper text for Jira Server', () => {
        const text = onboardingHelperText(ProductJira, 'Server');
        expect(text).toContain('server');
        expect(text).toContain('jira.mydomain.com');
        expect(text).toMatch(/You can enter a server url like https:\/\/jira\.mydomain\.com/);
    });

    it('should return correct helper text for Bitbucket Cloud', () => {
        const text = onboardingHelperText(ProductBitbucket, 'Cloud');
        expect(text).toContain('cloud');
        expect(text).toContain('bitbucket.org');
        expect(text).toMatch(/You can enter a cloud url like https:\/\/bitbucket\.org/);
    });

    it('should return correct helper text for Bitbucket Server', () => {
        const text = onboardingHelperText(ProductBitbucket, 'Server');
        expect(text).toContain('server');
        expect(text).toContain('bitbucket.mydomain.com');
        expect(text).toMatch(/You can enter a server url like https:\/\/bitbucket\.mydomain\.com/);
    });

    it('should return empty string for unknown product', () => {
        const fakeProduct = { key: 'unknown' } as any;
        const text = onboardingHelperText(fakeProduct, 'Cloud');
        expect(text).toBe('');
    });

    it('should handle unknown environment gracefully', () => {
        const text = onboardingHelperText(ProductJira, 'UnknownEnv');
        expect(text).toContain('server');
        expect(text).toContain('jira.mydomain.com');
    });
});

describe('onboardingQuickPickItems', () => {
    it('should return correct quick pick items for Jira', () => {
        const items = onboardingQuickPickItems(ProductJira);

        expect(items).toHaveLength(3);

        // Check Cloud option
        expect(items[0].label).toBe('Sign in to Jira Cloud');
        expect(items[0].detail).toBe('For most users - site usually ends in .atlassian.net.');
        expect(items[0].onboardingId).toBe('onboarding:cloud');
        expect(items[0].iconPath).toBeDefined();

        // Check Server option
        expect(items[1].label).toBe('Sign in to Jira Server');
        expect(items[1].detail).toBe('For users with a custom site.');
        expect(items[1].onboardingId).toBe('onboarding:server');
        expect(items[1].iconPath).toBeDefined();

        // Check Skip option
        expect(items[2].label).toBe("I don't have Jira");
        expect(items[2].onboardingId).toBe('onboarding:skip');
        expect(items[2].iconPath).toBeDefined();
    });

    it('should return correct quick pick items for Bitbucket', () => {
        const items = onboardingQuickPickItems(ProductBitbucket);

        expect(items).toHaveLength(3);

        // Check Cloud option
        expect(items[0].label).toBe('Sign in to Bitbucket Cloud');
        expect(items[0].detail).toBe('For most users - site usually ends in .atlassian.net.');
        expect(items[0].onboardingId).toBe('onboarding:cloud');

        // Check Server option
        expect(items[1].label).toBe('Sign in to Bitbucket Server');
        expect(items[1].detail).toBe('For users with a custom site.');
        expect(items[1].onboardingId).toBe('onboarding:server');

        // Check Skip option
        expect(items[2].label).toBe("I don't have Bitbucket");
        expect(items[2].onboardingId).toBe('onboarding:skip');
    });

    it('should return items with proper structure and required properties', () => {
        const items = onboardingQuickPickItems(ProductJira);

        items.forEach((item) => {
            expect(item).toHaveProperty('label');
            expect(item).toHaveProperty('onboardingId');
            expect(item).toHaveProperty('iconPath');
            expect(typeof item.label).toBe('string');
            expect(typeof item.onboardingId).toBe('string');
            expect(item.label.length).toBeGreaterThan(0);
            expect(item.onboardingId.length).toBeGreaterThan(0);
        });
    });

    it('should return items with consistent onboarding IDs', () => {
        const jiraItems = onboardingQuickPickItems(ProductJira);
        const bitbucketItems = onboardingQuickPickItems(ProductBitbucket);

        // The onboarding IDs should be the same for both products
        expect(jiraItems[0].onboardingId).toBe('onboarding:cloud');
        expect(jiraItems[1].onboardingId).toBe('onboarding:server');
        expect(jiraItems[2].onboardingId).toBe('onboarding:skip');

        expect(bitbucketItems[0].onboardingId).toBe('onboarding:cloud');
        expect(bitbucketItems[1].onboardingId).toBe('onboarding:server');
        expect(bitbucketItems[2].onboardingId).toBe('onboarding:skip');
    });
});
