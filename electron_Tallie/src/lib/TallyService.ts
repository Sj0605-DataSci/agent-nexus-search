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

      // Get ledgers
      const ledgerXML = `
        <ENVELOPE>
          <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Data</TYPE>
            <ID>Ledgers</ID>
          </HEADER>
          <BODY>
            <DESC>
              <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:ASCII</SVEXPORTFORMAT>
              </STATICVARIABLES>
              <TDL>
                <TDLMESSAGE>
                  <COLLECTION NAME="Ledgers">
                    <TYPE>Ledger</TYPE>
                    <FETCH>NAME, PARENT</FETCH>
                  </COLLECTION>
                </TDLMESSAGE>
              </TDL>
            </DESC>
          </BODY>
        </ENVELOPE>
      `.trim();

      const ledgerResult = await this.executeXML({ xml: ledgerXML });

      // Get voucher types
      const voucherXML = `
        <ENVELOPE>
          <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Data</TYPE>
            <ID>VoucherTypes</ID>
          </HEADER>
          <BODY>
            <DESC>
              <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:ASCII</SVEXPORTFORMAT>
              </STATICVARIABLES>
              <TDL>
                <TDLMESSAGE>
                  <COLLECTION NAME="VoucherTypes">
                    <TYPE>VoucherType</TYPE>
                    <FETCH>NAME</FETCH>
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
}

export const tallyService = new TallyService();
