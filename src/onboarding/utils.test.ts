import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { onboardingHelperText } from './utils';

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
