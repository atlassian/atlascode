import Modal, { ModalBody, ModalTransition } from '@atlaskit/modal-dialog';
import { Worklog } from '@atlassianlabs/jira-pi-common-models';
import React from 'react';

import WorklogForm from './WorklogForm';

type Props = {
    onClose: () => void;
    onSave: (val: any) => void;
    onCancel: () => void;
    originalEstimate: string;
    editingWorklog?: Worklog;
    worklogId?: string;
    triggerRef?: React.RefObject<HTMLElement>;
};

export const WorklogFormDialog = ({
    onClose,
    onSave,
    onCancel,
    originalEstimate,
    editingWorklog,
    worklogId,
    triggerRef,
}: Props) => (
    <div data-testid="worklog-modal-dialog">
        <ModalTransition>
            <Modal onClose={onClose} width="280" height="372" shouldReturnFocus={triggerRef}>
                <ModalBody>
                    <WorklogForm
                        onSave={onSave}
                        onCancel={onCancel}
                        originalEstimate={originalEstimate}
                        editingWorklog={editingWorklog}
                        worklogId={worklogId}
                    />
                </ModalBody>
            </Modal>
        </ModalTransition>
    </div>
);
