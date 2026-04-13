
-- User roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  section text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  period_months integer NOT NULL DEFAULT 3,
  has_expiry boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Equipments table
CREATE TABLE public.equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL,
  category text NOT NULL,
  lokasi text NOT NULL,
  status text NOT NULL DEFAULT 'Aktif',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jenis_apar text,
  berat_netto numeric,
  tanggal_kedaluwarsa date,
  last_check_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

-- Checklist items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Checklist results table
CREATE TABLE public.checklist_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES public.equipments(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id uuid REFERENCES public.checklist_items(id) ON DELETE CASCADE NOT NULL,
  answer text NOT NULL DEFAULT '',
  notes text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  officer_name text,
  signature text
);
ALTER TABLE public.checklist_results ENABLE ROW LEVEL SECURITY;

-- Schedules table
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  start_date date NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (category, user_id)
);
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========

-- user_roles: users can read own roles, admins can read all
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles: users can read/update own, admins can read all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- categories: all authenticated can read, admins can manage
CREATE POLICY "Authenticated can read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- equipments: users see own, admins see all
CREATE POLICY "Users can read own equipments" ON public.equipments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own equipments" ON public.equipments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own equipments" ON public.equipments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own equipments" ON public.equipments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all equipments" ON public.equipments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all equipments" ON public.equipments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- checklist_items: all authenticated can read, admins manage
CREATE POLICY "Authenticated can read checklist items" ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage checklist items" ON public.checklist_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- checklist_results: users see results for own equipments, admins see all
CREATE POLICY "Users can read own results" ON public.checklist_results FOR SELECT USING (auth.uid() = checked_by);
CREATE POLICY "Users can insert results" ON public.checklist_results FOR INSERT WITH CHECK (auth.uid() = checked_by);
CREATE POLICY "Admins can read all results" ON public.checklist_results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- schedules: users manage own, admins see all
CREATE POLICY "Users can manage own schedules" ON public.schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all schedules" ON public.schedules FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, section)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.raw_user_meta_data->>'section');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
