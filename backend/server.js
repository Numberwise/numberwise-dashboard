require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - Allow all origins for development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Initialize database on startup
initializeDatabase().catch(console.error);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Numberwise Dashboard API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    company: 'Numberwise - Complete administratieve ontzorging',
    cors: 'enabled'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({ 
      status: 'Database connected successfully!',
      currentTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].postgres_version
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'Database connection failed',
      error: error.message 
    });
  }
});

// Get dashboard overview data
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id as client_id,
        c.name as client_name,
        c.accounting_system,
        COALESCE(zv.pending, 0) as zenvoices_pending,
        COALESCE(zv.processing, 0) as zenvoices_processing,
        COALESCE(zv.ready, 0) as zenvoices_ready,
        COALESCE(zv.failed, 0) as zenvoices_failed,
        COALESCE(acc.pending, 0) as accounting_pending,
        COALESCE(acc.posted, 0) as accounting_posted,
        COALESCE(acc.errors, 0) as accounting_errors
      FROM clients c
      LEFT JOIN zenvoices_status zv ON c.id = zv.client_id
      LEFT JOIN accounting_status acc ON c.id = acc.client_id
      WHERE c.is_active = true
      ORDER BY c.name
    `);

    // Calculate summary
    const summary = result.rows.reduce((acc, client) => {
      acc.totalPending += client.zenvoices_pending + client.accounting_pending;
      acc.totalErrors += client.zenvoices_failed + client.accounting_errors;
      acc.totalReady += client.zenvoices_ready;
      acc.totalProcessing += client.zenvoices_processing;
      return acc;
    }, {
      totalPending: 0,
      totalErrors: 0,
      totalReady: 0,
      totalProcessing: 0
    });

    res.json({
      clients: result.rows,
      summary,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get client detail
app.get('/api/dashboard/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        zv.pending as zenvoices_pending,
        zv.processing as zenvoices_processing,
        zv.ready as zenvoices_ready,
        zv.failed as zenvoices_failed,
        acc.pending as accounting_pending,
        acc.posted as accounting_posted,
        acc.errors as accounting_errors
      FROM clients c
      LEFT JOIN zenvoices_status zv ON c.id = zv.client_id
      LEFT JOIN accounting_status acc ON c.id = acc.client_id
      WHERE c.id = $1
    `, [clientId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = result.rows[0];
    
    const recentActivity = [
      {
        id: 1,
        type: 'upload',
        description: `Invoice processing for ${client.name}`,
        status: 'processing',
        time: '10 mins ago'
      }
    ];

    res.json({
      client,
      recentActivity
    });
  } catch (error) {
    console.error('Client detail error:', error);
    res.status(500).json({ error: 'Failed to fetch client data' });
  }
});

// Admin endpoint to cleanup duplicate clients
app.get('/api/admin/cleanup-duplicates', async (req, res) => {
  try {
    console.log('🧹 Starting duplicate cleanup...');
    
    // First, let's see what duplicates we have
    const duplicatesQuery = await pool.query(`
      SELECT name, COUNT(*) as count 
      FROM clients 
      GROUP BY name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    console.log('Found duplicates:', duplicatesQuery.rows);
    
    // Get total before cleanup
    const beforeCount = await pool.query('SELECT COUNT(*) as total FROM clients');
    
    // Remove duplicates, keeping only the oldest record for each name
    const cleanupResult = await pool.query(`
      DELETE FROM clients 
      WHERE id NOT IN (
        SELECT DISTINCT ON (name) id
        FROM clients 
        ORDER BY name, created_at ASC
      )
    `);
    
    console.log(`✅ Removed ${cleanupResult.rowCount} duplicate records`);
    
    // Get final count
    const afterCount = await pool.query('SELECT COUNT(*) as total FROM clients');
    
    res.json({ 
      status: 'Cleanup completed successfully!',
      duplicatesFound: duplicatesQuery.rows,
      recordsRemoved: cleanupResult.rowCount,
      clientCountBefore: parseInt(beforeCount.rows[0].total),
      clientCountAfter: parseInt(afterCount.rows[0].total)
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current client count (helper endpoint)
app.get('/api/admin/client-count', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT name) as unique_names
      FROM clients
    `);
    
    const duplicatesCheck = await pool.query(`
      SELECT name, COUNT(*) as count 
      FROM clients 
      GROUP BY name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    res.json({
      totalClients: parseInt(result.rows[0].total),
      uniqueClientNames: parseInt(result.rows[0].unique_names),
      duplicates: duplicatesCheck.rows
    });
  } catch (error) {
    console.error('Client count error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'This endpoint does not exist in the Numberwise Dashboard API'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Numberwise Dashboard API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏢 Company: Numberwise - Complete administratieve ontzorging`);
  console.log(`🌐 CORS: Enabled for all origins`);
  console.log(`🧹 Admin endpoints: /api/admin/cleanup-duplicates, /api/admin/client-count`);
});