import { LinkIconButton } from '@atlaskit/button/new';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import TableTree from '@atlaskit/table-tree';
import { filesize } from 'filesize';
import React, { useState } from 'react';

import { RenderedContent } from '../RenderedContent';
import { previewableTypes } from './AttachmentForm';

type ItemData = {
    baseLinkUrl: string;
    attachment: any;
    delfunc: (attachment: any) => void;
};

type AttachmentListProps = {
    baseLinkUrl: string;
    attachments: any[];
    onDelete: (attachment: any) => void;
    fetchImage?: (url: string) => Promise<string>;
};

const Delete = (data: ItemData) => {
    return (
        <div className="ac-delete" onClick={() => data.delfunc(data.attachment)}>
            <TrashIcon label="trash" />
        </div>
    );
};

const ExternalLink = (data: ItemData) => {
    return (
        <LinkIconButton
            href={`${data.baseLinkUrl}/rest/api/2/attachment/content/${data.attachment.id}`}
            icon={(iconProps) => (
                <ShortcutIcon
                    {...iconProps}
                    size="small"
                    label="Open attachment"
                    primaryColor="var(--vscode-textLink-foreground)"
                />
            )}
            label="View in browser"
            appearance="subtle"
            spacing="compact"
            isTooltipDisabled={false}
        />
    );
};

const Size = (data: ItemData) => {
    const numSize = typeof data.attachment.size === 'number' ? data.attachment.size : parseFloat(data.attachment.size);
    const size = filesize(numSize);
    return <p style={{ display: 'inline' }}>{size}</p>;
};

export const AttachmentList: React.FunctionComponent<AttachmentListProps> = ({
    baseLinkUrl,
    attachments,
    onDelete,
    fetchImage,
}) => {
    const [selectedAttachment, setSelectedAttachment] = useState<any>(undefined);

    const Filename = (data: ItemData) =>
        previewableTypes.includes(data.attachment.mimeType) ? (
            <a style={{ display: 'inline' }} href="#" onClick={() => setSelectedAttachment(data.attachment)}>
                {data.attachment.filename}
            </a>
        ) : (
            <p>{data.attachment.filename}</p>
        );

    return (
        <React.Fragment>
            <TableTree
                columns={[Filename, ExternalLink, Size, Delete]}
                columnWidths={['100%', '50px', '150px', '50px']}
                items={attachments.map((attachment) => {
                    return {
                        id: attachment.id,
                        content: {
                            baseLinkUrl: baseLinkUrl,
                            attachment: attachment,
                            delfunc: onDelete,
                        },
                    };
                })}
            />
            <ModalTransition>
                {selectedAttachment && (
                    <Modal
                        heading={selectedAttachment.filename}
                        shouldCloseOnEscapePress
                        width="x-large"
                        onClose={() => setSelectedAttachment(undefined)}
                    >
                        <RenderedContent html={`<img src=${selectedAttachment.content} />`} fetchImage={fetchImage} />
                    </Modal>
                )}
            </ModalTransition>
        </React.Fragment>
    );
};
