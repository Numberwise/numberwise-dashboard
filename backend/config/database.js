// ============================================================================
// backend/config/database.js - PostgreSQL Connection for Railway
// ============================================================================

const { Pool } = require('pg');

// Railway provides DATABASE_URL automatically
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    // Railway style (automatic)
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  } else {
    // Manual configuration (fallback)
    return {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }
};

const pool = new Pool(getDatabaseConfig());

// Test the connection
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('💥 Database connection error:', err);
});

// Helper function to initialize database
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing Numberwise database...');
    
    // Create companies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'client')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        accounting_system VARCHAR(50) CHECK (accounting_system IN ('exact_online', 'snelstart')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create status tracking tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zenvoices_status (
        client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        pending INTEGER DEFAULT 0,
        processing INTEGER DEFAULT 0,
        ready INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting_status (
        client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        pending INTEGER DEFAULT 0,
        posted INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert Numberwise company if it doesn't exist
    const companyResult = await pool.query(`
      INSERT INTO companies (name, domain) 
      VALUES ('Numberwise', 'numberwise.nl')
      ON CONFLICT (domain) DO NOTHING
      RETURNING id;
    `);

    let companyId;
    if (companyResult.rows.length > 0) {
      companyId = companyResult.rows[0].id;
    } else {
      // Get existing company ID
      const existingCompany = await pool.query(`
        SELECT id FROM companies WHERE domain = 'numberwise.nl'
      `);
      companyId = existingCompany.rows[0].id;
    }

    // Insert sample clients
    await pool.query(`
      INSERT INTO clients (company_id, name, contact_email, accounting_system) 
      VALUES 
        ($1, 'ABC Manufacturing Ltd', 'finance@abcmanufacturing.nl', 'exact_online'),
        ($1, 'XYZ Services BV', 'admin@xyzservices.nl', 'snelstart'),
        ($1, 'Tech Solutions Pro', 'accounting@techsolutions.nl', 'exact_online'),
        ($1, 'Green Energy Partners', 'info@greenenergy.nl', 'snelstart'),
        ($1, 'Retail Excellence BV', 'finance@retailexcellence.nl', 'exact_online')
      ON CONFLICT DO NOTHING;
    `, [companyId]);

    // Insert sample status data
    const clients = await pool.query('SELECT id FROM clients LIMIT 5');
    
    for (const client of clients.rows) {
      await pool.query(`
        INSERT INTO zenvoices_status (client_id, pending, processing, ready, failed)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (client_id) DO NOTHING;
      `, [
        client.id,
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 5),
        Math.floor(Math.random() * 15),
        Math.floor(Math.random() * 3)
      ]);

      await pool.query(`
        INSERT INTO accounting_status (client_id, pending, posted, errors)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (client_id) DO NOTHING;
      `, [
        client.id,
        Math.floor(Math.random() * 8),
        Math.floor(Math.random() * 200) + 50,
        Math.floor(Math.random() * 3)
      ]);
    }

    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = { pool, initializeDatabase };