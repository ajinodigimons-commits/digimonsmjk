import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ========== CATEGORIES ==========
export interface CategoryRow {
  id: string;
  name: string;
  period_months: number;
  has_expiry: boolean;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data || []) as CategoryRow[];
    },
  });
};

export const useCategoryMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const add = useMutation({
    mutationFn: async (cat: Omit<CategoryRow, 'id'>) => {
      const { error } = await supabase.from('categories').insert(cat);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: CategoryRow) => {
      const { error } = await supabase.from('categories').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
};

// ========== PROFILES (K3LM list) ==========
export interface ProfileRow {
  id: string;
  name: string;
  section: string | null;
  email: string | null;
  created_at: string;
  default_password: string | null;
}

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });
};

// ========== EQUIPMENTS ==========
export interface EquipmentRow {
  id: string;
  kode: string;
  category: string;
  lokasi: string;
  status: string;
  user_id: string;
  jenis_apar: string | null;
  berat_netto: number | null;
  tanggal_kedaluwarsa: string | null;
  last_check_date: string | null;
  created_at: string;
}

export const useEquipments = (showAllUsers = false) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['equipments', showAllUsers, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data || []) as EquipmentRow[];
    },
  });
};

export const useEquipmentMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['equipments'] });

  const add = useMutation({
    mutationFn: async (eq: Omit<EquipmentRow, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('equipments').insert(eq);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<EquipmentRow> & { id: string }) => {
      const { error } = await supabase.from('equipments').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
};

// ========== EQUIPMENT FIELD VALUES (dynamic storage) ==========
export interface EquipmentFieldValueRow {
  id: string;
  equipment_id: string;
  field_name: string;
  field_value: string | null;
}

export const useEquipmentFieldValues = (equipmentIds: string[]) => {
  return useQuery({
    queryKey: ['equipment_field_values', equipmentIds],
    queryFn: async () => {
      if (equipmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('equipment_field_values')
        .select('*')
        .in('equipment_id', equipmentIds);
      if (error) throw error;
      return (data || []) as EquipmentFieldValueRow[];
    },
    enabled: equipmentIds.length > 0,
  });
};

export const useEquipmentFieldValueMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['equipment_field_values'] });

  const upsertMany = useMutation({
    mutationFn: async (values: Omit<EquipmentFieldValueRow, 'id'>[]) => {
      if (values.length === 0) return;
      const { error } = await supabase
        .from('equipment_field_values')
        .upsert(values, { onConflict: 'equipment_id,field_name' });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsertMany };
};

// ========== EQUIPMENT FIELDS ==========
export interface EquipmentFieldRow {
  id: string;
  category: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
}

export const useEquipmentFields = () => {
  return useQuery({
    queryKey: ['equipment_fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_fields')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as EquipmentFieldRow[];
    },
  });
};

export const useEquipmentFieldMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['equipment_fields'] });

  const add = useMutation({
    mutationFn: async (field: Omit<EquipmentFieldRow, 'id'>) => {
      const { error } = await supabase.from('equipment_fields').insert(field);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<EquipmentFieldRow> & { id: string }) => {
      const { error } = await supabase.from('equipment_fields').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
};

// ========== CHECKLIST ITEMS ==========
export interface ChecklistItemRow {
  id: string;
  category: string;
  question: string;
  sort_order: number;
  question_type: string;
  options: string[] | null;
}

export const useChecklistItems = () => {
  return useQuery({
    queryKey: ['checklist_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ChecklistItemRow[];
    },
  });
};

export const useChecklistItemMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['checklist_items'] });

  const add = useMutation({
    mutationFn: async (item: Omit<ChecklistItemRow, 'id'>) => {
      const { error } = await supabase.from('checklist_items').insert(item);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<ChecklistItemRow> & { id: string }) => {
      const { error } = await supabase.from('checklist_items').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
};

// ========== INSPECTIONS (header) ==========
export interface InspectionRow {
  id: string;
  equipment_id: string;
  checked_at: string;
  checked_by: string;
  officer_name: string | null;
  signature: string | null;
  created_at: string;
}

export const useInspections = () => {
  return useQuery({
    queryKey: ['inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('checked_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InspectionRow[];
    },
  });
};

// ========== INSPECTION ANSWERS (detail) ==========
export interface InspectionAnswerRow {
  id: string;
  inspection_id: string;
  checklist_item_id: string;
  answer: string;
  notes: string | null;
}

export const useInspectionAnswers = (inspectionIds: string[]) => {
  return useQuery({
    queryKey: ['inspection_answers', inspectionIds],
    queryFn: async () => {
      if (inspectionIds.length === 0) return [];
      // Batch in chunks of 100 to avoid query limits
      const all: InspectionAnswerRow[] = [];
      for (let i = 0; i < inspectionIds.length; i += 100) {
        const chunk = inspectionIds.slice(i, i + 100);
        const { data, error } = await supabase
          .from('inspection_answers')
          .select('*')
          .in('inspection_id', chunk);
        if (error) throw error;
        all.push(...((data || []) as InspectionAnswerRow[]));
      }
      return all;
    },
    enabled: inspectionIds.length > 0,
  });
};

export const useInspectionMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inspections'] });
    qc.invalidateQueries({ queryKey: ['inspection_answers'] });
    qc.invalidateQueries({ queryKey: ['equipments'] });
  };

  const addInspection = useMutation({
    mutationFn: async (payload: {
      inspection: Omit<InspectionRow, 'id' | 'created_at'>;
      answers: Omit<InspectionAnswerRow, 'id' | 'inspection_id'>[];
    }) => {
      // Insert inspection header, get back id
      const { data: ins, error: insErr } = await supabase
        .from('inspections')
        .insert(payload.inspection)
        .select('id')
        .single();
      if (insErr) throw insErr;

      // Insert answers with inspection_id
      const answersWithId = payload.answers.map(a => ({
        ...a,
        inspection_id: ins.id,
      }));
      const { error: ansErr } = await supabase
        .from('inspection_answers')
        .insert(answersWithId);
      if (ansErr) throw ansErr;
    },
    onSuccess: invalidate,
  });

  return { addInspection };
};


// ========== SCHEDULES ==========
export interface ScheduleRow {
  id: string;
  category: string;
  start_date: string;
  user_id: string;
}

export const useSchedules = () => {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*');
      if (error) throw error;
      return (data || []) as ScheduleRow[];
    },
  });
};

export const useScheduleMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['schedules'] });

  const upsert = useMutation({
    mutationFn: async (schedule: Omit<ScheduleRow, 'id'>) => {
      const { error } = await supabase
        .from('schedules')
        .upsert(schedule, { onConflict: 'category,user_id' });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert };
};

// ========== USER ROLES ==========
export const useUserRole = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role as string | null;
    },
    enabled: !!user,
  });
};
