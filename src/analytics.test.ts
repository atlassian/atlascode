import { viewScreenEvent } from './analytics';

interface MockedData {
    getFirstAAID_value?: boolean;
}

const mockedData: MockedData = {};

jest.mock('./container', () => ({
    Container: { siteManager: { getFirstAAID: () => mockedData.getFirstAAID_value } },
}));

function setProcessPlatform(platform: NodeJS.Platform) {
    Object.defineProperty(process, 'platform', {
        value: platform,
        writable: false,
    });
}

describe('viewScreenEvent', () => {
    const originalPlatform = process.platform;

    beforeEach(() => {
        setProcessPlatform('win32');
        mockedData.getFirstAAID_value = true;
    });

    afterAll(() => {
        setProcessPlatform(originalPlatform);
    });

    it('should create a screen event with the correct screen name', async () => {
        const screenName = 'testScreen';
        const event = await viewScreenEvent(screenName);
        expect(event.name).toEqual(screenName);
        expect(event.screenEvent.attributes).toBeUndefined();
    });

    it('should exclude from activity if screen name is atlascodeWelcomeScreen', async () => {
        const screenName = 'atlascodeWelcomeScreen';
        const event = await viewScreenEvent(screenName);
        expect(event.screenEvent.attributes.excludeFromActivity).toBeTruthy();
    });

    it('should include site information if provided (cloud)', async () => {
        const screenName = 'testScreen';
        const site: any = {
            id: 'siteId',
            product: { name: 'Jira', key: 'jira' },
            isCloud: true,
        };
        const event = await viewScreenEvent(screenName, site);
        expect(event.screenEvent.attributes.instanceType).toEqual('cloud');
        expect(event.screenEvent.attributes.hostProduct).toEqual('Jira');
    });

    it('should include site information if provided (server)', async () => {
        const screenName = 'testScreen';
        const site: any = {
            id: 'siteId',
            product: { name: 'Jira', key: 'jira' },
            isCloud: false,
        };
        const event = await viewScreenEvent(screenName, site);
        expect(event.screenEvent.attributes.instanceType).toEqual('server');
        expect(event.screenEvent.attributes.hostProduct).toEqual('Jira');
    });

    it('should include product information if provided', async () => {
        const screenName = 'testScreen';
        const product = { name: 'Bitbucket', key: 'bitbucket' };
        const event = await viewScreenEvent(screenName, undefined, product);
        expect(event.screenEvent.attributes.hostProduct).toEqual('Bitbucket');
    });

    it('should set platform based on process.platform (win32)', async () => {
        setProcessPlatform('win32');
        const screenName = 'testScreen';
        const event = await viewScreenEvent(screenName);
        expect(event.screenEvent.platform).toEqual('windows');
    });

    it('should set platform based on process.platform (darwin)', async () => {
        setProcessPlatform('darwin');
        const screenName = 'testScreen';
        const event = await viewScreenEvent(screenName);
        expect(event.screenEvent.platform).toEqual('mac');
    });

    it('should set platform based on process.platform (linux)', async () => {
        setProcessPlatform('linux');
        const screenName = 'testScreen';
        const event = await viewScreenEvent(screenName);
        expect(event.screenEvent.platform).toEqual('linux');
    });

    it('should set platform based on process.platform (aix)', async () => {
        setProcessPlatform('aix');
        const screenName = 'testScreen';
        const event = await viewScreenEvent(screenName);
        expect(event.screenEvent.platform).toEqual('desktop');
    });
});
