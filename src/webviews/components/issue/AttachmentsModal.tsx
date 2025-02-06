import Button, { ButtonGroup } from '@atlaskit/button';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import React, { useState } from 'react';
import { FileWithPath } from 'react-dropzone';
import { AttachmentForm } from './AttachmentForm';
import * as l10n from '@vscode/l10n';

type AttachmentsModalProps = {
    isOpen: boolean;
    onSave(files: FileWithPath[]): void;
    onCancel(): void;
};

const initialState: File[] = [];

export const AttachmentsModal: React.FunctionComponent<AttachmentsModalProps> = ({ isOpen, onSave, onCancel }) => {
    const [files, setFiles] = useState(initialState);

    const doSave = () => {
        onSave(files);
    };

    if (!isOpen) {
        return <React.Fragment />;
    }

    return (
        <ModalTransition>
            <Modal onClose={onCancel} heading={l10n.t('Add Attachment')} shouldCloseOnEscapePress={false}>
                <AttachmentForm onFilesChanged={setFiles} />
                <ButtonGroup>
                    <Button className="ac-button" onClick={doSave} isDisabled={files.length < 1}>
                        {l10n.t('Save')}
                    </Button>
                    <Button className="ac-button" onClick={onCancel}>
                        {l10n.t('Cancel')}
                    </Button>
                </ButtonGroup>
            </Modal>
        </ModalTransition>
    );
};
