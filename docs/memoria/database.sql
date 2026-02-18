-- TABELA DE PERFIS (Extensão do Auth.Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE MEDICAMENTOS
CREATE TABLE medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  instructions TEXT,
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE LOGS (Registro de doses tomadas)
CREATE TABLE medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'taken', -- taken, skipped
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE MEDIÇÕES DE SAÚDE (Sinais Vitais)
CREATE TABLE health_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  systolic INTEGER, -- Pressão Sistólica
  diastolic INTEGER, -- Pressão Diastólica
  heart_rate INTEGER, -- Batimentos
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (SEGURANÇA: Cada um vê só o seu)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage own medications" ON medications FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own logs" ON medication_logs FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own health data" ON health_measurements FOR ALL USING (auth.uid() = profile_id);