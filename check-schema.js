import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', 'BotWhatsapp', '.env') });

const { Pool } = pg;

const isCloudDatabase = process.env.DB_HOST && (
    process.env.DB_HOST.includes('neon.tech') ||
    process.env.DB_HOST.includes('aws.') ||
    process.env.DB_HOST.includes('azure.') ||
    process.env.DB_HOST.includes('googleapis.com')
);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: isCloudDatabase ? {
        rejectUnauthorized: false
    } : false
});

async function checkSchema() {
    try {
        // Check which tables exist
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('\n📋 Tablas en la base de datos:\n');
        console.log('='.repeat(80));
        
        const tables = tablesResult.rows.map(r => r.table_name);
        const panelTables = ['usuarios', 'sesiones', 'sesiones_auditoria', 'admin_commands', 'bot_heartbeat'];
        const botTables = ['estudiantes', 'semestres', 'materias', 'grupos', 'grupo_materia', 'boletas_inscripciones', 'boleta_grupo'];
        
        console.log('\n✅ Tablas del BOT:');
        botTables.forEach(table => {
            const exists = tables.includes(table);
            console.log(`   ${exists ? '✓' : '✗'} ${table}`);
        });
        
        console.log('\n📊 Tablas del PANEL:');
        panelTables.forEach(table => {
            const exists = tables.includes(table);
            console.log(`   ${exists ? '✓' : '✗'} ${table}`);
        });
        
        console.log('\n📝 Todas las tablas encontradas:');
        tables.forEach(table => console.log(`   - ${table}`));
        
        const missingPanelTables = panelTables.filter(t => !tables.includes(t));
        
        if (missingPanelTables.length > 0) {
            console.log('\n\n⚠️  PROBLEMA DETECTADO:');
            console.log('   Faltan las siguientes tablas del panel:');
            missingPanelTables.forEach(t => console.log(`   - ${t}`));
            console.log('\n💡 SOLUCIÓN:');
            console.log('   Debe aplicar el schema extendido ejecutando:');
            console.log('   psql "postgresql://neondb_owner:npg_Laq3RGdpT2sN@ep-nameless-butterfly-achcdeyz-pooler.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require" -f d:\\BotWhatsapp\\database\\new_schema.sql');
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
