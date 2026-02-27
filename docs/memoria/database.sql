-- TABELA DE PERFIS (Extensão do Auth.Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE MEDICAMENTOS
CREATE TABLE medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT, -- Fabricante/Marca
  dosage_quantity TEXT,
  dosage_unit TEXT,
  instructions TEXT,
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE REMINDERS (Alarmes)
CREATE TABLE medication_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL, -- Hora inicial (ex: '08:00')
  frequency_hours INTEGER DEFAULT 24, -- De quanto em quanto tempo (ex: 8)
  duration_days INTEGER, -- Duração do tratamento (nulo = contínuo)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE LOGS (Registro de doses tomadas)
CREATE TABLE medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID REFERENCES medication_reminders(id) ON DELETE SET NULL,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'taken', -- taken, skipped
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage own medications" ON medications FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own reminders" ON medication_reminders FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM medications WHERE medications.id = medication_reminders.medication_id)
);
CREATE POLICY "Users can manage own logs" ON medication_logs FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM medications WHERE medications.id = medication_logs.medication_id)
);
CREATE POLICY "Users can manage own health data" ON health_measurements FOR ALL USING (auth.uid() = profile_id);