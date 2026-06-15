import {
    getProductName,
    getRovoDevWebviewStaticConfig,
    isRebrandJCAEnabled,
    JIRA_CODING_AGENT_PRODUCT_NAME,
    ROVO_DEV_PRODUCT_NAME,
    ROVODEV_STATIC_CONFIG_GLOBAL,
    RovodevStaticConfig,
} from './rovodevStaticConfig';

describe('rovodevStaticConfig', () => {
    const originalRebrandValue = process.env.ROVODEV_REBRAND_JCA;

    beforeEach(() => {
        (globalThis as any).window = {};
    });

    afterEach(() => {
        if (originalRebrandValue === undefined) {
            delete process.env.ROVODEV_REBRAND_JCA;
        } else {
            process.env.ROVODEV_REBRAND_JCA = originalRebrandValue;
        }

        delete (globalThis as any).window;
    });

    it('returns Rovo Dev when the rebrand env var is unset', () => {
        delete process.env.ROVODEV_REBRAND_JCA;

        expect(isRebrandJCAEnabled()).toBe(false);
        expect(RovodevStaticConfig.isRebrandJCA).toBe(false);
        expect(getProductName()).toBe(ROVO_DEV_PRODUCT_NAME);
        expect(getRovoDevWebviewStaticConfig()).toEqual({
            productName: ROVO_DEV_PRODUCT_NAME,
            isRebrandJCA: false,
        });
    });

    it('returns Rovo Dev when the rebrand env var is false', () => {
        process.env.ROVODEV_REBRAND_JCA = 'false';

        expect(isRebrandJCAEnabled()).toBe(false);
        expect(RovodevStaticConfig.isRebrandJCA).toBe(false);
        expect(getProductName()).toBe(ROVO_DEV_PRODUCT_NAME);
    });

    it('returns Jira Coding Agent when the runtime rebrand env var is true', () => {
        process.env.ROVODEV_REBRAND_JCA = 'true';

        expect(isRebrandJCAEnabled()).toBe(true);
        expect(RovodevStaticConfig.isRebrandJCA).toBe(true);
        expect(getProductName()).toBe(JIRA_CODING_AGENT_PRODUCT_NAME);
        expect(getRovoDevWebviewStaticConfig()).toEqual({
            productName: JIRA_CODING_AGENT_PRODUCT_NAME,
            isRebrandJCA: true,
        });
    });

    it('uses the injected webview config before reading runtime env', () => {
        process.env.ROVODEV_REBRAND_JCA = 'false';
        (globalThis as any).window[ROVODEV_STATIC_CONFIG_GLOBAL] = {
            productName: JIRA_CODING_AGENT_PRODUCT_NAME,
            isRebrandJCA: true,
        };

        expect(RovodevStaticConfig.isRebrandJCA).toBe(true);
        expect(getProductName()).toBe(JIRA_CODING_AGENT_PRODUCT_NAME);
    });
});
