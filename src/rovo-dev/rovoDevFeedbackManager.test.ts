import { Container } from 'src/container';
import { getAxiosInstance } from 'src/jira/jira-client/providers';
import { Logger } from 'src/logger';
import * as vscode from 'vscode';

import { RovoDevFeedbackManager } from './rovoDevFeedbackManager';

jest.mock('src/container');
jest.mock('src/jira/jira-client/providers');
jest.mock('src/logger');
jest.mock('vscode');
jest.mock('lodash', () => ({
    ...jest.requireActual('lodash'),
    truncate: jest.fn((str, options) => str),
}));

describe('RovoDevFeedbackManager', () => {
    const mockTransport = jest.fn();
    const mockSiteManager = {
        primarySite: { id: 'test-site' },
    };
    const mockCredentialManager = {
        getAuthInfo: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAxiosInstance as jest.Mock).mockReturnValue(mockTransport);
        (Container as any).siteManager = mockSiteManager;
        (Container as any).credentialManager = mockCredentialManager;
        (Container as any).version = '1.0.0';
        (vscode as any).version = '1.60.0';
        mockTransport.mockResolvedValue({});
    });

    describe('submitFeedback', () => {
        it('should submit general feedback with default user info when canContact is false', async () => {
            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'This is general feedback',
                canContact: false,
            };
            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.stringContaining('jsd-widget.atlassian.com'),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({ id: 'email', value: 'do-not-reply@atlassian.com' }),
                            expect.objectContaining({ id: 'customfield_10045', value: 'unknown' }),
                            expect.objectContaining({ id: 'customfield_10042', value: { id: '10106' } }),
                        ]),
                    }),
                }),
            );
        });

        it('should submit bug feedback with user info when canContact is true', async () => {
            const mockUser = {
                email: 'user@example.com',
                displayName: 'Test User',
            };
            mockCredentialManager.getAuthInfo.mockResolvedValue({ user: mockUser });

            const feedback = {
                feedbackType: 'bug' as const,
                feedbackMessage: 'This is a bug report',
                canContact: true,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({ id: 'email', value: 'user@example.com' }),
                            expect.objectContaining({ id: 'customfield_10045', value: 'Test User' }),
                            expect.objectContaining({ id: 'customfield_10042', value: { id: '10105' } }),
                            expect.objectContaining({ id: 'customfield_10043', value: [{ id: '10109' }] }),
                        ]),
                    }),
                }),
            );
        });

        it('should submit reportContent feedback', async () => {
            const feedback = {
                feedbackType: 'reportContent' as const,
                feedbackMessage: 'Inappropriate content',
                canContact: false,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'description',
                                value: expect.stringContaining('*Inappropriate content report:* Inappropriate content'),
                            }),
                            expect.objectContaining({ id: 'customfield_10042', value: { id: '10105' } }),
                        ]),
                    }),
                }),
            );
        });

        it('should include last ten messages when provided', async () => {
            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'Test feedback',
                canContact: false,
                lastTenMessages: ['Message 1', 'Message 2', 'Message 3'],
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'description',
                                value: expect.stringContaining('Message 1\n\nMessage 2\n\nMessage 3'),
                            }),
                        ]),
                    }),
                }),
            );
        });

        it('should show success message when feedback is submitted successfully', async () => {
            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'Test feedback',
                canContact: false,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);
            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Thank you for your feedback!');
        });

        it('should handle submission error and show error message', async () => {
            const error = new Error('Network error');
            mockTransport.mockRejectedValue(error);

            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'Test feedback',
                canContact: false,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(Logger.error).toHaveBeenCalledWith(error, 'Error submitting Rovo Dev feedback');
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'There was an error submitting your feedback. Please try again later.',
            );
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should include context information in payload: BBY', async () => {
            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'Test feedback',
                canContact: false,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback, true);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'customfield_10047',
                                value: expect.stringContaining('"component": "Boysenberry - vscode"'),
                            }),
                        ]),
                    }),
                }),
            );
        });

        it('should include context information in payload: IDE', async () => {
            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'Test feedback',
                canContact: false,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'customfield_10047',
                                value: expect.stringContaining('"component": "IDE - vscode"'),
                            }),
                        ]),
                    }),
                }),
            );
        });

        it('should handle missing primary site gracefully', async () => {
            (Container as any).siteManager.primarySite = null;

            const feedback = {
                feedbackType: 'general' as const,
                feedbackMessage: 'Test feedback',
                canContact: true,
            };

            await RovoDevFeedbackManager.submitFeedback(feedback);

            expect(mockTransport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    data: expect.objectContaining({
                        fields: expect.arrayContaining([
                            expect.objectContaining({ id: 'email', value: 'do-not-reply@atlassian.com' }),
                            expect.objectContaining({ id: 'customfield_10045', value: 'unknown' }),
                        ]),
                    }),
                }),
            );
        });
    });
});
