import React from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';

interface QuickLoginDialogProps {
    sites: DetailedSiteInfo[];
    onLogin: (site: DetailedSiteInfo) => void;
    onCancel: () => void;
}

export const QuickLoginDialog: React.FC<QuickLoginDialogProps> = ({ sites, onLogin, onCancel }) => {
    const handleSiteSelection = (site: DetailedSiteInfo) => {
        onLogin(site);
    };

    return (
        <div className="quick-login-dialog">
            <h3>Quick Login to Jira</h3>
            <p>Select a Jira site to authenticate with:</p>

            <div className="site-list">
                {sites.map((site, index) => (
                    <div
                        key={`${site.host}-${index}`}
                        className="site-item"
                        onClick={() => handleSiteSelection(site)}
                        style={{
                            cursor: 'pointer',
                            padding: '10px',
                            border: '1px solid #ccc',
                            margin: '5px 0',
                            borderRadius: '4px',
                        }}
                    >
                        <div className="site-name">
                            <strong>{site.name || site.host}</strong>
                        </div>
                        <div className="site-details">
                            <span>{site.host}</span>
                            <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#666' }}>
                                {site.isCloud ? 'Jira Cloud' : 'Jira Server/Data Center'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dialog-actions" style={{ marginTop: '20px' }}>
                <button onClick={onCancel} style={{ marginRight: '10px' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
};
