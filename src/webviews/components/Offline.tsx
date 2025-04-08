import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import * as React from 'react';

export default class Offline extends React.Component<{}, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <ModalTransition>
                <Modal
                    heading="Looks like you've gone offline"
                    shouldCloseOnEscapePress={false}
                    shouldCloseOnOverlayClick={false}
                >
                    <p style={{ color: 'var(--vscode-foreground)!important' }}>
                        This page will be available when you're back online.
                    </p>
                </Modal>
            </ModalTransition>
        );
    }
}
