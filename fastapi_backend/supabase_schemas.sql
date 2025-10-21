-- ============================================================================
-- SUPABASE TABLE SCHEMAS FOR PRODUCT QUERY POC
-- ============================================================================

-- Table 1: Stock Items (Products with rates and quantities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    item_name_lower TEXT NOT NULL, -- Lowercase version for case-insensitive search
    quantity INTEGER NOT NULL DEFAULT 0,
    rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on lowercase item name for fast searching
CREATE INDEX IF NOT EXISTS idx_stock_items_name_lower ON stock_items(item_name_lower);

-- Create full-text search index for better search capabilities
CREATE INDEX IF NOT EXISTS idx_stock_items_name_search ON stock_items USING gin(to_tsvector('english', item_name_lower));

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table 2: Party Performance (Customer payment performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_name TEXT NOT NULL,
    party_name_lower TEXT NOT NULL, -- Lowercase version for case-insensitive search
    payment_performance_days DECIMAL(10, 2), -- NULL if no data available
    payment_performance_text TEXT, -- Original text like "2.00 days"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on lowercase party name for fast searching
CREATE INDEX IF NOT EXISTS idx_party_performance_name_lower ON party_performance(party_name_lower);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_party_performance_name_search ON party_performance USING gin(to_tsvector('english', party_name_lower));

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_party_performance_updated_at BEFORE UPDATE ON party_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE stock_items IS 'Product inventory with rates and stock quantities';
COMMENT ON COLUMN stock_items.item_name IS 'Original product name as stored';
COMMENT ON COLUMN stock_items.item_name_lower IS 'Lowercase product name for case-insensitive matching';
COMMENT ON COLUMN stock_items.quantity IS 'Available stock quantity';
COMMENT ON COLUMN stock_items.rate IS 'Product rate/price';

COMMENT ON TABLE party_performance IS 'Customer/Party payment performance tracking';
COMMENT ON COLUMN party_performance.party_name IS 'Original party/customer name';
COMMENT ON COLUMN party_performance.party_name_lower IS 'Lowercase party name for case-insensitive matching';
COMMENT ON COLUMN party_performance.payment_performance_days IS 'Average payment days (numeric)';
COMMENT ON COLUMN party_performance.payment_performance_text IS 'Original payment performance text from Excel';
