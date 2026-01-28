// Script de prueba para verificar que Node.js puede iniciar un servidor básico
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Server</title>
      <style>
        body { font-family: Arial; padding: 40px; background: #f5f5f5; }
        h1 { color: #333; }
        .success { color: green; font-size: 1.2em; }
      </style>
    </head>
    <body>
      <h1>✅ Servidor Node.js funcionando</h1>
      <p class="success">Si ves esto, Node.js puede crear servidores HTTP.</p>
      <p>Puerto: 3001</p>
    </body>
    </html>
  `);
});

server.listen(3001, 'localhost', () => {
  console.log('✅ Servidor de prueba corriendo en http://localhost:3001');
  console.log('Abre tu navegador en: http://localhost:3001');
});

server.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});










