import { render } from '@testing-library/react';
import React from 'react';

import { DialogMessage } from '../utils';
import { DialogMessageItem } from './DialogMessage';

describe('DialogMessageItem', () => {
    const onLinkClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not crash for tool permission requests with empty toolArgs', () => {
        const msg: DialogMessage = {
            event_kind: '_RovoDevDialog',
            type: 'toolPermissionRequest',
            title: 'Permission required',
            text: 'Need permission',
            toolName: 'grep',
            toolArgs: '',
            toolCallId: 'tool-call-id',
        };

        expect(() => {
            render(<DialogMessageItem msg={msg} onLinkClick={onLinkClick} />);
        }).not.toThrow();
    });
});
