import React from 'react';
import { useMessagingApi } from 'src/react/atlascode/messagingApi';
import { MessageToUI, ToUIHandler } from 'src/shipit/protocol';

const ShipitWebview = () => {
    const [lifeStatus, setLifeStatus] = React.useState<string | null>(null);
    const [authenticationType, setAuthenticationType] = React.useState<string>('unknown');
    const [aggResponse, setAggResponse] = React.useState<any>(null);
    const [aggError, setAggError] = React.useState<string | undefined>(undefined);
    const [worktrees, setWorktrees] = React.useState<string[]>([]);
    const [worktreeStatus, setWorktreeStatus] = React.useState<string | null>(null);
    const [worktreeError, setWorktreeError] = React.useState<string | undefined>(undefined);
    const [customDirectory, setCustomDirectory] = React.useState<string>('');
    const [customName, setCustomName] = React.useState<string>('');

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

        // Handle worktree creation response
        worktreeCreated: (message) => {
            console.log('Received worktreeCreated:', message);
            if (message.status === 'success') {
                setWorktreeStatus('Worktree created successfully!');
                setWorktreeError(undefined);
                // Automatically refresh the worktree list
                postMessage({ type: 'listWorktrees' });
                // Clear the status message after a few seconds
                setTimeout(() => setWorktreeStatus(null), 3000);
            } else {
                setWorktreeStatus(null);
                setWorktreeError(message.error);
            }
        },

        // Handle worktree list response
        worktreesList: (message) => {
            console.log('Received worktreesList:', message);
            if (message.status === 'success') {
                setWorktrees(message.worktrees || []);
                setWorktreeError(undefined);
            } else {
                setWorktreeError(message.error);
            }
        },

        // Handle worktree removal response
        worktreeRemoved: (message) => {
            console.log('Received worktreeRemoved:', message);
            if (message.status === 'success') {
                setWorktreeStatus('Worktree removed successfully!');
                setWorktreeError(undefined);
                // Refresh the worktree list
                postMessage({ type: 'listWorktrees' });
            } else {
                setWorktreeStatus(null);
                setWorktreeError(message.error);
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

    // Load worktrees on component mount
    React.useEffect(() => {
        postMessage({ type: 'listWorktrees' });
    }, [postMessage]);

    // These messages can also be handled elsewhere if needed, like this:
    // window.addEventListener('message', func);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Shipit Webview</h1>
            <p>Authentication type: {authenticationType}</p>

            {/* Git Worktree Section */}
            <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
                <h2>Git Worktrees</h2>

                <div style={{ marginBottom: '15px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Optional Parameters:
                        </label>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '10px',
                                marginBottom: '10px',
                            }}
                        >
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                                    Directory:
                                </label>
                                <input
                                    type="text"
                                    value={customDirectory}
                                    onChange={(e) => setCustomDirectory(e.target.value)}
                                    placeholder="e.g., /path/to/worktrees"
                                    style={{ width: '100%', padding: '4px', fontSize: '12px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>Name:</label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="e.g., my-feature"
                                    style={{ width: '100%', padding: '4px', fontSize: '12px' }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() =>
                            postMessage({
                                type: 'createWorktree',
                                directory: customDirectory.trim() || undefined,
                                name: customName.trim() || undefined,
                            })
                        }
                        style={{ marginRight: '10px', padding: '8px 16px' }}
                    >
                        Create Worktree
                    </button>
                    <button onClick={() => postMessage({ type: 'listWorktrees' })} style={{ padding: '8px 16px' }}>
                        Refresh Worktree List
                    </button>
                    <button
                        onClick={() => {
                            setCustomDirectory('');
                            setCustomName('');
                        }}
                        style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#f0f0f0' }}
                    >
                        Clear Fields
                    </button>
                </div>

                {worktreeStatus && <p style={{ color: 'green', fontWeight: 'bold' }}>{worktreeStatus}</p>}
                {worktreeError && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {worktreeError}</p>}

                <div>
                    <h3>Existing Worktrees:</h3>
                    {worktrees.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#666' }}>No worktrees found</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {worktrees.map((worktree, index) => (
                                <li
                                    key={index}
                                    style={{
                                        marginBottom: '8px',
                                        padding: '8px',
                                        backgroundColor: '#f5f5f5',
                                        borderRadius: '3px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{worktree}</span>
                                    <button
                                        onClick={() => postMessage({ type: 'removeWorktree', worktreePath: worktree })}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#ff4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

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

            {/* Call some process */}
            <button onClick={() => postMessage({ type: 'runProcess', echoText: 'Hello!' })}>Run Process</button>
        </div>
    );
};

export default ShipitWebview;
