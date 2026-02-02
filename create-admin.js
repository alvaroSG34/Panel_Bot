import readline from 'readline';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from bot's .env file
dotenv.config({ path: join(__dirname, '..', 'BotWhatsapp', '.env') });

const { Pool } = pg;

// Detect if using cloud database (Neon, AWS RDS, etc.) and enable SSL
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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function questionHidden(query) {
    return new Promise(resolve => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        
        stdout.write(query);
        stdin.setEncoding('utf8');
        stdin.setRawMode(true);
        stdin.resume();
        
        let password = '';
        
        const onData = (char) => {
            if (char === '\n' || char === '\r' || char === '\u0004') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', onData);
                stdout.write('\n');
                resolve(password);
            } else if (char === '\u0003') {
                // Ctrl+C
                stdin.setRawMode(false);
                process.exit(0);
            } else if (char === '\b' || char === '\u007f') {
                // Backspace
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    stdout.write('\b \b');
                }
            } else {
                password += char;
                stdout.write('*');
            }
        };
        
        stdin.on('data', onData);
    });
}

function validateUsername(username) {
    if (!username || username.length < 3 || username.length > 20) {
        return 'El nombre de usuario debe tener entre 3 y 20 caracteres';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }
    return null;
}

function validatePassword(password) {
    if (!password || password.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[a-z]/.test(password)) {
        return 'La contraseña debe contener al menos una letra minúscula';
    }
    if (!/[A-Z]/.test(password)) {
        return 'La contraseña debe contener al menos una letra mayúscula';
    }
    if (!/[0-9]/.test(password)) {
        return 'La contraseña debe contener al menos un número';
    }
    return null;
}

function validateEmail(email) {
    if (!email) return null; // Email es opcional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'El email no es válido';
    }
    return null;
}

async function createAdmin() {
    console.log('\n='.repeat(60));
    console.log('  CREAR ADMINISTRADOR DEL PANEL - WhatsApp Enrollment Bot');
    console.log('='.repeat(60));
    console.log('\nEste script creará el primer usuario administrador.');
    console.log('Si ya existe un administrador, el script abortará.\n');

    try {
        // Check if admin already exists
        const checkQuery = 'SELECT COUNT(*) as count FROM usuarios WHERE role = $1';
        const result = await pool.query(checkQuery, ['admin']);
        
        if (parseInt(result.rows[0].count) > 0) {
            console.log('❌ ERROR: Ya existe un administrador en el sistema.');
            console.log('   No se pueden crear múltiples administradores con este script.');
            console.log('   Use el panel web para gestionar usuarios adicionales.\n');
            process.exit(1);
        }

        // Get username
        let username;
        while (true) {
            username = await question('Nombre de usuario: ');
            const error = validateUsername(username);
            if (error) {
                console.log(`❌ ${error}`);
                continue;
            }
            break;
        }

        // Get password
        let password;
        while (true) {
            password = await questionHidden('Contraseña: ');
            const error = validatePassword(password);
            if (error) {
                console.log(`❌ ${error}`);
                continue;
            }
            
            const confirmPassword = await questionHidden('Confirmar contraseña: ');
            if (password !== confirmPassword) {
                console.log('❌ Las contraseñas no coinciden');
                continue;
            }
            break;
        }

        // Get email (optional)
        let email;
        while (true) {
            // Restaurar stdin a modo normal antes de pedir email
            process.stdin.setRawMode(false);
            process.stdin.resume();
            
            email = await question('Email (opcional, presione Enter para omitir): ');
            if (!email) break;
            
            const error = validateEmail(email);
            if (error) {
                console.log(`❌ ${error}`);
                continue;
            }
            break;
        }

        // Hash password
        console.log('\n⏳ Creando usuario administrador...');
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert admin user
        const insertQuery = `
            INSERT INTO usuarios (username, password_hash, email, role, activo, version)
            VALUES ($1, $2, $3, $4, TRUE, 0)
            RETURNING id, username, email, role, creado_en
        `;
        
        const insertResult = await pool.query(insertQuery, [
            username,
            passwordHash,
            email || null,
            'admin'
        ]);

        const admin = insertResult.rows[0];

        console.log('\n✅ ¡Administrador creado exitosamente!\n');
        console.log('Detalles del usuario:');
        console.log(`  ID:              ${admin.id}`);
        console.log(`  Username:        ${admin.username}`);
        console.log(`  Email:           ${admin.email || '(no proporcionado)'}`);
        console.log(`  Rol:             ${admin.role}`);
        console.log(`  Fecha creación:  ${admin.creado_en}`);
        console.log('\n' + '='.repeat(60));
        console.log('\n📌 Guarde estas credenciales de forma segura.');
        console.log('   Puede iniciar sesión en el panel con este usuario.\n');

    } catch (error) {
        console.error('\n❌ Error al crear administrador:', error.message);
        if (error.code === '42P01') {
            console.error('\n💡 La tabla "usuarios" no existe.');
            console.error('   Asegúrese de haber ejecutado el script de migración:');
            console.error('   psql -U postgres -d enrollment_db -f database/new_schema.sql\n');
        }
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

// Run the script
createAdmin().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
