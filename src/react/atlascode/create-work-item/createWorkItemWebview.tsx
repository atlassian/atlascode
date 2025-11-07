import './CreateWorkItem.css';

import Form from '@atlaskit/form';
import React from 'react';
import { CreateWorkItemWebviewProviderMessage } from 'src/work-items/create-work-item/messages/createWorkItemWebviewProviderMessages';

import { useMessagingApi } from '../messagingApi';

export type WorkItemFieldValues = {
    summary: string;
    description?: string;
};

const CreateWorkItemWebview: React.FC = () => {
    const [workItemFields, setWorkItemFields] = React.useState<WorkItemFieldValues>({
        summary: '',
        description: undefined,
    });

    const onMessageHandler = React.useCallback((msg: CreateWorkItemWebviewProviderMessage) => {
        switch (msg.type) {
            default:
                break;
        }
    }, []);
    const { postMessage } = useMessagingApi(onMessageHandler);

    const handleSubmit = React.useCallback(() => {}, []);

    return (
        <div className="view-container">
            <Form onSubmit={() => handleSubmit()}></Form>
        </div>
    );
};

export default CreateWorkItemWebview;
