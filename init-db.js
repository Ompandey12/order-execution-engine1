// Initialize database on Render
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://order_engine_apnl_user:UtXSufM5NIEkSCo9trXfArmP4qGUjJEC@dpg-d4g8fo24d50c73f9fobg-a.oregon-postgres.render.com/order_engine_apnl';

async function initDatabase() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Read SQL file
        const sqlPath = path.join(__dirname, 'sql', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running SQL script...');
        await client.query(sql);
        console.log('✅ Database initialized successfully!');
        console.log('   - Created "orders" table');
        console.log('   - Created index on created_at');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n✅ Done! You can now test your API in Postman.');
    }
}

initDatabase();
