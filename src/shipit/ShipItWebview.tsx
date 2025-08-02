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
    const [chatMessage, setChatMessage] = React.useState<string>('');
    const [isSendingMessage, setIsSendingMessage] = React.useState<boolean>(false);
    const [connectedRovoDevPort, setConnectedRovoDevPort] = React.useState<number | null>(null);
    const [connectedWorktreePath, setConnectedWorktreePath] = React.useState<string | null>(null);
    const [rovoDevServers, setRovoDevServers] = React.useState<
        Array<{ path: string; port: number; type: 'workspace' | 'worktree' }>
    >([]);

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
                setWorktreeStatus('Worktree created successfully! Message sent to RovoDev.');
                setWorktreeError(undefined);
                setChatMessage(''); // Clear the message input
                setIsSendingMessage(false); // Reset sending state
                // Automatically refresh the worktree list and RovoDev servers
                postMessage({ type: 'listWorktrees' });
                postMessage({ type: 'getWorktreeRovoDevServers' });
                // Clear the status message after a few seconds
                setTimeout(() => setWorktreeStatus(null), 3000);
            } else {
                setWorktreeStatus(null);
                setWorktreeError(message.error);
                setIsSendingMessage(false); // Reset sending state on error
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
                // Refresh the worktree list and RovoDev servers
                postMessage({ type: 'listWorktrees' });
                postMessage({ type: 'getWorktreeRovoDevServers' });
                // Clear connection if we were connected to the removed worktree
                if (connectedWorktreePath && message.status === 'success') {
                    setConnectedRovoDevPort(null);
                    setConnectedWorktreePath(null);
                }
            } else {
                setWorktreeStatus(null);
                setWorktreeError(message.error);
            }
        },

        // Handle RovoDev connection response
        worktreeRovoDevConnected: (message) => {
            console.log('Received worktreeRovoDevConnected:', message);
            if (message.status === 'success' && message.port && message.worktreePath) {
                setConnectedRovoDevPort(message.port);
                setConnectedWorktreePath(message.worktreePath);
                setWorktreeStatus(`Connected to RovoDev server on port ${message.port}`);
                setWorktreeError(undefined);
                setTimeout(() => setWorktreeStatus(null), 3000);
            } else {
                setWorktreeError(message.error || 'Failed to connect to RovoDev server');
            }
        },

        // Handle RovoDev servers list response
        worktreeRovoDevServers: (message) => {
            console.log('Received worktreeRovoDevServers:', message);
            console.log('Setting RovoDev servers:', message.servers);
            setRovoDevServers(message.servers || []);
        },

        // Handle selected RovoDev server response
        selectedRovoDevServer: (message) => {
            console.log('Received selectedRovoDevServer:', message);
            if (message.port && message.path) {
                setConnectedRovoDevPort(message.port);
                setConnectedWorktreePath(message.path);
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

    // Load worktrees and RovoDev servers on component mount
    React.useEffect(() => {
        postMessage({ type: 'listWorktrees' });
        postMessage({ type: 'getWorktreeRovoDevServers' });
        // Initialize connection state from global state
        postMessage({ type: 'getSelectedRovoDevServer' });
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
                            Send Message to RovoDev:
                        </label>
                        <div style={{ marginBottom: '10px' }}>
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Type your message here..."
                                disabled={isSendingMessage}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    fontSize: '14px',
                                    opacity: isSendingMessage ? 0.6 : 1,
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && chatMessage.trim() && !isSendingMessage) {
                                        // Create worktree and send message on Enter
                                        setIsSendingMessage(true);
                                        postMessage({
                                            type: 'createWorktree',
                                            message: chatMessage.trim(),
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (!isSendingMessage) {
                                setIsSendingMessage(true);
                                postMessage({
                                    type: 'createWorktree',
                                    message: chatMessage.trim() || undefined,
                                });
                            }
                        }}
                        style={{ marginRight: '10px', padding: '8px 16px' }}
                        disabled={isSendingMessage}
                    >
                        {isSendingMessage ? 'Creating...' : 'Create Worktree & Send Message'}
                    </button>
                    <button onClick={() => postMessage({ type: 'listWorktrees' })} style={{ padding: '8px 16px' }}>
                        Refresh Worktree List
                    </button>
                    <button
                        onClick={() => {
                            console.log('Manual refresh of RovoDev servers');
                            postMessage({ type: 'getWorktreeRovoDevServers' });
                        }}
                        style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#2196f3', color: 'white' }}
                    >
                        Refresh RovoDev Servers
                    </button>
                    <button
                        onClick={() => {
                            setChatMessage('');
                        }}
                        style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#f0f0f0' }}
                    >
                        Clear Fields
                    </button>
                </div>

                {worktreeStatus && <p style={{ color: 'green', fontWeight: 'bold' }}>{worktreeStatus}</p>}
                {worktreeError && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {worktreeError}</p>}

                {connectedRovoDevPort && connectedWorktreePath && (
                    <div
                        style={{
                            padding: '10px',
                            backgroundColor: '#e8f5e8',
                            borderRadius: '5px',
                            marginBottom: '15px',
                            border: '1px solid #4caf50',
                        }}
                    >
                        <strong>🔗 Connected to RovoDev:</strong> {connectedWorktreePath} (port {connectedRovoDevPort})
                        <button
                            onClick={() => {
                                setConnectedRovoDevPort(null);
                                setConnectedWorktreePath(null);
                            }}
                            style={{
                                marginLeft: '10px',
                                padding: '2px 6px',
                                backgroundColor: '#ff6b6b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '12px',
                            }}
                        >
                            Disconnect
                        </button>
                    </div>
                )}

                <div>
                    <h3>All RovoDev Servers:</h3>
                    {rovoDevServers.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px' }}>Available Servers:</h4>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '15px' }}>
                                {rovoDevServers.map((server, index) => {
                                    const isConnected = connectedWorktreePath === server.path;
                                    const displayName =
                                        server.type === 'workspace'
                                            ? `🏠 Main Workspace (${require('path').basename(server.path)})`
                                            : `🌿 ${require('path').basename(server.path)}`;

                                    return (
                                        <li
                                            key={index}
                                            style={{
                                                marginBottom: '5px',
                                                padding: '6px 10px',
                                                backgroundColor: isConnected ? '#e8f5e8' : '#f0f8ff',
                                                borderRadius: '3px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                border: isConnected ? '2px solid #4caf50' : '1px solid #87ceeb',
                                                fontSize: '13px',
                                            }}
                                        >
                                            <div>
                                                <span>{displayName}</span>
                                                <span
                                                    style={{
                                                        marginLeft: '8px',
                                                        fontSize: '11px',
                                                        color: '#666',
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    :{server.port}
                                                </span>
                                                {isConnected && (
                                                    <span
                                                        style={{
                                                            marginLeft: '8px',
                                                            fontSize: '11px',
                                                            color: '#4caf50',
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        🔗 Connected
                                                    </span>
                                                )}
                                            </div>
                                            {!isConnected && (
                                                <button
                                                    onClick={() =>
                                                        postMessage({
                                                            type: 'connectToWorktreeRovoDev',
                                                            worktreePath: server.path,
                                                        })
                                                    }
                                                    style={{
                                                        padding: '3px 8px',
                                                        backgroundColor: '#4caf50',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                    }}
                                                >
                                                    Connect
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <h3>Existing Worktrees:</h3>
                    {worktrees.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#666' }}>No worktrees found</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {worktrees.map((worktree, index) => {
                                const isConnected = connectedWorktreePath === worktree;
                                const hasRovoDevServer = rovoDevServers.some((server) => server.path === worktree);

                                return (
                                    <li
                                        key={index}
                                        style={{
                                            marginBottom: '8px',
                                            padding: '8px',
                                            backgroundColor: isConnected ? '#e8f5e8' : '#f5f5f5',
                                            borderRadius: '3px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            border: isConnected ? '2px solid #4caf50' : '1px solid #ddd',
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                                                {worktree}
                                            </span>
                                            {hasRovoDevServer && (
                                                <span
                                                    style={{
                                                        marginLeft: '8px',
                                                        fontSize: '12px',
                                                        color: '#4caf50',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    🟢 RovoDev
                                                </span>
                                            )}
                                            {isConnected && (
                                                <span
                                                    style={{
                                                        marginLeft: '8px',
                                                        fontSize: '12px',
                                                        color: '#4caf50',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    🔗 Connected
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {hasRovoDevServer && !isConnected && (
                                                <button
                                                    onClick={() =>
                                                        postMessage({
                                                            type: 'connectToWorktreeRovoDev',
                                                            worktreePath: worktree,
                                                        })
                                                    }
                                                    style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: '#4caf50',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Connect
                                                </button>
                                            )}
                                            <button
                                                onClick={() =>
                                                    postMessage({ type: 'removeWorktree', worktreePath: worktree })
                                                }
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: '#ff4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
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
