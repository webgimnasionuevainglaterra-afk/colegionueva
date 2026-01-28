CREATE TABLE IF NOT EXISTS administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  foto_url TEXT,
  role VARCHAR(50) DEFAULT 'administrator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email);

CREATE INDEX IF NOT EXISTS idx_administrators_role ON administrators(role);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_administrators_updated_at
  BEFORE UPDATE ON administrators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE administrators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all administrators"
  ON administrators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.id = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    )
  );

CREATE POLICY "Super admins can insert administrators"
  ON administrators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.id = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    )
  );

CREATE POLICY "Super admins can update administrators"
  ON administrators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.id = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    )
  );

CREATE POLICY "Super admins can delete administrators"
  ON administrators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.id = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    )
  );









