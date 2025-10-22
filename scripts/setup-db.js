#!/usr/bin/env node

/**
 * Database setup script
 * Creates database and runs schema
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up Medical Platform Database\n');

  const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
  };

  const dbName = process.env.DB_NAME || 'medical_platform';

  // Connect to PostgreSQL (default database)
  const client = new Client({ ...config, database: 'postgres' });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL server');

    // Check if database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Created database: ${dbName}`);
    } else {
      console.log(`✓ Database already exists: ${dbName}`);
    }

    await client.end();

    // Connect to the new database and run schema
    const dbClient = new Client({ ...config, database: dbName });
    await dbClient.connect();
    console.log(`✓ Connected to ${dbName} database`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'Schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split schema by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await dbClient.query(statement);
      } catch (error) {
        // Ignore errors for already existing tables
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✓ Schema executed successfully');

    // Create default admin user if not exists
    const adminCheck = await dbClient.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await dbClient.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, verified) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin@medical.amu.edu.et', hashedPassword, 'admin', 'System', 'Admin', true]
      );
      console.log('✓ Created default admin user (admin@medical.amu.edu.et / admin123)');
      console.log('  ⚠️  Please change the password after first login!');
    }

    await dbClient.end();

    console.log('\n✅ Database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review your .env file configuration');
    console.log('   2. Start the server: npm start or npm run dev');
    console.log('   3. Access API at: http://localhost:' + (process.env.PORT || 5000));
    console.log('\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();
