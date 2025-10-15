#!/usr/bin/env python3
"""
Excel to Supabase Parser
------------------------
This script reads Excel files and uploads their data to Supabase tables.
"""

import pandas as pd
import numpy as np
import logging
import re
from typing import Dict, List, Any, Optional

# Import existing project utilities
from app.db.clients import get_supabase_client

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Excel file paths
STOCK_ITEMS_FILE = "/Users/sanyamjain/Desktop/Projects/agent-nexus-search/fastapi_backend/Stock item with rates and stock qty.xlsx"
PARTY_PERFORMANCE_FILE = "/Users/sanyamjain/Desktop/Projects/agent-nexus-search/fastapi_backend/party performance list.xlsx"


class ExcelAnalyzer:
    """Class to analyze Excel files before uploading to Supabase."""
    
    def __init__(self):
        """Initialize the analyzer."""
        logger.info("Excel Analyzer initialized")
    
    def read_excel_file(self, file_path: str, num_rows: int = 5) -> pd.DataFrame:
        """Read an Excel file and return a dataframe with limited rows for analysis."""
        try:
            logger.info(f"\n{'='*80}")
            logger.info(f"Reading Excel file: {file_path}")
            logger.info(f"{'='*80}")
            
            # Read the entire file first to get total count
            df_full = pd.read_excel(file_path)
            total_rows = len(df_full)
            
            # Read only the first few rows for analysis
            df = pd.read_excel(file_path, nrows=num_rows)
            
            logger.info(f"✓ Successfully read Excel file")
            logger.info(f"  Total rows in file: {total_rows}")
            logger.info(f"  Rows loaded for analysis: {len(df)}")
            
            return df
        except Exception as e:
            logger.error(f"✗ Error reading Excel file: {e}")
            raise
    
    def analyze_dataframe(self, df: pd.DataFrame, file_name: str) -> None:
        """Analyze and display dataframe structure."""
        logger.info(f"\n{'='*80}")
        logger.info(f"ANALYZING: {file_name}")
        logger.info(f"{'='*80}")
        
        # Display column information
        logger.info(f"\nColumns ({len(df.columns)} total):")
        logger.info("-" * 80)
        for i, col in enumerate(df.columns, 1):
            dtype = str(df[col].dtype)
            non_null = df[col].notna().sum()
            logger.info(f"  {i}. {col:<40} | Type: {dtype:<10} | Non-null: {non_null}/{len(df)}")
        
        # Display sample data
        logger.info(f"\nSample Data (first {len(df)} rows):")
        logger.info("-" * 80)
        
        # Print each row
        for idx, row in df.iterrows():
            logger.info(f"\nRow {idx + 1}:")
            for col in df.columns:
                value = row[col]
                if pd.isna(value):
                    value = "NULL"
                logger.info(f"  {col}: {value}")
        
        # Data type summary
        logger.info(f"\nData Type Summary:")
        logger.info("-" * 80)
        logger.info(df.dtypes.to_string())
        
        # Missing values summary
        logger.info(f"\nMissing Values:")
        logger.info("-" * 80)
        missing = df.isnull().sum()
        if missing.sum() > 0:
            logger.info(missing[missing > 0].to_string())
        else:
            logger.info("  No missing values found")
    
    def upload_stock_items(self) -> None:
        """Upload stock items to Supabase with lowercase normalization."""
        try:
            logger.info("\n" + "="*80)
            logger.info("📦 UPLOADING STOCK ITEMS TO SUPABASE")
            logger.info("="*80)
            
            # Read the full Excel file
            df = pd.read_excel(STOCK_ITEMS_FILE)
            logger.info(f"✓ Read {len(df)} rows from Excel")
            logger.info(f"  Columns found: {df.columns.tolist()}")
            
            # Remove any completely empty rows
            df = df.dropna(how='all')
            logger.info(f"  After removing empty rows: {len(df)} rows")
            
            # Get the actual column names (they might have different case or spaces)
            cols = df.columns.tolist()
            item_col = None
            quantity_col = None
            rate_col = None
            
            # Find columns by matching (case-insensitive)
            for col in cols:
                col_lower = str(col).lower().strip()
                if 'item' in col_lower:
                    item_col = col
                elif 'quantity' in col_lower or 'qty' in col_lower:
                    quantity_col = col
                elif 'rate' in col_lower or 'price' in col_lower:
                    rate_col = col
            
            if not item_col or not quantity_col or not rate_col:
                raise ValueError(f"Could not find required columns. Found: {cols}")
            
            logger.info(f"  Using columns: Item='{item_col}', Quantity='{quantity_col}', Rate='{rate_col}'")
            
            # Prepare data for Supabase
            records = []
            for _, row in df.iterrows():
                # Skip rows where item name is empty
                if pd.isna(row[item_col]) or str(row[item_col]).strip() == '':
                    continue
                    
                item_name = str(row[item_col]).strip()
                records.append({
                    'item_name': item_name,
                    'item_name_lower': item_name.lower(),
                    'quantity': int(row[quantity_col]) if pd.notna(row[quantity_col]) else 0,
                    'rate': float(row[rate_col]) if pd.notna(row[rate_col]) else 0.0
                })
            
            logger.info(f"  Prepared {len(records)} valid records for upload")
            
            # Get Supabase client
            supabase = get_supabase_client()
            
            # Upload in batches of 100
            batch_size = 100
            total_uploaded = 0
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                result = supabase.table('stock_items').insert(batch).execute()
                total_uploaded += len(batch)
                logger.info(f"  Uploaded batch: {total_uploaded}/{len(records)}")
            
            logger.info(f"✓ Successfully uploaded {total_uploaded} stock items")
            
        except Exception as e:
            logger.error(f"✗ Error uploading stock items: {e}")
            raise
    
    def upload_party_performance(self) -> None:
        """Upload party performance to Supabase with lowercase normalization."""
        try:
            logger.info("\n" + "="*80)
            logger.info("👥 UPLOADING PARTY PERFORMANCE TO SUPABASE")
            logger.info("="*80)
            
            # Read the full Excel file
            df = pd.read_excel(PARTY_PERFORMANCE_FILE)
            logger.info(f"✓ Read {len(df)} rows from Excel")
            logger.info(f"  Columns found: {df.columns.tolist()}")
            
            # Remove any completely empty rows
            df = df.dropna(how='all')
            logger.info(f"  After removing empty rows: {len(df)} rows")
            
            # Get the actual column names
            cols = df.columns.tolist()
            party_col = None
            payment_col = None
            
            # Find columns by matching (case-insensitive)
            for col in cols:
                col_lower = str(col).lower().strip()
                if 'party' in col_lower or 'name' in col_lower:
                    party_col = col
                elif 'payment' in col_lower or 'performance' in col_lower or 'days' in col_lower:
                    payment_col = col
            
            if not party_col:
                raise ValueError(f"Could not find party name column. Found: {cols}")
            
            logger.info(f"  Using columns: Party='{party_col}', Payment='{payment_col if payment_col else 'N/A'}'")
            
            # Prepare data for Supabase
            records = []
            for _, row in df.iterrows():
                # Skip rows where party name is empty
                if pd.isna(row[party_col]) or str(row[party_col]).strip() == '':
                    continue
                    
                party_name = str(row[party_col]).strip()
                payment_text = row[payment_col] if payment_col and payment_col in row.index else None
                
                # Extract numeric days from text like "2.00 days"
                payment_days = None
                if pd.notna(payment_text):
                    try:
                        # Extract number from text
                        match = re.search(r'(\d+\.?\d*)', str(payment_text))
                        if match:
                            payment_days = float(match.group(1))
                    except:
                        pass
                
                records.append({
                    'party_name': party_name,
                    'party_name_lower': party_name.lower(),
                    'payment_performance_days': payment_days,
                    'payment_performance_text': str(payment_text) if pd.notna(payment_text) else None
                })
            
            logger.info(f"  Prepared {len(records)} valid records for upload")
            
            # Get Supabase client
            supabase = get_supabase_client()
            
            # Upload in batches of 100
            batch_size = 100
            total_uploaded = 0
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                result = supabase.table('party_performance').insert(batch).execute()
                total_uploaded += len(batch)
                logger.info(f"  Uploaded batch: {total_uploaded}/{len(records)}")
            
            logger.info(f"✓ Successfully uploaded {total_uploaded} party records")
            
        except Exception as e:
            logger.error(f"✗ Error uploading party performance: {e}")
            raise
    
    def run(self, mode: str = 'analyze') -> None:
        """Run the process in different modes: 'analyze' or 'upload'."""
        if mode == 'analyze':
            logger.info("\n" + "="*80)
            logger.info("EXCEL FILE ANALYZER - Starting Analysis")
            logger.info("="*80)
            
            try:
                # Analyze Stock Items file
                logger.info("\n\n📊 ANALYZING FILE 1: Stock Items")
                stock_df = self.read_excel_file(STOCK_ITEMS_FILE, num_rows=5)
                self.analyze_dataframe(stock_df, "Stock item with rates and stock qty.xlsx")
                
                # Analyze Party Performance file
                logger.info("\n\n📊 ANALYZING FILE 2: Party Performance")
                party_df = self.read_excel_file(PARTY_PERFORMANCE_FILE, num_rows=5)
                self.analyze_dataframe(party_df, "party performance list.xlsx")
                
                logger.info("\n" + "="*80)
                logger.info("✓ ANALYSIS COMPLETE")
                logger.info("="*80)
                logger.info("\nNext steps:")
                logger.info("1. Create Supabase tables using supabase_schemas.sql")
                logger.info("2. Run this script with mode='upload' to upload data")
                
            except Exception as e:
                logger.error(f"\n✗ Error in analysis process: {e}")
                raise
        
        elif mode == 'upload':
            logger.info("\n" + "="*80)
            logger.info("EXCEL TO SUPABASE UPLOADER - Starting Upload")
            logger.info("="*80)
            
            try:
                # Upload stock items
                self.upload_stock_items()
                
                # Upload party performance
                self.upload_party_performance()
                
                logger.info("\n" + "="*80)
                logger.info("✓ UPLOAD COMPLETE")
                logger.info("="*80)
                
            except Exception as e:
                logger.error(f"\n✗ Error in upload process: {e}")
                raise


if __name__ == "__main__":
    import sys
    
    # Check for command-line argument
    mode = 'analyze'  # default mode
    if len(sys.argv) > 1:
        if sys.argv[1] in ['upload', 'analyze']:
            mode = sys.argv[1]
        else:
            print("Usage: python excel_to_supabase.py [analyze|upload]")
            print("  analyze - Analyze Excel files (default)")
            print("  upload  - Upload data to Supabase")
            sys.exit(1)
    
    analyzer = ExcelAnalyzer()
    analyzer.run(mode=mode)
