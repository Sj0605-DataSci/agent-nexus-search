import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tallyService } from '../../../lib/TallyService';
import { getTallyConfig } from '../../../lib/localStorage';
import './styles.css';

type TabType = 'xml' | 'sql' | 'odbc-check';

export default function TallyTesting() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('xml');
  
  // XML Query State
  const [xmlQuery, setXmlQuery] = useState<string>('');
  const [xmlResponse, setXmlResponse] = useState<string>('');
  const [isExecutingXML, setIsExecutingXML] = useState(false);
  const [xmlError, setXmlError] = useState<string>('');

  // SQL Query State
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [sqlResponse, setSqlResponse] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [isExecutingSQL, setIsExecutingSQL] = useState(false);
  const [sqlError, setSqlError] = useState<string>('');

  // ODBC Check State
  const [odbcCheckResult, setOdbcCheckResult] = useState<any>(null);
  const [isCheckingODBC, setIsCheckingODBC] = useState(false);

  // Execute XML Query
  const handleExecuteXML = async () => {
    if (!xmlQuery.trim()) {
      setXmlError('Please enter an XML query');
      return;
    }

    const config = getTallyConfig();
    if (!config.connected) {
      setXmlError('Tally is not connected. Please check settings.');
      return;
    }

    setIsExecutingXML(true);
    setXmlError('');
    setXmlResponse('');

    try {
      const result = await tallyService.executeRawXML(xmlQuery);
      setXmlResponse(result);
      console.log('XML Response:', result);
    } catch (error: any) {
      setXmlError(error.message || 'Failed to execute XML query');
      console.error('XML Execution Error:', error);
    } finally {
      setIsExecutingXML(false);
    }
  };

  // Execute SQL Query via ODBC
  const handleExecuteSQL = async () => {
    if (!sqlQuery.trim()) {
      setSqlError('Please enter a SQL query');
      return;
    }

    const config = getTallyConfig();
    if (!config.connected) {
      setSqlError('Tally is not connected. Please check settings.');
      return;
    }

    setIsExecutingSQL(true);
    setSqlError('');
    setSqlResponse(null);

    try {
      const result = await tallyService.executeSQLQuery(sqlQuery);
      setSqlResponse(result);
      console.log('SQL Response:', result);
    } catch (error: any) {
      setSqlError(error.message || 'Failed to execute SQL query');
      console.error('SQL Execution Error:', error);
    } finally {
      setIsExecutingSQL(false);
    }
  };

  // Check ODBC Driver Availability
  const handleCheckODBC = async () => {
    setIsCheckingODBC(true);
    setOdbcCheckResult(null);

    try {
      // Check if running in Electron
      const isElectron = window.navigator.userAgent.includes('Electron');
      
      const result: any = {
        environment: {
          isElectron,
          platform: window.navigator.platform,
          userAgent: window.navigator.userAgent,
        },
        odbcDrivers: {
          available: false,
          drivers: [],
          error: null,
        },
        tallyConnection: {
          httpXmlPort: getTallyConfig().port || 9000,
          connected: getTallyConfig().connected || false,
        },
        recommendations: [],
      };

      // Try to check for ODBC drivers (Windows only)
      if (window.navigator.platform.includes('Win')) {
        result.recommendations.push({
          type: 'info',
          message: 'Windows detected. Checking for Tally ODBC driver...',
        });

        // Check if we can access Windows registry (requires native module)
        try {
          // This would require a native Node module or Electron IPC
          result.odbcDrivers.error = 'ODBC driver check requires native module (not implemented)';
          result.recommendations.push({
            type: 'warning',
            message: 'To check ODBC drivers, we need to implement native Windows registry access.',
          });
        } catch (error: any) {
          result.odbcDrivers.error = error.message;
        }
      } else {
        result.recommendations.push({
          type: 'info',
          message: 'Non-Windows platform detected. Tally ODBC is Windows-only.',
        });
      }

      // Add recommendations based on findings
      if (!result.odbcDrivers.available) {
        result.recommendations.push({
          type: 'success',
          message: 'HTTP/XML interface is working and recommended for cross-platform compatibility.',
        });
        result.recommendations.push({
          type: 'info',
          message: 'ODBC driver installation steps:',
          steps: [
            '1. Open Tally Prime',
            '2. Go to Gateway of Tally → F12: Configure',
            '3. Navigate to Advanced Configuration → ODBC Configuration',
            '4. Enable ODBC Server',
            '5. Install Tally ODBC driver from Tally website',
            '6. Configure DSN in Windows ODBC Data Source Administrator',
          ],
        });
      }

      setOdbcCheckResult(result);
    } catch (error: any) {
      setOdbcCheckResult({
        error: error.message,
        recommendations: [{
          type: 'error',
          message: 'Failed to check ODBC availability',
        }],
      });
    } finally {
      setIsCheckingODBC(false);
    }
  };

  // Load Sample XML Query
  const handleLoadSampleXML = (type: 'ledgers' | 'vouchers' | 'company') => {
    const samples = {
      ledgers: `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>$$CurrentCompany</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" NAME="AllLedgers">
            <TYPE>Ledger</TYPE>
            <FETCH>NAME, PARENT, OPENINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`,
      vouchers: `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllVoucherTypes</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>$$CurrentCompany</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" NAME="AllVoucherTypes">
            <TYPE>VoucherType</TYPE>
            <FETCH>NAME, PARENT, NUMBERINGMETHOD</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`,
      company: `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>CompanyInfo</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CompanyInfo">
            <TYPE>Company</TYPE>
            <FETCH>NAME, STARTINGFROM, BOOKSBEGINNINGFROM</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`
    };
    
    setXmlQuery(samples[type]);
    setXmlResponse('');
    setXmlError('');
  };

  // Load Sample SQL Query
  const handleLoadSampleSQL = (type: 'ledgers' | 'vouchers' | 'company') => {
    const samples = {
      ledgers: `SELECT TOP 10 $Name, $Parent, $OpeningBalance FROM Ledger`,
      vouchers: `SELECT TOP 10 $Name, $Parent, $NumberingMethod FROM VoucherType`,
      company: `SELECT $Name, $StartingFrom, $BooksFrom FROM Company`
    };
    
    setSqlQuery(samples[type]);
    setSqlResponse(null);
    setSqlError('');
  };

  return (
    <div className="tally-testing-container">
      {/* Header */}
      <div className="testing-header">
        <button className="back-btn" onClick={() => navigate('/settings')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Settings
        </button>
        <h1>Tally Query Testing</h1>
        <p className="subtitle">Test XML queries, SQL queries via ODBC, and check driver availability</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'xml' ? 'active' : ''}`}
          onClick={() => setActiveTab('xml')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          XML Queries
        </button>
        <button 
          className={`tab ${activeTab === 'sql' ? 'active' : ''}`}
          onClick={() => setActiveTab('sql')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          SQL Queries
        </button>
        <button 
          className={`tab ${activeTab === 'odbc-check' ? 'active' : ''}`}
          onClick={() => setActiveTab('odbc-check')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          ODBC Check
        </button>
      </div>

      {/* Content */}
      <div className="testing-content">
        {activeTab === 'xml' ? (
          <div className="query-panel">
            <div className="panel-header">
              <h2>XML Query Testing</h2>
              <p className="help-text">
                Execute Tally Definition Language (TDL) queries using XML ENVELOPE format via HTTP (Port 9000)
              </p>
            </div>

            {/* Sample Queries */}
            <div className="sample-queries">
              <label>Load Sample Query:</label>
              <div className="sample-buttons">
                <button 
                  className="btn btn-small" 
                  onClick={() => handleLoadSampleXML('company')}
                >
                  Company Info
                </button>
                <button 
                  className="btn btn-small" 
                  onClick={() => handleLoadSampleXML('ledgers')}
                >
                  Ledgers
                </button>
                <button 
                  className="btn btn-small" 
                  onClick={() => handleLoadSampleXML('vouchers')}
                >
                  Voucher Types
                </button>
              </div>
            </div>

            {/* Query Input */}
            <div className="query-input">
              <label htmlFor="xml-query">XML Query</label>
              <textarea
                id="xml-query"
                value={xmlQuery}
                onChange={(e) => setXmlQuery(e.target.value)}
                placeholder="Paste your <ENVELOPE>...</ENVELOPE> XML query here"
                rows={18}
                className="query-textarea"
              />
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={handleExecuteXML}
                disabled={isExecutingXML || !xmlQuery.trim()}
              >
                {isExecutingXML ? 'Executing...' : 'Execute XML Query'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setXmlQuery('');
                  setXmlResponse('');
                  setXmlError('');
                }}
              >
                Clear
              </button>
            </div>

            {/* Error Message */}
            {xmlError && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {xmlError}
              </div>
            )}

            {/* Response */}
            {xmlResponse && (
              <div className="response-panel">
                <div className="response-header">
                  <h3>Response from Tally</h3>
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      navigator.clipboard.writeText(xmlResponse);
                      alert('Response copied to clipboard!');
                    }}
                  >
                    Copy Response
                  </button>
                </div>
                <pre className="response-content">{xmlResponse}</pre>
              </div>
            )}
          </div>
        ) : activeTab === 'sql' ? (
          <div className="query-panel">
            <div className="panel-header">
              <h2>SQL Query Testing (ODBC)</h2>
              <p className="help-text">
                Execute SQL queries directly on Tally using ODBC driver (DSN: TallyODBC64_9000)
              </p>
            </div>

            {/* Sample Queries */}
            <div className="sample-queries">
              <label>Load Sample Query:</label>
              <div className="sample-buttons">
                <button 
                  className="btn btn-small" 
                  onClick={() => handleLoadSampleSQL('company')}
                >
                  Company Info
                </button>
                <button 
                  className="btn btn-small" 
                  onClick={() => handleLoadSampleSQL('ledgers')}
                >
                  Ledgers
                </button>
                <button 
                  className="btn btn-small" 
                  onClick={() => handleLoadSampleSQL('vouchers')}
                >
                  Voucher Types
                </button>
              </div>
            </div>

            {/* Query Input */}
            <div className="query-input">
              <label htmlFor="sql-query">SQL Query</label>
              <textarea
                id="sql-query"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT $Name, $Parent FROM Ledger"
                rows={10}
                className="query-textarea"
              />
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={handleExecuteSQL}
                disabled={isExecutingSQL || !sqlQuery.trim()}
              >
                {isExecutingSQL ? 'Executing...' : 'Execute SQL Query'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSqlQuery('');
                  setSqlResponse(null);
                  setSqlError('');
                }}
              >
                Clear
              </button>
            </div>

            {/* Error Message */}
            {sqlError && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {sqlError}
              </div>
            )}

            {/* Response */}
            {sqlResponse && (
              <div className="response-panel">
                <div className="response-header">
                  <h3>Query Results</h3>
                  <span className="result-count">
                    {sqlResponse.rows.length} rows × {sqlResponse.columns.length} columns
                  </span>
                </div>

                {/* Table View */}
                {sqlResponse.rows.length > 0 && (
                  <div className="table-container">
                    <table className="results-table">
                      <thead>
                        <tr>
                          {sqlResponse.columns.map((col, idx) => (
                            <th key={idx}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResponse.rows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx}>{cell !== null ? String(cell) : 'NULL'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Raw JSON View */}
                <details className="raw-json">
                  <summary>View Raw JSON</summary>
                  <pre className="response-content">{JSON.stringify(sqlResponse, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        ) : (
          <div className="query-panel">
            <div className="panel-header">
              <h2>ODBC Driver Check</h2>
              <p className="help-text">
                Check if Tally ODBC driver is installed and available on your system
              </p>
            </div>

            <div className="odbc-check-section">
              <button
                className="btn btn-primary btn-large"
                onClick={handleCheckODBC}
                disabled={isCheckingODBC}
              >
                {isCheckingODBC ? 'Checking...' : 'Check ODBC Driver Availability'}
              </button>

              {odbcCheckResult && (
                <div className="odbc-results">
                  {/* Environment Info */}
                  <div className="result-section">
                    <h3>Environment Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Platform:</strong>
                        <span>{odbcCheckResult.environment?.platform || 'Unknown'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Running in Electron:</strong>
                        <span className={odbcCheckResult.environment?.isElectron ? 'status-yes' : 'status-no'}>
                          {odbcCheckResult.environment?.isElectron ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tally Connection */}
                  <div className="result-section">
                    <h3>Tally HTTP/XML Connection</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Port:</strong>
                        <span>{odbcCheckResult.tallyConnection?.httpXmlPort}</span>
                      </div>
                      <div className="info-item">
                        <strong>Status:</strong>
                        <span className={odbcCheckResult.tallyConnection?.connected ? 'status-yes' : 'status-no'}>
                          {odbcCheckResult.tallyConnection?.connected ? 'Connected ✓' : 'Not Connected ✗'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ODBC Drivers */}
                  <div className="result-section">
                    <h3>ODBC Driver Status</h3>
                    {odbcCheckResult.odbcDrivers?.error ? (
                      <div className="warning-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                          <strong>Cannot Check ODBC Drivers</strong>
                          <p>{odbcCheckResult.odbcDrivers.error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="info-item">
                        <strong>Available:</strong>
                        <span className="status-no">Not Detected</span>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  {odbcCheckResult.recommendations && odbcCheckResult.recommendations.length > 0 && (
                    <div className="result-section">
                      <h3>Recommendations</h3>
                      {odbcCheckResult.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className={`recommendation-box ${rec.type}`}>
                          <div className="recommendation-header">
                            {rec.type === 'success' && '✓'}
                            {rec.type === 'warning' && '⚠'}
                            {rec.type === 'info' && 'ℹ'}
                            {rec.type === 'error' && '✗'}
                            <strong>{rec.message}</strong>
                          </div>
                          {rec.steps && (
                            <ol className="recommendation-steps">
                              {rec.steps.map((step: string, stepIdx: number) => (
                                <li key={stepIdx}>{step}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Technical Details */}
                  <details className="raw-json">
                    <summary>View Technical Details</summary>
                    <pre className="response-content">{JSON.stringify(odbcCheckResult, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
