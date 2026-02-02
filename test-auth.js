/**
 * Script de prueba para el sistema de autenticación
 * Prueba login, refresh token y logout
 */

const API_URL = 'http://localhost:3000';

async function testLogin() {
  console.log('🔐 Probando login con usuario Uagrmbot...\n');

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Uagrmbot',
        password: 'Uagrm348',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en login:', data);
      return null;
    }

    console.log('✅ Login exitoso!');
    console.log('Usuario:', data.user);
    console.log('Access Token (primeros 50 caracteres):', data.accessToken.substring(0, 50) + '...');
    console.log('Refresh Token (primeros 50 caracteres):', data.refreshToken.substring(0, 50) + '...\n');

    return data;
  } catch (error) {
    console.error('❌ Error en petición de login:', error.message);
    return null;
  }
}

async function testRefresh(refreshToken) {
  console.log('🔄 Probando refresh token...\n');

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en refresh:', data);
      return null;
    }

    console.log('✅ Refresh exitoso!');
    console.log('Nuevo Access Token (primeros 50 caracteres):', data.accessToken.substring(0, 50) + '...\n');

    return data.accessToken;
  } catch (error) {
    console.error('❌ Error en petición de refresh:', error.message);
    return null;
  }
}

async function testLogout(accessToken, refreshToken) {
  console.log('👋 Probando logout...\n');

  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en logout:', data);
      return false;
    }

    console.log('✅ Logout exitoso!');
    console.log('Mensaje:', data.message, '\n');

    return true;
  } catch (error) {
    console.error('❌ Error en petición de logout:', error.message);
    return false;
  }
}

async function testProtectedEndpoint(accessToken) {
  console.log('🔒 Probando endpoint protegido...\n');

  try {
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    console.log('Respuesta del endpoint protegido:', data, '\n');

    return true;
  } catch (error) {
    console.error('❌ Error en petición protegida:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     TEST DE AUTENTICACIÓN - Panel Administrativo');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Probar login
  const loginData = await testLogin();
  if (!loginData) {
    console.log('❌ Test fallido: No se pudo hacer login');
    return;
  }

  // 2. Esperar 2 segundos
  console.log('⏳ Esperando 2 segundos antes de refresh...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Probar refresh token
  const newAccessToken = await testRefresh(loginData.refreshToken);
  if (!newAccessToken) {
    console.log('❌ Test fallido: No se pudo refrescar el token');
    return;
  }

  // 4. Probar endpoint protegido con nuevo token
  await testProtectedEndpoint(newAccessToken);

  // 5. Esperar 2 segundos
  console.log('⏳ Esperando 2 segundos antes de logout...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 6. Probar logout
  const logoutSuccess = await testLogout(newAccessToken, loginData.refreshToken);
  if (!logoutSuccess) {
    console.log('❌ Test fallido: No se pudo hacer logout');
    return;
  }

  // 7. Intentar usar el refresh token después de logout (debe fallar)
  console.log('🚫 Probando refresh token después de logout (debe fallar)...\n');
  await testRefresh(loginData.refreshToken);

  console.log('═══════════════════════════════════════════════════════');
  console.log('               ✅ TESTS COMPLETADOS');
  console.log('═══════════════════════════════════════════════════════');
}

// Ejecutar tests
runTests().catch(console.error);
