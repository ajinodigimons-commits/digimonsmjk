export type EquipmentCategory = string;

export type EquipmentStatus = 'Aktif' | 'Non Aktif';

export type QuestionType = 'multiple_choice' | 'text' | 'date' | 'number';

export interface User {
  id: string;
  name: string;
  role: 'user' | 'admin';
  section?: string;
}
