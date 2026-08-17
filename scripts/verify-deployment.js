/**
 * Script de Verificación de Deployment
 * 
 * Uso:
 *   node scripts/verify-deployment.js https://tu-backend.onrender.com
 */

const https = require('https');
const http = require('http');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Obtener la URL del backend desde argumentos
const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error(`${colors.red}❌ Error: Debes proporcionar la URL del backend${colors.reset}`);
  console.log(`${colors.yellow}Uso: node scripts/verify-deployment.js https://tu-backend.onrender.com${colors.reset}`);
  process.exit(1);
}

console.log(`${colors.cyan}🔍 Verificando deployment en: ${baseUrl}${colors.reset}\n`);

// Función para hacer peticiones HTTP/HTTPS
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Tests
const tests = [
  {
    name: 'Health Check',
    endpoint: '/api/v1/health',
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (body) => {
      try {
        const json = JSON.parse(body);
        return json.status === 'OK';
      } catch {
        return false;
      }
    }
  },
  {
    name: 'CORS Headers',
    endpoint: '/api/v1/health',
    method: 'GET',
    validateHeaders: (headers) => {
      return headers['access-control-allow-origin'] !== undefined;
    }
  }
];

// Ejecutar tests
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const url = `${baseUrl}${test.endpoint}`;
    
    try {
      console.log(`${colors.blue}📝 Test: ${test.name}${colors.reset}`);
      console.log(`   URL: ${url}`);
      
      const response = await makeRequest(url);
      
      // Verificar status code
      if (test.expectedStatus && response.statusCode !== test.expectedStatus) {
        console.log(`   ${colors.red}❌ FAILED: Expected status ${test.expectedStatus}, got ${response.statusCode}${colors.reset}`);
        failed++;
        continue;
      }
      
      // Verificar respuesta
      if (test.validateResponse && !test.validateResponse(response.body)) {
        console.log(`   ${colors.red}❌ FAILED: Response validation failed${colors.reset}`);
        console.log(`   Response: ${response.body.substring(0, 100)}`);
        failed++;
        continue;
      }
      
      // Verificar headers
      if (test.validateHeaders && !test.validateHeaders(response.headers)) {
        console.log(`   ${colors.red}❌ FAILED: Headers validation failed${colors.reset}`);
        failed++;
        continue;
      }
      
      console.log(`   ${colors.green}✅ PASSED${colors.reset}`);
      passed++;
      
    } catch (error) {
      console.log(`   ${colors.red}❌ FAILED: ${error.message}${colors.reset}`);
      failed++;
    }
    
    console.log('');
  }
  
  // Resumen
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}📊 Resultados:${colors.reset}`);
  console.log(`   ${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
  
  if (failed === 0) {
    console.log(`${colors.green}🎉 ¡Todos los tests pasaron! Tu backend está funcionando correctamente.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}⚠️  Algunos tests fallaron. Revisa los logs de Render.${colors.reset}`);
    process.exit(1);
  }
}

// Ejecutar
runTests().catch((error) => {
  console.error(`${colors.red}❌ Error fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});
