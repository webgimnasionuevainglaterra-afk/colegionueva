// VERSIÓN SIMPLE DE LA PÁGINA PRINCIPAL
export default function Home() {
  return (
    <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Colegio Nueva - Plataforma Educativa</h1>
      <p>Si ves esta página, Next.js está funcionando correctamente.</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/test" style={{ color: 'blue', textDecoration: 'underline' }}>
          Ir a página de prueba
        </a>
      </div>
      <div style={{ marginTop: '20px' }}>
        <a href="/aula-virtual" style={{ color: 'blue', textDecoration: 'underline' }}>
          Ir a Aula Virtual
        </a>
      </div>
    </main>
  );
}









