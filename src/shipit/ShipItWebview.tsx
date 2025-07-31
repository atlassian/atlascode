import React from 'react';
import { useMessagingApi } from 'src/react/atlascode/messagingApi';
import { MessageToUI, ToUIHandler } from 'src/shipit/protocol';

const ShipitWebview = () => {
    const [lifeStatus, setLifeStatus] = React.useState<string | null>(null);
    const [authenticationType, setAuthenticationType] = React.useState<string>('unknown');
    const [aggResponse, setAggResponse] = React.useState<any>(null);
    const [aggError, setAggError] = React.useState<string | undefined>(undefined);

    const handlers: ToUIHandler = {
        initialize: (message) => {
            console.log('Received initialize message:', message);
            // Handle initialization logic here, e.g., set up authentication
            setAuthenticationType(message.authenticationType);
        },

        // Handle basic action response
        isLifeOkResponse: (message) => {
            setLifeStatus(message.status);
        },

        // Handle our ping to AGG
        pingAggResponse: (message) => {
            console.log('Received pingAggResponse:', message);
            if (message.status === 'ok') {
                setAggResponse(message.response);
                setAggError(undefined);
            } else {
                console.error('Error pinging AGG:', message.error);
                setAggResponse(null);
                setAggError(message.error);
            }
        },
    };

    const { postMessage } = useMessagingApi<any, any, any>((message: MessageToUI) => {
        console.log('Received message in ShipitWebview:', message);
        const handler = handlers[message.type] as ((msg: any) => void) | undefined;
        if (handler) {
            handler(message);
        }
    });

    // These messages can also be handled elsewhere if needed, like this:
    // window.addEventListener('message', func);

    return (
        <div>
            <h1>Shipit Webview</h1>
            <p>Authentication type: {authenticationType}</p>

            {/* Example button to do some basic messaging */}
            <button onClick={() => postMessage({ type: 'isLifeOk' })}>Is life daijoubu?</button>
            {lifeStatus && <p>Life status: {lifeStatus}</p>}

            {/* Example button to ping AGG */}
            <button onClick={() => postMessage({ type: 'pingAgg' })}>Ping AGG</button>
            {aggResponse && (
                <div>
                    <h2>AGG Response</h2>
                    <pre>{JSON.stringify(aggResponse, null, 2)}</pre>
                </div>
            )}
            {aggError && <p>Error: {aggError}</p>}
        </div>
    );
};

export default ShipitWebview;
