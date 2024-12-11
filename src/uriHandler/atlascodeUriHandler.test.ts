import { AtlascodeUriHandler } from './atlascodeUriHandler';
import { Uri, window } from 'vscode';

describe('AtlascodeUriHandler', () => {
    const mockDispose = jest.fn();
    const mockShowErrorMessage = jest.fn();
    const mockRegisterUriHandler = jest.fn().mockImplementation(() => ({ dispose: mockDispose }));

    const uri = Uri.parse('https://some-uri');

    beforeEach(() => {
        jest.clearAllMocks();
        window.showErrorMessage = mockShowErrorMessage;
        window.registerUriHandler = mockRegisterUriHandler;
    });

    describe('create', () => {
        it('should create a new instance', () => {
            const uriHandler = AtlascodeUriHandler.create({} as any, {} as any);
            expect(uriHandler).not.toBeNull();
            expect(uriHandler).toBeInstanceOf(AtlascodeUriHandler);
        });
    });

    describe('handleUri', () => {
        it('shows error if the right action is not found', async () => {
            const uriHandler = new AtlascodeUriHandler([]);
            await uriHandler.handleUri(uri);
            expect(mockShowErrorMessage).toHaveBeenCalled();
        });

        it('shows error if action is found, but throws', async () => {
            const action = {
                isAccepted: jest.fn().mockReturnValue(true),
                handle: jest.fn().mockRejectedValue(new Error('oh no')),
            };
            const uriHandler = new AtlascodeUriHandler([action]);
            await uriHandler.handleUri(uri);
            expect(action.handle).toHaveBeenCalled();
            expect(mockShowErrorMessage).toHaveBeenCalled();
        });

        it('executes the action if found', async () => {
            const action = {
                isAccepted: jest.fn().mockReturnValue(true),
                handle: jest.fn().mockResolvedValue(undefined),
            };
            const uriHandler = new AtlascodeUriHandler([action]);
            await uriHandler.handleUri(uri);
            expect(action.handle).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('should dispose the uri handler', () => {
            const uriHandler = new AtlascodeUriHandler([]);
            uriHandler.dispose();
            expect(mockDispose).toHaveBeenCalled();
        });
    });
});
