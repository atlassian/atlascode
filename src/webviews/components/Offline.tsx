import * as React from 'react';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import * as l10n from '@vscode/l10n';

export default class Offline extends React.Component<{}, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <ModalTransition>
                <Modal
                    heading={l10n.t("Looks like you've gone offline")}
                    shouldCloseOnEscapePress={false}
                    shouldCloseOnOverlayClick={false}
                >
                    <p style={{ color: 'var(--vscode-foreground)!important' }}>
                        {l10n.t("This page will be available when you're back online.")}
                    </p>
                </Modal>
            </ModalTransition>
        );
    }
}
