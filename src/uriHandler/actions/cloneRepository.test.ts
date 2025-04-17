import { Uri, window } from 'vscode';

import { expansionCastTo } from '../../../testsutil';
import { CheckoutHelper } from '../../bitbucket/interfaces';
import { CloneRepositoryUriHandler } from './cloneRepository';

describe('CloneRepositoryUriHandlerAction', () => {
    const mockCheckoutHelper = {
        cloneRepository: jest.fn(),
    };
    let action: CloneRepositoryUriHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        action = new CloneRepositoryUriHandler(expansionCastTo<CheckoutHelper>(mockCheckoutHelper));
    });

    describe('isAccepted', () => {
        it('only accepts URIs ending with cloneRepository', () => {
            expect(action.isAccepted(Uri.parse('https://some-uri/cloneRepository'))).toBe(true);
            expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBe(false);
        });
    });

    describe('handle', () => {
        it('throws if required query params are missing', async () => {
            await expect(action.handle(Uri.parse('https://some-uri/cloneRepository'))).rejects.toThrow();
        });

        it('clones the repo and fires an event on success', async () => {
            mockCheckoutHelper.cloneRepository.mockResolvedValue(null);
            await action.handle(Uri.parse('https://some-uri/cloneRepository?q=one'));

            expect(mockCheckoutHelper.cloneRepository).toHaveBeenCalledWith('one');
        });

        it('shows an error message on failure', async () => {
            mockCheckoutHelper.cloneRepository.mockRejectedValue(new Error('oh no'));
            await expect(action.handle(Uri.parse('https://some-uri/cloneRepository?q=one'))).rejects.toThrow();

            expect(window.showErrorMessage).toHaveBeenCalled();
        });
    });
});
