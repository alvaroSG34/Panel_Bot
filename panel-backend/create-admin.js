const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.usuarios.findFirst({
      where: { nombre_usuario: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ El usuario admin ya existe');
      console.log('Username: admin');
      console.log('Puedes cambiar la contraseña si lo necesitas');
      return;
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.usuarios.create({
      data: {
        nombre_usuario: 'admin',
        contraseña: hashedPassword,
        rol: 'admin',
        activo: true
      }
    });

    console.log('✅ Usuario admin creado exitosamente!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Rol: admin');
    console.log('\n⚠️  Por favor, cambia la contraseña después del primer login');
  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
