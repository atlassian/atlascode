import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil/console';

import { EditorStateProvider } from '../EditorStateContext';
import IssueMainPanel from './IssueMainPanel';

const mockSiteDetails: DetailedSiteInfo = {
    userId: 'user-123',
    id: '',
    name: '',
    avatarUrl: '',
    baseLinkUrl: '',
    baseApiUrl: '',
    isCloud: false,
    credentialId: '',
    host: '',
    product: {
        name: 'JIRA',
        key: 'jira',
    } as Product,
};

const mockFields = {
    description: {
        required: false,
        name: 'Description',
        key: 'description',
        uiType: 'input',
        displayOrder: 2,
        valueType: 'string',
        isMultiline: true,
        advanced: false,
        isArray: false,
        schema: 'description',
    } as FieldUI,
};
const mockFieldValues = {
    description: 'test description',
    'description.rendered': '<h1>test description</h1>\n',
};

const mockOnDeleteAttachment = jest.fn();
const mockHandleAddAttachments = jest.fn();
const mockHandleInlineEdit = jest.fn();
const mockHandleOpenIssue = jest.fn();
const mockOnDelete = jest.fn();
const mockOnFetchIssues = jest.fn();
const mockFetchUsers = jest.fn();
const mockFetchImage = jest.fn();

// Helper function to wrap components with EditorStateProvider for testing
const renderWithEditorProvider = (component: React.ReactElement) => {
    return render(<EditorStateProvider>{component}</EditorStateProvider>);
};

describe('IssueMainPanel with Atlaskit Editor', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    it('renders the main panel', async () => {
        await act(() =>
            renderWithEditorProvider(
                <IssueMainPanel
                    fields={mockFields}
                    fieldValues={mockFieldValues}
                    handleAddAttachments={mockHandleAddAttachments}
                    siteDetails={mockSiteDetails}
                    onDeleteAttachment={mockOnDeleteAttachment}
                    isEpic={false}
                    handleInlineEdit={mockHandleInlineEdit}
                    subtaskTypes={[]}
                    linkTypes={[]}
                    handleOpenIssue={mockHandleOpenIssue}
                    onDelete={mockOnDelete}
                    onFetchIssues={mockOnFetchIssues}
                    fetchUsers={mockFetchUsers}
                    fetchImage={mockFetchImage}
                    isAtlaskitEditorEnabled={true}
                />,
            ),
        );
        await screen.findByText('test description');
        expect(screen.getByText('test description')).toBeTruthy();
    }, 100000);

    it('renders editing description area', async () => {
        await act(() =>
            renderWithEditorProvider(
                <IssueMainPanel
                    fields={mockFields}
                    fieldValues={mockFieldValues}
                    handleAddAttachments={mockHandleAddAttachments}
                    siteDetails={mockSiteDetails}
                    onDeleteAttachment={mockOnDeleteAttachment}
                    isEpic={false}
                    handleInlineEdit={mockHandleInlineEdit}
                    subtaskTypes={[]}
                    linkTypes={[]}
                    handleOpenIssue={mockHandleOpenIssue}
                    onDelete={mockOnDelete}
                    onFetchIssues={mockOnFetchIssues}
                    fetchUsers={mockFetchUsers}
                    fetchImage={mockFetchImage}
                    isAtlaskitEditorEnabled={true}
                />,
            ),
        );
        const renderedDescription = await screen.findByTestId('issue.description');
        await act(async () => {
            fireEvent.click(renderedDescription);
        });

        const editor = await screen.findByLabelText('Rich text editor for comments');
        expect(editor).toBeTruthy();
    }, 100000);
});
