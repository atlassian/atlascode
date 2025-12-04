import { UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { render } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil';

import CreateIssuePage from './CreateIssuePage';

// Mock all the dependencies
jest.mock('@atlaskit/button', () => ({
    __esModule: true,
    default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@atlaskit/button/loading-button', () => ({
    __esModule: true,
    default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@atlaskit/form', () => ({
    __esModule: true,
    default: ({ children, ...props }: any) => (
        <form {...props}>{typeof children === 'function' ? children({ formProps: {} }) : children}</form>
    ),
    Field: ({ children, label, ...props }: any) => (
        <div data-testid="form-field" {...props}>
            {label}
            {typeof children === 'function' ? children({ fieldProps: {} }) : children}
        </div>
    ),
    FormHeader: ({ children, title }: any) => (
        <div data-testid="form-header">
            {title}
            {children}
        </div>
    ),
    FormFooter: ({ children }: any) => <div data-testid="form-footer">{children}</div>,
    ErrorMessage: ({ children }: any) => <div>{children}</div>,
    RequiredAsterisk: () => <span>*</span>,
}));

jest.mock('@atlaskit/page', () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="page">{children}</div>,
}));

jest.mock('@atlaskit/select', () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="select">{props.value?.name || 'Select'}</div>,
    components: {
        Option: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        SingleValue: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

jest.mock('@atlaskit/spinner', () => ({
    __esModule: true,
    default: () => <div data-testid="spinner">Loading...</div>,
}));

jest.mock('../../ErrorBanner', () => ({
    __esModule: true,
    default: ({ errorDetails }: any) => <div data-testid="error-banner">Error: {errorDetails}</div>,
}));

jest.mock('../../AtlLoader', () => ({
    AtlLoader: () => <div data-testid="loader">Loading...</div>,
}));

jest.mock('../../Offline', () => ({
    __esModule: true,
    default: () => <div data-testid="offline">Offline</div>,
}));

jest.mock('../../pmfBanner', () => ({
    __esModule: true,
    default: () => <div data-testid="pmf-banner">PMF Banner</div>,
}));

jest.mock('../../../../react/atlascode/common/ErrorBoundary', () => ({
    AtlascodeErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

jest.mock('./Panel', () => ({
    Panel: ({ children, header }: any) => (
        <div data-testid="panel">
            {header}
            {children}
        </div>
    ),
}));

const mockSiteDetails: DetailedSiteInfo = {
    userId: 'user-123',
    id: 'site-1',
    name: 'Test Site',
    avatarUrl: '',
    baseLinkUrl: 'https://test.atlassian.net',
    baseApiUrl: 'https://test.atlassian.net/rest/api',
    isCloud: true,
    credentialId: 'cred-1',
    host: 'test.atlassian.net',
    product: {
        name: 'JIRA',
        key: 'jira',
    } as Product,
};

describe('CreateIssuePage', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');

        // Mock acquireVsCodeApi
        (global as any).acquireVsCodeApi = jest.fn(() => ({
            postMessage: jest.fn(),
            setState: jest.fn(),
            getState: jest.fn(() => ({})),
        }));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Error state rendering', () => {
        it('should show ErrorBanner and form content when isErrorBannerOpen is true', () => {
            const component = new CreateIssuePage({});
            component.state = {
                ...component.state,
                isErrorBannerOpen: true,
                errorDetails: 'Test error message',
                siteDetails: mockSiteDetails,
                fieldValues: {
                    issuetype: { id: '1', name: 'Task' },
                    project: { key: 'TEST', name: 'Test Project' },
                },
                fields: {
                    summary: {
                        key: 'summary',
                        name: 'Summary',
                        required: true,
                        uiType: UIType.Input,
                        displayOrder: 1,
                        valueType: ValueType.String,
                        advanced: false,
                        isArray: false,
                        schema: 'summary',
                    },
                },
                selectFieldOptions: {
                    site: [mockSiteDetails],
                },
            };

            const { container, queryByTestId } = render(component.render());

            // Error banner should be visible
            expect(queryByTestId('error-banner')).not.toBeNull();
            expect(container.textContent).toContain('Error:');
            expect(container.textContent).toContain('Test error message');

            // Form elements SHOULD also be visible (content always shows now)
            expect(queryByTestId('form-header')).not.toBeNull();
            expect(queryByTestId('form-footer')).not.toBeNull();
        });

        it('should show form content when isErrorBannerOpen is false', () => {
            const component = new CreateIssuePage({});
            component.state = {
                ...component.state,
                isErrorBannerOpen: false,
                errorDetails: undefined,
                siteDetails: mockSiteDetails,
                fieldValues: {
                    issuetype: { id: '1', name: 'Task' },
                    project: { key: 'TEST', name: 'Test Project' },
                },
                fields: {
                    summary: {
                        key: 'summary',
                        name: 'Summary',
                        required: true,
                        uiType: UIType.Input,
                        displayOrder: 1,
                        valueType: ValueType.String,
                        advanced: false,
                        isArray: false,
                        schema: 'summary',
                    },
                },
                selectFieldOptions: {
                    site: [mockSiteDetails],
                },
            };

            const { container, queryByTestId } = render(component.render());

            // Form elements should be visible
            expect(queryByTestId('form-header')).not.toBeNull();
            expect(queryByTestId('form-footer')).not.toBeNull();

            // Error banner should NOT be visible
            expect(queryByTestId('error-banner')).toBeNull();
            expect(container.textContent).not.toContain('Error:');
        });
    });
});
