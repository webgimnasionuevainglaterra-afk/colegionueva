import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quiz_id = searchParams.get('quiz_id');

    if (!quiz_id) {
      return NextResponse.json(
        { error: 'quiz_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el quiz con información del subtema, tema, periodo, materia y curso
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select(`
        *,
        subtemas (
          id,
          nombre,
          tema_id,
          temas (
            id,
            nombre,
            periodo_id,
            periodos (
              id,
              nombre,
              materia_id,
              materias (
                id,
                nombre,
                curso_id,
                cursos (
                  id,
                  nombre,
                  nivel
                )
              )
            )
          )
        )
      `)
      .eq('id', quiz_id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'Quiz no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el profesor asignado al curso
    const cursoId = quiz.subtemas?.temas?.periodos?.materias?.cursos?.id;
    let profesorInfo = null;
    
    if (cursoId) {
      const { data: profesoresCursos, error: pcError } = await supabaseAdmin
        .from('profesores_cursos')
        .select(`
          profesor_id,
          profesores (
            id,
            nombre,
            apellido,
            email,
            foto_url
          )
        `)
        .eq('curso_id', cursoId)
        .limit(1);

      if (!pcError && profesoresCursos && profesoresCursos.length > 0) {
        profesorInfo = profesoresCursos[0].profesores;
      }
    }

    // Obtener preguntas
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from('preguntas')
      .select('*')
      .eq('quiz_id', quiz_id)
      .order('orden', { ascending: true });

    if (preguntasError) {
      return NextResponse.json(
        { error: 'Error al obtener preguntas' },
        { status: 500 }
      );
    }

    // Obtener opciones para cada pregunta
    const preguntasConOpciones = await Promise.all(
      (preguntas || []).map(async (pregunta) => {
        const { data: opciones, error: opcionesError } = await supabaseAdmin
          .from('opciones_respuesta')
          .select('*')
          .eq('pregunta_id', pregunta.id)
          .order('orden', { ascending: true });

        return {
          ...pregunta,
          opciones: opciones || [],
        };
      })
    );

    // Generar HTML para el PDF
    const materiaNombre = quiz.subtemas?.temas?.periodos?.materias?.nombre || 'N/A';
    const periodoNombre = quiz.subtemas?.temas?.periodos?.nombre || 'N/A';
    const cursoNombre = quiz.subtemas?.temas?.periodos?.materias?.cursos?.nombre || 'N/A';
    const profesorNombre = profesorInfo ? `${profesorInfo.nombre} ${profesorInfo.apellido}` : 'N/A';
    const profesorFoto = profesorInfo?.foto_url || null;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${quiz.nombre} - Quiz</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              padding: 60px 50px;
              line-height: 1.7;
              color: #2c3e50;
              background: #ffffff;
              font-size: 14px;
            }
            .header {
              margin-bottom: 50px;
              padding-bottom: 30px;
              position: relative;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(to right, #2563eb 50%, #ef4444 50%);
            }
            h1 {
              font-size: 28px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 13px;
              color: #6c757d;
              font-weight: 400;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .descripcion {
              font-size: 14px;
              color: #495057;
              line-height: 1.6;
              margin-top: 20px;
              padding: 15px 0;
              font-style: italic;
            }
            .info-grid {
              display: table;
              width: 100%;
              margin-bottom: 50px;
              border-collapse: collapse;
              position: relative;
            }
            .info-grid::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(to right, #2563eb 50%, #ef4444 50%);
            }
            .info-grid::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(to right, #2563eb 50%, #ef4444 50%);
            }
            .info-row {
              display: table-row;
              border-bottom: 1px solid #e8ecef;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-item {
              display: table-cell;
              padding: 12px 20px;
              vertical-align: middle;
            }
            .info-item.label {
              width: 180px;
              font-size: 11px;
              color: #868e96;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              background: #f8f9fa;
              border-right: 1px solid #e8ecef;
            }
            .info-item.value {
              font-size: 14px;
              color: #212529;
              font-weight: 400;
            }
            .info-item.profesor-item {
              display: flex;
              align-items: center;
              gap: 15px;
              padding: 12px 20px;
            }
            .profesor-foto {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #e8ecef;
              flex-shrink: 0;
            }
            .profesor-nombre {
              font-size: 14px;
              font-weight: 600;
              color: #212529;
            }
            .pregunta {
              margin-bottom: 35px;
              padding: 0 0 0 25px;
              page-break-inside: avoid;
              position: relative;
            }
            .pregunta::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 4px;
              height: 100%;
              background: linear-gradient(to bottom, #2563eb 50%, #ef4444 50%);
            }
            .pregunta-header {
              display: flex;
              align-items: baseline;
              margin-bottom: 18px;
              padding-bottom: 12px;
              position: relative;
            }
            .pregunta-header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 2px;
              background: linear-gradient(to right, #2563eb 50%, #ef4444 50%);
            }
            .pregunta-numero {
              font-size: 13px;
              font-weight: 600;
              color: #495057;
              margin-right: 12px;
              min-width: 60px;
            }
            .pregunta-texto {
              font-size: 15px;
              font-weight: 500;
              color: #212529;
              line-height: 1.6;
              flex: 1;
            }
            .tiempo-pregunta {
              font-size: 11px;
              color: #868e96;
              margin-top: 8px;
              font-style: italic;
            }
            .opciones-container {
              margin-top: 15px;
              padding-left: 47px;
            }
            .opcion {
              margin: 8px 0;
              padding: 12px 16px;
              border-radius: 6px;
              font-size: 14px;
              line-height: 1.5;
              display: flex;
              align-items: flex-start;
            }
            .opcion-correcta {
              background: #f0f9f4;
              border: 1px solid #c6f6d5;
              color: #166534;
            }
            .opcion-incorrecta {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              color: #495057;
            }
            .opcion-marker {
              margin-right: 10px;
              font-weight: 600;
              min-width: 20px;
            }
            .opcion-texto {
              flex: 1;
            }
            .explicacion {
              margin-top: 16px;
              padding: 14px 16px;
              background: #f8f9fa;
              border-left: 3px solid #495057;
              border-radius: 4px;
              font-size: 13px;
              color: #495057;
              line-height: 1.6;
              margin-left: 47px;
            }
            .explicacion-label {
              font-weight: 600;
              margin-bottom: 4px;
              color: #212529;
            }
            @media print {
              body {
                padding: 40px 30px;
              }
              .pregunta {
                page-break-inside: avoid;
              }
              .info-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${quiz.nombre}</h1>
            <div class="subtitle">Quiz de Evaluación</div>
            ${quiz.descripcion ? `
              <div class="descripcion">${quiz.descripcion}</div>
            ` : ''}
          </div>
          
          <div class="info-grid" style="padding: 20px 0;">
            <div class="info-row">
              <div class="info-item label">Profesor</div>
              <div class="info-item value profesor-item">
                ${profesorFoto ? `
                  <img src="${profesorFoto}" alt="${profesorNombre}" class="profesor-foto" />
                ` : `
                  <div class="profesor-foto" style="background: #e8ecef; display: flex; align-items: center; justify-content: center; color: #868e96; font-weight: 600; font-size: 18px;">
                    ${profesorInfo ? `${profesorInfo.nombre.charAt(0)}${profesorInfo.apellido.charAt(0)}` : 'P'}
                  </div>
                `}
                <span class="profesor-nombre">${profesorNombre}</span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item label">Materia</div>
              <div class="info-item value">${materiaNombre}</div>
            </div>
            <div class="info-row">
              <div class="info-item label">Periodo</div>
              <div class="info-item value">${periodoNombre}</div>
            </div>
            <div class="info-row">
              <div class="info-item label">Curso</div>
              <div class="info-item value">${cursoNombre}</div>
            </div>
            <div class="info-row">
              <div class="info-item label">Fecha de Inicio</div>
              <div class="info-item value">${new Date(quiz.fecha_inicio).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>
            <div class="info-row">
              <div class="info-item label">Fecha de Fin</div>
              <div class="info-item value">${new Date(quiz.fecha_fin).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>
          </div>
          
          ${preguntasConOpciones.map((pregunta, index) => `
            <div class="pregunta">
              <div class="pregunta-header">
                <div class="pregunta-numero">${index + 1}.</div>
                <div class="pregunta-texto">${pregunta.pregunta_texto}</div>
              </div>
              ${pregunta.tiempo_segundos ? `
                <div class="tiempo-pregunta" style="padding-left: 47px;">
                  Tiempo disponible: ${pregunta.tiempo_segundos} segundos
                </div>
              ` : ''}
              <div class="opciones-container">
                ${pregunta.opciones.map((opcion: any, opIndex: number) => `
                  <div class="opcion ${opcion.es_correcta ? 'opcion-correcta' : 'opcion-incorrecta'}">
                    <span class="opcion-marker">${String.fromCharCode(65 + opIndex)}.</span>
                    <span class="opcion-texto">${opcion.texto}</span>
                    ${opcion.es_correcta ? '<span style="margin-left: 8px; color: #10b981;">✓</span>' : ''}
                  </div>
                `).join('')}
              </div>
              ${pregunta.opciones.find((op: any) => op.es_correcta && op.explicacion) ? `
                <div class="explicacion">
                  <div class="explicacion-label">Explicación:</div>
                  <div>${pregunta.opciones.find((op: any) => op.es_correcta)?.explicacion || ''}</div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `;

    // Retornar HTML que se puede convertir a PDF en el cliente
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error en download-pdf (quiz):', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al generar PDF' },
      { status: 500 }
    );
  }
}

