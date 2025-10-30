import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './styles.css';

interface MasterTable {
  name: string;
  displayName: string;
  tallyTable: string;
  category: 'accounting' | 'inventory';
}

interface SyncStatus {
  lastSync: Date | null;
  totalRecords: number;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

const MasterDataSync: React.FC = () => {
  const navigate = useNavigate();
  const [masterTables, setMasterTables] = useState<MasterTable[]>([]);
  const [syncStatus, setSyncStatus] = useState<Map<string, SyncStatus>>(new Map());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    tableName: string;
  } | null>(null);

  // Load master tables on mount
  useEffect(() => {
    loadMasterTables();
    checkDatabaseInfo();
    
    // Listen for progress updates
    const unsubscribe = window.electron.ipcRenderer.on('tally-sync:progress', (progress: any) => {
      console.log('[MasterSync] Progress update:', progress);
      setSyncProgress(progress);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Check database info
   */
  const checkDatabaseInfo = async () => {
    try {
      const dbInfo = await window.electron.ipcRenderer.invoke<any>('tally-sync:get-db-info');
      console.log('[MasterSync] Database Info:', dbInfo);
      console.log(`[MasterSync] DB Path: ${dbInfo.dbPath}`);
      console.log(`[MasterSync] DB Exists: ${dbInfo.exists}`);
      console.log(`[MasterSync] DB Size: ${dbInfo.sizeFormatted}`);
    } catch (error) {
      console.error('[MasterSync] Failed to get DB info:', error);
    }
  };

  /**
   * Load list of master tables from main process
   */
  const loadMasterTables = async () => {
    try {
      console.log('[MasterSync] Loading master tables...');
      
      // Call IPC to get master tables list
      const tables = await window.electron.ipcRenderer.invoke<MasterTable[]>('tally-sync:get-master-tables');
      setMasterTables(tables);
      
      console.log('[MasterSync] Master tables loaded:', tables.length);
      
      // Load sync status from database
      await loadSyncStatus();
    } catch (error) {
      console.error('[MasterSync] Failed to load master tables:', error);
      toast.error('Failed to load master tables');
    }
  };

  /**
   * Load sync status from database
   */
  const loadSyncStatus = async () => {
    try {
      console.log('[MasterSync] Loading sync status from database...');
      
      const status = await window.electron.ipcRenderer.invoke<any>('tally-sync:get-status');
      
      console.log('[MasterSync] Sync status loaded:', status);
      
      // Check if status is empty
      if (!status || Object.keys(status).length === 0) {
        console.log('[MasterSync] No sync status found in database (tables not synced yet)');
        return;
      }
      
      // Convert to Map
      const statusMap = new Map<string, SyncStatus>();
      Object.entries(status).forEach(([key, value]: [string, any]) => {
        statusMap.set(key, {
          lastSync: value.lastSync ? new Date(value.lastSync) : null,
          totalRecords: value.totalRecords || 0,
          status: value.status || 'idle'
        });
      });
      
      setSyncStatus(statusMap);
      
      console.log('[MasterSync] Sync status set in state, total tables:', statusMap.size);
    } catch (error) {
      console.error('[MasterSync] Failed to load sync status:', error);
    }
  };

  /**
   * Sync a single master table
   */
  const syncMasterTable = async (tableName: string) => {
    console.log(`[MasterSync] Starting sync for table: ${tableName}`);
    
    try {
      // Update status to syncing
      setSyncStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(tableName, {
          lastSync: null,
          totalRecords: 0,
          status: 'syncing',
        });
        return newMap;
      });

      console.log(`[MasterSync] Calling IPC for table: ${tableName}`);
      
      // Call IPC to sync table
      const result = await window.electron.ipcRenderer.invoke<{ success: boolean; totalRecords: number }>('tally-sync:sync-table', tableName);
      
      console.log(`[MasterSync] Sync result for ${tableName}:`, result);
      
      // Update status with result
      setSyncStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(tableName, {
          lastSync: new Date(),
          totalRecords: result.totalRecords,
          status: 'idle',
        });
        return newMap;
      });

      console.log(`[MasterSync] ${tableName} synced successfully! Records: ${result.totalRecords}`);
      toast.success(`${tableName} synced! ${result.totalRecords} records`);
    } catch (error) {
      console.error(`[MasterSync] Failed to sync ${tableName}:`, error);
      
      setSyncStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(tableName, {
          lastSync: null,
          totalRecords: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return newMap;
      });

      toast.error(`Failed to sync ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Sync all master tables
   */
  const syncAllMasters = async () => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 11, percentage: 0, tableName: 'Starting...' });
    toast.loading('Syncing all masters...', { id: 'sync-all' });

    try {
      const result = await window.electron.ipcRenderer.invoke<any>('tally-sync:sync-all');
      
      console.log('[MasterSync] Sync All Result:', result);
      
      // Reload status
      await loadMasterTables();
      
      setSyncProgress(null);
      
      if (result.failureCount > 0) {
        const errorMsg = `Synced ${result.successCount}/${result.successCount + result.failureCount} tables. ${result.failureCount} failed.`;
        console.error('[MasterSync] Sync errors:', result.errors);
        toast.error(errorMsg, { id: 'sync-all', duration: 5000 });
        
        // Show detailed errors in console
        result.errors.forEach((err: any) => {
          console.error(`[MasterSync] ${err.table}: ${err.error}`);
        });
      } else {
        toast.success(`All ${result.successCount} masters synced successfully!`, { id: 'sync-all' });
      }
    } catch (error) {
      console.error('[MasterSync] Failed to sync all masters:', error);
      setSyncProgress(null);
      toast.error(`Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'sync-all', duration: 5000 });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Sync only accounting masters
   */
  const syncAccountingMasters = async () => {
    setIsSyncing(true);
    toast.loading('Syncing accounting masters...', { id: 'sync-accounting' });

    try {
      await window.electron.ipcRenderer.invoke('tally-sync:sync-accounting');
      
      toast.success('Accounting masters synced!', { id: 'sync-accounting' });
    } catch (error) {
      console.error('Failed to sync accounting masters:', error);
      toast.error('Failed to sync accounting masters', { id: 'sync-accounting' });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Sync only inventory masters
   */
  const syncInventoryMasters = async () => {
    setIsSyncing(true);
    toast.loading('Syncing inventory masters...', { id: 'sync-inventory' });

    try {
      await window.electron.ipcRenderer.invoke('tally-sync:sync-inventory');
      
      toast.success('Inventory masters synced!', { id: 'sync-inventory' });
    } catch (error) {
      console.error('Failed to sync inventory masters:', error);
      toast.error('Failed to sync inventory masters', { id: 'sync-inventory' });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  /**
   * Get status for a table
   */
  const getTableStatus = (tableName: string): SyncStatus => {
    return syncStatus.get(tableName) || {
      lastSync: null,
      totalRecords: 0,
      status: 'idle',
    };
  };

  // Group tables by category
  const accountingMasters = masterTables.filter(t => t.category === 'accounting');
  const inventoryMasters = masterTables.filter(t => t.category === 'inventory');

  return (
    <div className="master-sync-container">
      {/* Header */}
      <div className="sync-header">
        <button onClick={() => navigate('/chat')} className="back-btn">
          ← Back to Chat
        </button>
        <h1>📊 Tally Master Data Sync</h1>
        <p className="subtitle">Sync Tally master data to local database</p>
      </div>

      {/* Progress Bar */}
      {syncProgress && (
        <div className="progress-container">
          <div className="progress-info">
            <span className="progress-text">
              Syncing {syncProgress.tableName}... ({syncProgress.current}/{syncProgress.total})
            </span>
            <span className="progress-percentage">{syncProgress.percentage}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${syncProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sync-actions">
        <button 
          onClick={syncAllMasters} 
          disabled={isSyncing}
          className="btn-primary btn-large"
        >
          🔄 Sync All Masters {isSyncing && '(Syncing...)'}
        </button>
        <button 
          onClick={syncAccountingMasters} 
          disabled={isSyncing}
          className="btn-secondary"
        >
          💰 Sync Accounting
        </button>
        <button 
          onClick={syncInventoryMasters} 
          disabled={isSyncing}
          className="btn-secondary"
        >
          📦 Sync Inventory
        </button>
      </div>

      {/* Accounting Masters */}
      <div className="masters-section">
        <h2>💰 Accounting Masters</h2>
        <div className="masters-grid">
          {accountingMasters.map((table) => {
            const status = getTableStatus(table.name);
            return (
              <div key={table.name} className="master-card">
                <div className="master-header">
                  <h3>{table.displayName}</h3>
                  <span className={`status-badge status-${status.status}`}>
                    {status.status === 'syncing' && '⏳ Syncing...'}
                    {status.status === 'idle' && '✅ Ready'}
                    {status.status === 'error' && '❌ Error'}
                  </span>
                </div>
                
                <div className="master-info">
                  <div className="info-row">
                    <span className="label">Last Sync:</span>
                    <span className="value">{formatTimestamp(status.lastSync)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Records:</span>
                    <span className="value">{status.totalRecords.toLocaleString()}</span>
                  </div>
                  {status.error && (
                    <div className="error-message">{status.error}</div>
                  )}
                </div>

                <button 
                  onClick={() => syncMasterTable(table.name)}
                  disabled={status.status === 'syncing'}
                  className="btn-sync"
                >
                  {status.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Masters */}
      <div className="masters-section">
        <h2>📦 Inventory Masters</h2>
        <div className="masters-grid">
          {inventoryMasters.map((table) => {
            const status = getTableStatus(table.name);
            return (
              <div key={table.name} className="master-card">
                <div className="master-header">
                  <h3>{table.displayName}</h3>
                  <span className={`status-badge status-${status.status}`}>
                    {status.status === 'syncing' && '⏳ Syncing...'}
                    {status.status === 'idle' && '✅ Ready'}
                    {status.status === 'error' && '❌ Error'}
                  </span>
                </div>
                
                <div className="master-info">
                  <div className="info-row">
                    <span className="label">Last Sync:</span>
                    <span className="value">{formatTimestamp(status.lastSync)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Records:</span>
                    <span className="value">{status.totalRecords.toLocaleString()}</span>
                  </div>
                  {status.error && (
                    <div className="error-message">{status.error}</div>
                  )}
                </div>

                <button 
                  onClick={() => syncMasterTable(table.name)}
                  disabled={status.status === 'syncing'}
                  className="btn-sync"
                >
                  {status.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MasterDataSync;
