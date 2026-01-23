-- ============================================
-- Script para agregar columna archivo_url a preguntas
-- Permite adjuntar imágenes/documentos a cada pregunta
-- ============================================

-- Agregar columna archivo_url a preguntas de quiz
ALTER TABLE preguntas 
ADD COLUMN IF NOT EXISTS archivo_url TEXT;

-- Agregar columna archivo_url a preguntas de evaluación
ALTER TABLE preguntas_evaluacion 
ADD COLUMN IF NOT EXISTS archivo_url TEXT;


