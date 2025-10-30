/**
 * Tally Master Data Sync Service
 * Handles bidirectional sync between Tally (ODBC) and local SQLite
 * 
 * NOTE: This service runs in the main process only
 * Install dependencies: npm install better-sqlite3 @types/better-sqlite3
 */

// Imports - Dependencies installed via: npm install better-sqlite3 @types/better-sqlite3
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

interface MasterTable {
  name: string;
  displayName: string;
  tallyTable: string; // Actual table name in Tally ODBC
  category: 'accounting' | 'inventory'; // Master category
}

interface ColumnInfo {
  name: string;
  type: string;
  hasData: boolean; // Whether this column has non-null values
}

interface SyncStatus {
  lastSync: Date | null;
  totalRecords: number;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

export class TallyMasterSync {
  private db: Database.Database | null = null;
  private dbPath: string;
  private odbc: any; // ODBC connection
  private syncStatus: Map<string, SyncStatus> = new Map();

  // Tally Master Tables to sync
  private readonly MASTER_TABLES: MasterTable[] = [
    // ===== ACCOUNTING MASTERS =====
    { name: 'groups', displayName: 'Groups', tallyTable: 'GROUP', category: 'accounting' },
    { name: 'ledgers', displayName: 'Ledgers', tallyTable: 'LEDGER', category: 'accounting' },
    { name: 'voucher_types', displayName: 'Voucher Types', tallyTable: 'VOUCHERTYPE', category: 'accounting' },
    { name: 'currencies', displayName: 'Currencies', tallyTable: 'CURRENCY', category: 'accounting' },
    { name: 'budgets', displayName: 'Budgets', tallyTable: 'BUDGET', category: 'accounting' },
    { name: 'scenarios', displayName: 'Scenarios', tallyTable: 'SCENARIO', category: 'accounting' },
    
    // ===== INVENTORY MASTERS =====
    { name: 'stock_groups', displayName: 'Stock Groups', tallyTable: 'STOCKGROUP', category: 'inventory' },
    { name: 'stock_items', displayName: 'Stock Items', tallyTable: 'STOCKITEM', category: 'inventory' },
    { name: 'stock_categories', displayName: 'Stock Categories', tallyTable: 'STOCKCATEGORY', category: 'inventory' },
    { name: 'units', displayName: 'Units', tallyTable: 'UNIT', category: 'inventory' },
    { name: 'godowns', displayName: 'Godowns', tallyTable: 'GODOWN', category: 'inventory' },
  ];

  constructor() {
    // Store SQLite in user's AppData folder (no admin needed)
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'tally_masters.db');
    
    log.info('TallyMasterSync initialized', { dbPath: this.dbPath });
  }

  /**
   * Initialize SQLite database
   */
  async initialize(): Promise<void> {
    try {
      const fs = require('fs');
      const dbExists = fs.existsSync(this.dbPath);
      
      log.info('[TallyMasterSync] Starting initialization...', { 
        dbPath: this.dbPath,
        dbExists,
        dbSize: dbExists ? fs.statSync(this.dbPath).size : 0
      });
      
      this.db = new Database(this.dbPath);
      log.info('[TallyMasterSync] Database connection created');
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      log.info('[TallyMasterSync] WAL mode enabled');
      
      // Create metadata table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS _sync_metadata (
          table_name TEXT PRIMARY KEY,
          last_sync DATETIME,
          total_records INTEGER,
          total_columns INTEGER,
          active_columns INTEGER,
          schema_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      log.info('[TallyMasterSync] Metadata table created/verified');
      
      // Migrate existing database if needed (add missing columns)
      this.migrateMetadataTable();
      
      // Load existing sync status from database
      this.loadSyncStatusFromDB();
      
      log.info('[TallyMasterSync] Database initialized successfully');
    } catch (error) {
      log.error('[TallyMasterSync] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Migrate metadata table to add missing columns
   */
  private migrateMetadataTable(): void {
    if (!this.db) return;
    
    try {
      // Check if columns exist
      const tableInfo = this.db.prepare(`PRAGMA table_info(_sync_metadata)`).all() as Array<{ name: string }>;
      const columnNames = tableInfo.map(col => col.name);
      
      log.info('[TallyMasterSync] Checking metadata table schema', { existingColumns: columnNames });
      
      // Add total_columns if missing
      if (!columnNames.includes('total_columns')) {
        log.info('[TallyMasterSync] Adding total_columns column to _sync_metadata');
        this.db.exec(`ALTER TABLE _sync_metadata ADD COLUMN total_columns INTEGER DEFAULT 0`);
      }
      
      // Add active_columns if missing
      if (!columnNames.includes('active_columns')) {
        log.info('[TallyMasterSync] Adding active_columns column to _sync_metadata');
        this.db.exec(`ALTER TABLE _sync_metadata ADD COLUMN active_columns INTEGER DEFAULT 0`);
      }
      
      log.info('[TallyMasterSync] Metadata table migration completed');
    } catch (error) {
      log.error('[TallyMasterSync] Failed to migrate metadata table:', error);
      // Don't throw - continue with existing schema
    }
  }

  /**
   * Step 1: Schema Discovery - Pull top 5 rows to identify non-null columns
   */
  async discoverSchema(
    odbc: any,
    tableName: string,
    port: number
  ): Promise<ColumnInfo[]> {
    let connection: any = null;
    
    try {
      log.info('[TallyMasterSync] Starting schema discovery', { tableName, port });
      
      // Try multiple connection string formats (same as main.ts)
      const dsnLessConnectionString = `DRIVER={Tally ODBC Driver};SERVER=localhost;PORT=${port}`;
      const dsnConnectionString = `DSN=TallyODBC64_${port}`;
      const connectStrings = [dsnLessConnectionString, dsnConnectionString];
      
      let lastError: any = null;
      
      // Try each connection string
      for (const connStr of connectStrings) {
        try {
          log.info('[TallyMasterSync] Attempting ODBC connection', { connectionString: connStr });
          
          if (typeof odbc.connect === 'function') {
            connection = await odbc.connect(connStr);
            log.info('[TallyMasterSync] ODBC connection established', { method: 'connect', connectionString: connStr });
            break;
          } else if (typeof odbc.pool === 'function') {
            connection = await odbc.pool(connStr);
            log.info('[TallyMasterSync] ODBC connection established', { method: 'pool', connectionString: connStr });
            break;
          } else {
            throw new Error('No connect or pool method found in ODBC module');
          }
        } catch (connError: any) {
          log.warn('[TallyMasterSync] Connection attempt failed', { connectionString: connStr, error: connError.message });
          lastError = connError;
          connection = null;
        }
      }
      
      if (!connection) {
        throw lastError || new Error('Failed to connect with any connection string');
      }
      
      // Pull top 5 rows to analyze schema
      const sampleQuery = `SELECT TOP 5 * FROM ${tableName}`;
      log.info('[TallyMasterSync] Executing sample query', { query: sampleQuery });
      
      const result = await connection.query(sampleQuery);
      log.info('[TallyMasterSync] Sample query executed', { rowCount: result?.length || 0 });
      
      await connection.close();
      log.info('[TallyMasterSync] ODBC connection closed');
      
      if (!result || result.length === 0) {
        log.warn('[TallyMasterSync] No data found in table', { tableName });
        return [];
      }
      
      // Analyze columns to find which have non-null values
      const columns: ColumnInfo[] = [];
      const firstRow = result[0];
      
      for (const [columnName, value] of Object.entries(firstRow)) {
        // Check if ANY row has a non-null value for this column
        const hasData = result.some((row: any) => 
          row[columnName] !== null && 
          row[columnName] !== undefined && 
          row[columnName] !== ''
        );
        
        columns.push({
          name: columnName,
          type: typeof value,
          hasData: hasData
        });
      }
      
      // Filter to only columns with data
      const activeColumns = columns.filter(col => col.hasData);
      
      log.info('[TallyMasterSync] Schema discovered successfully', {
        tableName,
        totalColumns: columns.length,
        activeColumns: activeColumns.length,
        columns: activeColumns.map(c => c.name)
      });
      
      return activeColumns;
    } catch (error) {
      log.error('[TallyMasterSync] Schema discovery failed', { tableName, error });
      throw error;
    }
  }

  /**
   * Step 2: Full Data Pull - Fetch all rows with only non-null columns
   */
  async pullFullData(
    odbc: any,
    masterTable: MasterTable,
    columns: ColumnInfo[],
    port: number
  ): Promise<any[]> {
    let connection: any = null;
    
    try {
      log.info('[TallyMasterSync] Starting full data pull', { tableName: masterTable.name, columnCount: columns.length });
      
      // Try multiple connection string formats (same as main.ts)
      const dsnLessConnectionString = `DRIVER={Tally ODBC Driver};SERVER=localhost;PORT=${port}`;
      const dsnConnectionString = `DSN=TallyODBC64_${port}`;
      const connectStrings = [dsnLessConnectionString, dsnConnectionString];
      
      let lastError: any = null;
      
      // Try each connection string
      for (const connStr of connectStrings) {
        try {
          log.info('[TallyMasterSync] Attempting ODBC connection for full pull', { connectionString: connStr });
          
          if (typeof odbc.connect === 'function') {
            connection = await odbc.connect(connStr);
            log.info('[TallyMasterSync] ODBC connection established for full pull', { method: 'connect' });
            break;
          } else if (typeof odbc.pool === 'function') {
            connection = await odbc.pool(connStr);
            log.info('[TallyMasterSync] ODBC connection established for full pull', { method: 'pool' });
            break;
          }
        } catch (connError: any) {
          log.warn('[TallyMasterSync] Connection attempt failed', { connectionString: connStr, error: connError.message });
          lastError = connError;
          connection = null;
        }
      }
      
      if (!connection) {
        throw lastError || new Error('Failed to connect with any connection string');
      }
      
      const columnNames = columns.map(c => `[${c.name}]`).join(', ');
      const query = `SELECT ${columnNames} FROM ${masterTable.tallyTable}`;
      
      log.info('Executing query:', query);
      
      const result = await connection.query(query);
      log.info('[TallyMasterSync] Full data query executed', { rowCount: result?.length || 0 });
      
      await connection.close();
      log.info('[TallyMasterSync] ODBC connection closed after full pull');
      
      log.info('[TallyMasterSync] Full data pulled successfully', {
        tableName: masterTable.name,
        totalRecords: result.length
      });
      
      return result;
    } catch (error) {
      log.error('[TallyMasterSync] Full data pull failed', { tableName: masterTable.name, error });
      throw error;
    }
  }

  /**
   * Step 3: Store data in SQLite
   */
  async storeInSQLite(
    masterTable: MasterTable,
    columns: ColumnInfo[],
    data: any[]
  ): Promise<void> {
    if (!this.db) {
      log.error('[TallyMasterSync] Database not initialized');
      throw new Error('Database not initialized');
    }
    
    try {
      log.info('[TallyMasterSync] Starting SQLite storage', { 
        tableName: masterTable.name,
        columnCount: columns.length,
        recordCount: data.length
      });
      
      // Drop existing table if exists
      log.info('[TallyMasterSync] Dropping existing table if exists');
      this.db.exec(`DROP TABLE IF EXISTS ${masterTable.name}`);
      
      // Create table with discovered schema
      const columnDefs = columns.map(col => {
        let sqlType = 'TEXT';
        if (col.type === 'number') sqlType = 'REAL';
        if (col.type === 'boolean') sqlType = 'INTEGER';
        return `[${col.name}] ${sqlType}`;
      }).join(', ');
      
      const createTableSQL = `
        CREATE TABLE ${masterTable.name} (
          _id INTEGER PRIMARY KEY AUTOINCREMENT,
          ${columnDefs},
          _synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          _modified INTEGER DEFAULT 0
        )
      `;
      
      log.info('[TallyMasterSync] Creating table', { sql: createTableSQL.substring(0, 150) + '...' });
      this.db.exec(createTableSQL);
      log.info('[TallyMasterSync] Table created successfully');
      
      // Insert data
      if (data.length > 0) {
        log.info('[TallyMasterSync] Preparing to insert records', { count: data.length });
        
        const columnNames = columns.map(c => `[${c.name}]`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        
        const insertSQL = `
          INSERT INTO ${masterTable.name} (${columnNames})
          VALUES (${placeholders})
        `;
        
        log.info('[TallyMasterSync] Insert SQL prepared');
        const insert = this.db.prepare(insertSQL);
        
        log.info('[TallyMasterSync] Starting transaction for bulk insert');
        const insertMany = this.db.transaction((rows: any[]) => {
          for (const row of rows) {
            const values = columns.map(col => row[col.name]);
            insert.run(values);
          }
        });
        
        insertMany(data);
        log.info('[TallyMasterSync] Bulk insert completed', { recordsInserted: data.length });
      } else {
        log.warn('[TallyMasterSync] No data to insert');
      }
      
      // Update metadata with cardinality
      log.info('[TallyMasterSync] Updating sync metadata');
      
      // Calculate cardinality: total columns in the table (including system columns)
      const totalColumnsInTable = columns.length + 3; // +3 for _id, _synced_at, _modified
      
      const metadata = {
        table_name: masterTable.name,
        last_sync: new Date().toISOString(),
        total_records: data.length,
        total_columns: totalColumnsInTable,
        active_columns: columns.length,
        schema_json: JSON.stringify(columns)
      };
      
      this.db.prepare(`
        INSERT OR REPLACE INTO _sync_metadata 
        (table_name, last_sync, total_records, total_columns, active_columns, schema_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        metadata.table_name,
        metadata.last_sync,
        metadata.total_records,
        metadata.total_columns,
        metadata.active_columns,
        metadata.schema_json
      );
      
      log.info('[TallyMasterSync] Data stored successfully in SQLite', {
        tableName: masterTable.name,
        totalRecords: data.length,
        columnsStored: columns.length
      });
      
    } catch (error) {
      log.error('[TallyMasterSync] Failed to store data in SQLite', { tableName: masterTable.name, error });
      throw error;
    }
  }

  /**
   * Step 4: Full Sync - Discover schema + Pull data + Store
   */
  async syncMasterTable(
    odbc: any,
    masterTable: MasterTable,
    port: number
  ): Promise<void> {
    try {
      log.info('[TallyMasterSync] ========================================');
      log.info('[TallyMasterSync] Starting sync for table', { 
        name: masterTable.name,
        displayName: masterTable.displayName,
        tallyTable: masterTable.tallyTable,
        category: masterTable.category
      });
      
      this.setSyncStatus(masterTable.name, {
        lastSync: null,
        totalRecords: 0,
        status: 'syncing'
      });
      
      // Step 1: Discover schema
      log.info('[TallyMasterSync] Step 1: Schema Discovery');
      const columns = await this.discoverSchema(odbc, masterTable.tallyTable, port);
      log.info('[TallyMasterSync] Schema discovery completed', { activeColumns: columns.length });
      
      if (columns.length === 0) {
        log.warn('[TallyMasterSync] No columns with data found, skipping table', { tableName: masterTable.name });
        this.setSyncStatus(masterTable.name, {
          lastSync: new Date(),
          totalRecords: 0,
          status: 'idle',
        });
        return;
      }
      
      // Step 2: Pull full data
      log.info('[TallyMasterSync] Step 2: Full Data Pull');
      const records = await this.pullFullData(odbc, masterTable, columns, port);
      log.info('[TallyMasterSync] Full data pull completed', { recordCount: records.length });
      
      // Step 3: Store in SQLite
      log.info('[TallyMasterSync] Step 3: Storing in SQLite');
      await this.storeInSQLite(masterTable, columns, records);
      log.info('[TallyMasterSync] Data stored in SQLite successfully');
      
      // Update sync status
      this.setSyncStatus(masterTable.name, {
        lastSync: new Date(),
        totalRecords: records.length,
        status: 'idle',
      });
      
      log.info('[TallyMasterSync] Sync completed successfully', { 
        tableName: masterTable.name,
        displayName: masterTable.displayName,
        totalRecords: records.length
      });
      log.info('[TallyMasterSync] ========================================');
    } catch (error) {
      log.error('[TallyMasterSync] Sync failed for table', { tableName: masterTable.name, error });
      this.setSyncStatus(masterTable.name, {
        lastSync: null,
        totalRecords: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      log.info('[TallyMasterSync] ========================================');
      throw error;
    }
  }

  /**
   * Sync all master tables with progress tracking
   */
  async syncAllMasters(
    odbc: any, 
    port: number,
    onProgress?: (progress: { current: number; total: number; percentage: number; tableName: string }) => void
  ): Promise<{ successCount: number; failureCount: number; errors: Array<{ table: string; error: string }> }> {
    log.info('[TallyMasterSync] Starting full sync of all master tables');
    
    const totalTables = this.MASTER_TABLES.length;
    let completedTables = 0;
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ table: string; error: string }> = [];
    
    for (const masterTable of this.MASTER_TABLES) {
      try {
        log.info(`[TallyMasterSync] Syncing ${completedTables + 1}/${totalTables}: ${masterTable.displayName}`);
        
        // Report progress before syncing
        if (onProgress) {
          const percentage = Math.round((completedTables / totalTables) * 100);
          onProgress({
            current: completedTables,
            total: totalTables,
            percentage,
            tableName: masterTable.displayName
          });
        }
        
        await this.syncMasterTable(odbc, masterTable, port);
        completedTables++;
        successCount++;
        
        log.info(`[TallyMasterSync] ✅ Successfully synced ${masterTable.displayName}`);
        
        // Report progress after syncing
        if (onProgress) {
          const percentage = Math.round((completedTables / totalTables) * 100);
          onProgress({
            current: completedTables,
            total: totalTables,
            percentage,
            tableName: masterTable.displayName
          });
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        log.error(`[TallyMasterSync] ❌ Failed to sync ${masterTable.displayName}:`, error);
        
        errors.push({
          table: masterTable.displayName,
          error: errorMsg
        });
        
        completedTables++;
        failureCount++;
        // Continue with next table even if one fails
      }
    }
    
    log.info('[TallyMasterSync] Full sync completed', { 
      successCount, 
      failureCount, 
      totalTables 
    });
    
    // If ALL tables failed, throw error
    if (successCount === 0 && failureCount > 0) {
      const errorSummary = errors.map(e => `${e.table}: ${e.error}`).join('; ');
      throw new Error(`All tables failed to sync! Errors: ${errorSummary}`);
    }
    
    return { successCount, failureCount, errors };
  }

  /**
   * Sync only accounting masters
   */
  async syncAccountingMasters(odbc: any, port: number): Promise<void> {
    log.info('Starting sync of accounting masters');
    
    const accountingMasters = this.MASTER_TABLES.filter(m => m.category === 'accounting');
    
    for (const masterTable of accountingMasters) {
      try {
        await this.syncMasterTable(odbc, masterTable, port);
      } catch (error) {
        log.error(`Failed to sync ${masterTable.name}:`, error);
      }
    }
    
    log.info('Accounting masters sync completed');
  }

  /**
   * Sync only inventory masters
   */
  async syncInventoryMasters(odbc: any, port: number): Promise<void> {
    log.info('Starting sync of inventory masters');
    
    const inventoryMasters = this.MASTER_TABLES.filter(m => m.category === 'inventory');
    
    for (const masterTable of inventoryMasters) {
      try {
        await this.syncMasterTable(odbc, masterTable, port);
      } catch (error) {
        log.error(`Failed to sync ${masterTable.name}:`, error);
      }
    }
    
    log.info('Inventory masters sync completed');
  }

  /**
   * Get all master tables
   */
  getAllMasterTables(): MasterTable[] {
    return this.MASTER_TABLES;
  }

  /**
   * Get master tables by category
   */
  getMasterTablesByCategory(category: 'accounting' | 'inventory'): MasterTable[] {
    return this.MASTER_TABLES.filter(m => m.category === category);
  }

  /**
   * Get sync status for all tables (loads from database)
   */
  getSyncStatus(): Map<string, SyncStatus> {
    // Load fresh status from database
    this.loadSyncStatusFromDB();
    return this.syncStatus;
  }

  /**
   * Load sync status from database metadata
   */
  private loadSyncStatusFromDB(): void {
    if (!this.db) {
      log.warn('[TallyMasterSync] Cannot load sync status - database not initialized');
      return;
    }
    
    try {
      // Check if metadata table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='_sync_metadata'
      `).get();
      
      if (!tableExists) {
        log.warn('[TallyMasterSync] Metadata table does not exist yet');
        return;
      }
      
      const rows = this.db.prepare(`
        SELECT table_name, last_sync, total_records 
        FROM _sync_metadata
      `).all() as Array<{ table_name: string; last_sync: string | null; total_records: number }>;
      
      log.info('[TallyMasterSync] Raw rows from database:', rows);
      
      for (const row of rows) {
        this.syncStatus.set(row.table_name, {
          lastSync: row.last_sync ? new Date(row.last_sync) : null,
          totalRecords: row.total_records || 0,
          status: 'idle'
        });
      }
      
      log.info('[TallyMasterSync] Loaded sync status from database', { 
        tablesLoaded: rows.length,
        tables: Array.from(this.syncStatus.keys())
      });
    } catch (error) {
      log.error('[TallyMasterSync] Failed to load sync status from DB:', error);
    }
  }

  /**
   * Get database path
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Set sync status for a table
   */
  private setSyncStatus(tableName: string, status: SyncStatus): void {
    this.syncStatus.set(tableName, status);
  }

  /**
   * Query local SQLite data
   */
  query(sql: string, params: any[] = []): any[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return this.db.prepare(sql).all(...params);
  }

  /**
   * Get all records from a master table
   */
  getMasterRecords(tableName: string, limit: number = 100, offset: number = 0): any[] {
    return this.query(
      `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const tallyMasterSync = new TallyMasterSync();
