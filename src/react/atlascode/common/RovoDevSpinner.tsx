import React from 'react';

const spinnerKeyframes = `
@keyframes rovodev-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

export const RovoDevSpinner: React.FunctionComponent = () => {
    return (
        <>
            <style>{spinnerKeyframes}</style>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    width: '100%',
                }}
            >
                <div
                    role="status"
                    style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid rgba(101, 84, 192, 0.2)',
                        borderTopColor: '#6554C0',
                        borderRadius: '50%',
                        animation: 'rovodev-spin 0.8s linear infinite',
                    }}
                />
            </div>
        </>
    );
};
