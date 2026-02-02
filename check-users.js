import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from bot's .env file
dotenv.config({ path: join(__dirname, '..', 'BotWhatsapp', '.env') });

const { Pool } = pg;

// Detect if using cloud database and enable SSL
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

async function checkUsers() {
    try {
        const result = await pool.query('SELECT id, username, email, role, activo, creado_en FROM usuarios ORDER BY creado_en DESC');
        
        console.log('\n📊 Usuarios en la base de datos:\n');
        console.log('='.repeat(80));
        
        if (result.rows.length === 0) {
            console.log('\n⚠️  No hay usuarios en la base de datos.');
            console.log('   Ejecute "npm run create-admin" para crear el primer administrador.\n');
        } else {
            console.log(`\nTotal de usuarios: ${result.rows.length}\n`);
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user.id}`);
                console.log(`   Username: ${user.username}`);
                console.log(`   Email: ${user.email || '(no proporcionado)'}`);
                console.log(`   Rol: ${user.role}`);
                console.log(`   Activo: ${user.activo ? 'Sí' : 'No'}`);
                console.log(`   Creado: ${user.creado_en}`);
                console.log('');
            });
        }
        
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('\n❌ Error al consultar usuarios:', error.message);
        if (error.code === '42P01') {
            console.error('\n💡 La tabla "usuarios" no existe.');
            console.error('   Ejecute el script de migración primero:');
            console.error('   psql "postgresql://..." -f d:\\BotWhatsapp\\database\\new_schema.sql\n');
        }
    } finally {
        await pool.end();
    }
}

checkUsers();
