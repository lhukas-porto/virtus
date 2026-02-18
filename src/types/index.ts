export type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
};

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  dosage?: string;
  barcode?: string;
  image_url?: string;
  time?: string;
  frequency?: 'daily' | '6h' | '8h' | '12h';
  created_at: string;
};

export type MedicationReminder = {
  id: string;
  medication_id: string;
  time: string; // HH:mm (horário inicial)
  frequency: 'daily' | '6h' | '8h' | '12h';
  created_at: string;
};

export type HealthLog = {
  id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  heart_rate?: number;
  time?: string;
  created_at: string;
};
