/**
 * Tally Service - Handles communication with local Tally Prime
 */

import { TallyConnectionStatus, ExecuteXMLRequest, ExecuteXMLResponse, TallyMetadata } from '../types/tally';
import { getTallyConfig, saveTallyConfig } from './localStorage';

class TallyService {
  /**
   * Test connection to Tally
   */
  async testConnection(port: number): Promise<TallyConnectionStatus> {
    try {
      const pingXML = `
        <ENVELOPE>
          <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Data</TYPE>
            <ID>CompanyInfo</ID>
          </HEADER>
          <BODY>
            <DESC>
              <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:ASCII</SVEXPORTFORMAT>
              </STATICVARIABLES>
              <TDL>
                <TDLMESSAGE>
                  <COLLECTION NAME="CompanyInfo">
                    <TYPE>Company</TYPE>
                    <FETCH>NAME</FETCH>
                  </COLLECTION>
                </TDLMESSAGE>
              </TDL>
            </DESC>
          </BODY>
        </ENVELOPE>
      `.trim();

      const response = await fetch(`http://localhost:${port}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': pingXML.length.toString(),
        },
        body: pingXML,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      
      // Update config
      saveTallyConfig({
        port,
        connected: true,
        lastChecked: new Date().toISOString(),
      });

      return {
        connected: true,
        port,
      };
    } catch (error: any) {
      saveTallyConfig({
        port,
        connected: false,
        lastChecked: new Date().toISOString(),
      });

      return {
        connected: false,
        port,
        error: error.message || 'Failed to connect to Tally',
      };
    }
  }

  /**
   * Execute XML query on Tally
   */
  async executeXML(request: ExecuteXMLRequest): Promise<ExecuteXMLResponse> {
    const config = getTallyConfig();
    
    if (!config.connected) {
      return {
        success: false,
        data: '',
        error: 'Tally is not connected. Please check settings.',
      };
    }

    try {
      const response = await fetch(`http://localhost:${config.port}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': request.xml.length.toString(),
        },
        body: request.xml,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        data: '',
        error: error.message || 'Failed to execute XML query',
      };
    }
  }

  /**
   * Get Tally metadata (companies, ledgers, voucher types, etc.)
   */
  async getMetadata(): Promise<TallyMetadata | null> {
    try {
      // Get company info
      const companyXML = `
        <ENVELOPE>
          <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Data</TYPE>
            <ID>CompanyInfo</ID>
          </HEADER>
          <BODY>
            <DESC>
              <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:ASCII</SVEXPORTFORMAT>
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
        </ENVELOPE>
      `.trim();

      const companyResult = await this.executeXML({ xml: companyXML });
      
      if (!companyResult.success) {
        throw new Error('Failed to fetch company info');
      }

      // Get ledgers - Using correct Tally XML format
      const ledgerXML = `
        <ENVELOPE>
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
        </ENVELOPE>
      `.trim();

      const ledgerResult = await this.executeXML({ xml: ledgerXML });

      // Get voucher types - Using correct Tally XML format
      const voucherXML = `
        <ENVELOPE>
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
        </ENVELOPE>
      `.trim();

      const voucherResult = await this.executeXML({ xml: voucherXML });

      // Parse results (simplified - you'll need proper XML parsing)
      const companies = this.parseCompanies(companyResult.data);
      const ledgers = this.parseLedgers(ledgerResult.data);
      const voucherTypes = this.parseVoucherTypes(voucherResult.data);

      return {
        companies,
        ledgers,
        voucherTypes,
        stockItems: [], // TODO: Implement stock items fetch
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get Tally metadata:', error);
      return null;
    }
  }

  // Helper methods for parsing XML (simplified)
  private parseCompanies(xml: string): any[] {
    // TODO: Implement proper XML parsing
    return [];
  }

  private parseLedgers(xml: string): string[] {
    // TODO: Implement proper XML parsing
    return [];
  }

  private parseVoucherTypes(xml: string): string[] {
    // TODO: Implement proper XML parsing
    return [];
  }

  /**
   * Execute raw XML string on Tally
   * Used by WebSocket service to execute backend-generated XML
   */
  async executeRawXML(xml: string): Promise<string> {
    try {
      const config = getTallyConfig();
      const port = config?.port || 9000;

      const response = await fetch(`http://localhost:${port}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': xml.length.toString(),
        },
        body: xml,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.text();
      return result;
    } catch (error: any) {
      console.error('Error executing XML on Tally:', error);
      throw new Error(error.message || 'Failed to execute XML on Tally');
    }
  }

  /**
   * Execute SQL query via Tally ODBC
   * Uses IPC to call main process (native modules only work there)
   */
  async executeSQLQuery(sqlQuery: string): Promise<{ columns: string[]; rows: any[][] }> {
    try {
      const config = getTallyConfig();
      const port = config?.port || 9000;
      
      console.log('[RENDERER] Sending ODBC query request to main process:', { sqlQuery, port });
      
      // Call main process via IPC (native ODBC module works there)
      const result = await window.electron.ipcRenderer.invoke('execute-odbc-query', sqlQuery, port) as {
        success: boolean;
        columns?: string[];
        rows?: any[][];
        error?: string;
        details?: string;
        logs?: string[];
      };
      
      // Display main process logs in renderer console
      if (result.logs && result.logs.length > 0) {
        console.group('📋 Main Process Logs:');
        result.logs.forEach(log => {
          if (log.includes('ERROR')) {
            console.error(log);
          } else if (log.includes('WARN')) {
            console.warn(log);
          } else {
            console.log(log);
          }
        });
        console.groupEnd();
      }
      
      console.log('[RENDERER] Received response from main process:', {
        success: result.success,
        columns: result.columns?.length,
        rows: result.rows?.length
      });
      
      if (!result.success) {
        throw new Error(result.error || 'ODBC query failed');
      }
      
      return {
        columns: result.columns || [],
        rows: result.rows || []
      };
    } catch (error: any) {
      console.error('Error executing SQL query via ODBC:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('Data source name not found') || error.message?.includes('IM002')) {
        throw new Error('Tally ODBC driver not found. Please ensure Tally ODBC is installed and DSN "TallyODBC64_9000" is configured.');
      } else if (error.message?.includes('Cannot find module') || error.message?.includes('odbc')) {
        throw new Error('ODBC module not installed in main process. Please reinstall the app.');
      } else if (error.message?.includes('08001')) {
        throw new Error('Cannot connect to Tally. Please ensure Tally is running and ODBC server is enabled.');
      } else {
        throw new Error(error.message || 'Failed to execute SQL query via ODBC');
      }
    }
  }
}

export const tallyService = new TallyService();
export { TallyService };
