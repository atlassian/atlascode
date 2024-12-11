import { Uri, window } from 'vscode';
import { CheckoutBranchUriHandlerAction } from './checkoutBranch';

describe('CheckoutBranchUriHandlerAction', () => {
    const mockAnalyticsApi = {
        fireDeepLinkEvent: jest.fn(),
    };
    const mockCheckoutHelper = {
        checkoutRef: jest.fn().mockResolvedValue(true),
    };
    let action: CheckoutBranchUriHandlerAction;

    beforeEach(() => {
        jest.clearAllMocks();
        action = new CheckoutBranchUriHandlerAction(mockCheckoutHelper as any, mockAnalyticsApi as any);
    });

    describe('handle', () => {
        it('throws if required query params are missing', async () => {
            await expect(action.handle(Uri.parse('https://some-uri/checkoutBranch'))).rejects.toThrow();
            await expect(
                action.handle(Uri.parse('https://some-uri/checkoutBranch?cloneUrl=...&ref=...')),
            ).rejects.toThrow();
            await expect(
                action.handle(Uri.parse('https://some-uri/checkoutBranch?cloneUrl=...&refType=...')),
            ).rejects.toThrow();
            await expect(
                action.handle(Uri.parse('https://some-uri/checkoutBranch?ref=...&refType=...')),
            ).rejects.toThrow();
        });

        it('checks out the branch and fires an event on success', async () => {
            mockCheckoutHelper.checkoutRef.mockResolvedValue(true);
            await action.handle(Uri.parse('https://some-uri/checkoutBranch?cloneUrl=one&ref=two&refType=three'));

            expect(mockCheckoutHelper.checkoutRef).toHaveBeenCalledWith('one', 'two', 'three', '');
            expect(mockAnalyticsApi.fireDeepLinkEvent).toHaveBeenCalled();
        });

        it('shows an error message on failure', async () => {
            mockCheckoutHelper.checkoutRef.mockRejectedValue(new Error('oh no'));
            await action.handle(Uri.parse('https://some-uri/checkoutBranch?cloneUrl=one&ref=two&refType=three'));

            expect(window.showErrorMessage).toHaveBeenCalled();
        });
    });
});
