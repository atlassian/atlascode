import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { emptySiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { useJqlEditDialog } from './useJqlEditDialog';

const sites = [
    { ...emptySiteInfo, id: 'site-1', name: 'Jira 1' },
    { ...emptySiteInfo, id: 'site-2', name: 'Jira 2' },
];
const entries: JQLEntry[] = ['AAA', 'BBB'].map((name, i) => ({
    id: name,
    name,
    query: `project = ${name}`,
    siteId: sites[i].id,
    enabled: true,
    monitor: true,
}));

function Editor({ onSave }: { onSave: (entry: JQLEntry) => void }) {
    const { openJqlDialog, jqlDialog } = useJqlEditDialog(sites, onSave);
    return (
        <>
            <button onClick={() => openJqlDialog(true)}>Add JQL</button>
            {entries.map((entry) => (
                <button key={entry.id} onClick={() => openJqlDialog(true, entry)}>
                    Edit {entry.name}
                </button>
            ))}
            {jqlDialog}
        </>
    );
}

describe('useJqlEditDialog', () => {
    it('keeps saved values out of the next edit or new entry', async () => {
        const onSave = jest.fn();
        render(<Editor onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit AAA' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'CCC' } });
        await waitFor(() =>
            expect((screen.getByRole('combobox', { name: 'Enter JQL' }) as HTMLInputElement).disabled).toBe(false),
        );
        fireEvent.change(screen.getByRole('combobox', { name: 'Enter JQL' }), {
            target: { value: 'project = CCC' },
        });
        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Save JQL' }) as HTMLButtonElement).disabled).toBe(false),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Save JQL' }));
        await waitFor(() =>
            expect(onSave).toHaveBeenLastCalledWith({ ...entries[0], name: 'CCC', query: 'project = CCC' }),
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Edit BBB' }));
        expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('BBB');
        expect((screen.getByRole('combobox', { name: 'Enter JQL' }) as HTMLInputElement).value).toBe('project = BBB');
        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Save JQL' }) as HTMLButtonElement).disabled).toBe(false),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Save JQL' }));
        await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(entries[1]));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Add JQL' }));
        await waitFor(() =>
            expect((screen.getByRole('combobox', { name: 'Enter JQL' }) as HTMLInputElement).disabled).toBe(false),
        );
        expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('');
        expect((screen.getByRole('combobox', { name: 'Enter JQL' }) as HTMLInputElement).value).toBe('');
        expect((screen.getByRole('button', { name: 'Save JQL' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('discards cancelled edits when the same entry is reopened', async () => {
        const onSave = jest.fn();
        render(<Editor onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit AAA' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Draft' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Edit AAA' }));
        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Save JQL' }) as HTMLButtonElement).disabled).toBe(false),
        );
        expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('AAA');
        expect(onSave).not.toHaveBeenCalled();
    });
});
