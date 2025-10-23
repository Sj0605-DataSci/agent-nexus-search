import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTallyConfig, saveTallyConfig } from '../../../lib/localStorage';
import { tallyService } from '../../../lib/TallyService';
import { TallyConfig, TallyMetadata } from '../../../types/tally';
import './styles.css';

export default function Settings() {
  const navigate = useNavigate();
  const [tallyConfig, setTallyConfig] = useState<TallyConfig>({ port: 9000, connected: false });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [metadata, setMetadata] = useState<TallyMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  useEffect(() => {
    const config = getTallyConfig();
    setTallyConfig(config);
  }, []);

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const port = parseInt(e.target.value) || 9000;
    setTallyConfig(prev => ({ ...prev, port }));
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('Testing connection...');

    try {
      const result = await tallyService.testConnection(tallyConfig.port);

      if (result.connected) {
        setConnectionStatus('✅ Connected successfully!');
        setTallyConfig(prev => ({ ...prev, connected: true }));
        
        // Fetch metadata
        await handleFetchMetadata();
      } else {
        setConnectionStatus(`❌ Connection failed: ${result.error}`);
        setTallyConfig(prev => ({ ...prev, connected: false }));
      }
    } catch (error: any) {
      setConnectionStatus(`❌ Error: ${error.message}`);
      setTallyConfig(prev => ({ ...prev, connected: false }));
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleFetchMetadata = async () => {
    setIsLoadingMetadata(true);
    
    try {
      const meta = await tallyService.getMetadata();
      
      if (meta) {
        setMetadata(meta);
        console.log('Tally Metadata:', meta);
      } else {
        console.error('Failed to fetch metadata');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Back Navigation */}
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/chat')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Chat
        </button>
      </div>

      <div className="settings-content">
        <h1>Settings</h1>

        {/* Tally Configuration */}
        <section className="settings-section">
          <h2>Tally Configuration</h2>
          
          <div className="form-group">
            <label htmlFor="tally-port">Tally Port</label>
            <input
              id="tally-port"
              type="number"
              value={tallyConfig.port}
              onChange={handlePortChange}
              placeholder="9000"
              min="1"
              max="65535"
            />
            <p className="help-text">
              Default Tally ODBC port is 9000. Make sure Tally Prime is running with ODBC server enabled.
            </p>
          </div>

          <div className="form-group">
            <button
              className="btn btn-primary"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {connectionStatus && (
            <div className={`status-message ${tallyConfig.connected ? 'success' : 'error'}`}>
              {connectionStatus}
            </div>
          )}

          {tallyConfig.connected && (
            <div className="connection-info">
              <div className="info-badge success">
                <span className="badge-icon">✓</span>
                <span>Connected to Tally on port {tallyConfig.port}</span>
              </div>
              
              {tallyConfig.lastChecked && (
                <p className="last-checked">
                  Last checked: {new Date(tallyConfig.lastChecked).toLocaleString()}
                </p>
              )}

              <button
                className="btn btn-secondary"
                onClick={handleFetchMetadata}
                disabled={isLoadingMetadata}
              >
                {isLoadingMetadata ? 'Fetching...' : 'Fetch Tally Metadata'}
              </button>
            </div>
          )}

          {metadata && (
            <div className="metadata-display">
              <h3>Tally Metadata</h3>
              <div className="metadata-grid">
                <div className="metadata-item">
                  <strong>Companies:</strong> {metadata.companies.length}
                </div>
                <div className="metadata-item">
                  <strong>Ledgers:</strong> {metadata.ledgers.length}
                </div>
                <div className="metadata-item">
                  <strong>Voucher Types:</strong> {metadata.voucherTypes.length}
                </div>
                <div className="metadata-item">
                  <strong>Last Updated:</strong> {new Date(metadata.lastUpdated).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Instructions */}
        <section className="settings-section">
          <h2>Setup Instructions</h2>
          
          <ol className="instructions-list">
            <li>
              <strong>Enable Tally ODBC Server:</strong>
              <p>In Tally Prime, go to Gateway of Tally → F12: Configure → Advanced Configuration → Enable ODBC Server</p>
            </li>
            <li>
              <strong>Set Port:</strong>
              <p>Configure the ODBC port (default: 9000) in Tally settings</p>
            </li>
            <li>
              <strong>Test Connection:</strong>
              <p>Click "Test Connection" to verify Tally is accessible</p>
            </li>
            <li>
              <strong>Start Chatting:</strong>
              <p>Once connected, go back to Chat and ask questions about your Tally data</p>
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
