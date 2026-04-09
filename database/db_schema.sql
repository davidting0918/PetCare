-- create updater function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


create type food_type_enum as enum ('wet_food', 'dry_food', 'other');
create type pet_type_enum as enum ('dog', 'cat', 'bird', 'fish', 'rabbit', 'other');
create type pet_gender_enum as enum ('male', 'female', 'unknown');
create type meal_type_enum as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type serving_type_enum as enum ('units', 'grams');


-- users table
CREATE TABLE users (
	id varchar(8) NOT NULL,
	google_id varchar(255) NULL,
	email varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	picture text NULL,
	hashed_pwd varchar(255) NOT NULL,
	personal_group_id varchar(8) NULL,
	"source" varchar(50) DEFAULT 'unknow'::character varying NOT NULL,
	is_active bool DEFAULT true NULL,
	is_verified bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);

create trigger update_users_updated_at before
update
    on
    public.users for each row execute function update_updated_at_column();


-- groups table
CREATE TABLE "groups" (
	id varchar(8) NOT NULL,
	"name" varchar(50) NOT NULL,
	creator_id varchar(8) NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT groups_pkey PRIMARY KEY (id),
	CONSTRAINT groups_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_groups_created_at ON public.groups USING btree (created_at);
CREATE INDEX idx_groups_creator_id ON public.groups USING btree (creator_id);

create trigger update_groups_updated_at before
update
    on
    public.groups for each row execute function update_updated_at_column();

-- group members table
CREATE TABLE group_members (
	id serial4 NOT NULL,
	group_id varchar(8) NOT NULL,
	user_id varchar(8) NOT NULL,
	"role" varchar(20) DEFAULT 'member'::character varying NOT NULL,
	invited_by varchar(8) NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id),
	CONSTRAINT group_members_pkey PRIMARY KEY (id),
	CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE CASCADE,
	CONSTRAINT group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL,
	CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_group_members_active ON public.group_members USING btree (group_id, user_id, is_active);
CREATE INDEX idx_group_members_group_id ON public.group_members USING btree (group_id);
CREATE INDEX idx_group_members_role ON public.group_members USING btree (group_id, role);
CREATE INDEX idx_group_members_user_id ON public.group_members USING btree (user_id);

create trigger update_group_members_updated_at before
update
    on
    public.group_members for each row execute function update_updated_at_column();


-- group invitations table
CREATE TABLE group_invitations (
	id varchar(13) NOT NULL,
	group_id varchar(8) NOT NULL,
	invited_by varchar(8) NOT NULL,
	invite_code varchar(255) NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying NULL,
	accepted_by varchar(8) NULL,
	role varchar(20) DEFAULT 'viewer'::character varying NOT NULL,
	expires_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT group_invitations_invite_code_key UNIQUE (invite_code),
	CONSTRAINT group_invitations_pkey PRIMARY KEY (id),
	CONSTRAINT group_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id) ON DELETE SET NULL,
	CONSTRAINT group_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE CASCADE,
	CONSTRAINT group_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_group_invitations_code ON public.group_invitations USING btree (invite_code);
CREATE INDEX idx_group_invitations_expires ON public.group_invitations USING btree (expires_at, status);
CREATE INDEX idx_group_invitations_group_id ON public.group_invitations USING btree (group_id);

create trigger update_group_invitations_updated_at before
update
    on
    public.group_invitations for each row execute function update_updated_at_column();

-- foods table
CREATE TABLE foods (
	id varchar(30) NOT NULL,
	group_id varchar(8) NOT NULL,
	brand varchar(100) NOT NULL,
	product_name varchar(100) NOT NULL,
	food_type public."food_type_enum" NOT NULL,
	target_pet public."pet_type_enum" NOT NULL,
	unit_weight numeric(7, 2) NOT NULL,
	calories numeric(6, 2) NOT NULL,
	protein numeric(5, 2) NOT NULL,
	fat numeric(5, 2) NOT NULL,
	moisture numeric(5, 2) NOT NULL,
	carbohydrate numeric(5, 2) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	photo_url text NULL,
	creator_id varchar(8) NULL,
	CONSTRAINT foods_calories_valid CHECK (((calories >= (0)::numeric) AND (calories <= (1000)::numeric))),
	CONSTRAINT foods_carbohydrate_valid CHECK (((carbohydrate >= (0)::numeric) AND (carbohydrate <= (100)::numeric))),
	CONSTRAINT foods_fat_valid CHECK (((fat >= (0)::numeric) AND (fat <= (100)::numeric))),
	CONSTRAINT foods_moisture_valid CHECK (((moisture >= (0)::numeric) AND (moisture <= (100)::numeric))),
	CONSTRAINT foods_nutritional_total_valid CHECK (((((protein + fat) + moisture) + carbohydrate) <= (105)::numeric)),
	CONSTRAINT foods_pkey PRIMARY KEY (id),
	CONSTRAINT foods_protein_valid CHECK (((protein >= (0)::numeric) AND (protein <= (100)::numeric))),
	CONSTRAINT foods_unit_weight_positive CHECK (((unit_weight > (0)::numeric) AND (unit_weight <= (5000)::numeric))),
	CONSTRAINT fk_foods_creator FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT fk_foods_groups FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_foods_group_combined_filters ON public.foods USING btree (group_id, food_type, target_pet) WHERE (is_active = true);
CREATE INDEX idx_foods_group_food_type ON public.foods USING btree (group_id, food_type) WHERE (is_active = true);
CREATE INDEX idx_foods_group_id ON public.foods USING btree (group_id) WHERE (is_active = true);
CREATE INDEX idx_foods_group_target_pet ON public.foods USING btree (group_id, target_pet) WHERE (is_active = true);

create trigger update_foods_updated_at before
update
    on
    public.foods for each row execute function update_updated_at_column();

-- pets table
CREATE TABLE pets (
	id varchar(8) NOT NULL,
	"name" varchar(50) NOT NULL,
	pet_type "pet_type_enum" NOT NULL,
	breed varchar(100) NULL,
	gender "pet_gender_enum" NOT NULL,
	birth_date timestamptz NULL,
	current_weight_kg numeric(5, 2) NULL,
	target_weight_kg numeric(5, 2) NULL,
	height_cm numeric(5, 2) NULL,
	is_spayed bool DEFAULT false NOT NULL,
	microchip_id varchar(50) NULL,
	daily_calorie_target int4 NULL,
	owner_id varchar(8) NOT NULL,
	group_id varchar(8) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_active bool DEFAULT true NULL,
	notes text NULL,
	photo_url text NULL,
	CONSTRAINT pets_current_weight_kg_check CHECK (((current_weight_kg >= 0.1) AND (current_weight_kg <= (200)::numeric))),
	CONSTRAINT pets_daily_calorie_target_check CHECK (((daily_calorie_target >= 10) AND (daily_calorie_target <= 5000))),
	CONSTRAINT pets_gender_check CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('unknown'::character varying)::text]))),
	CONSTRAINT pets_height_cm_check CHECK (((height_cm >= (1)::numeric) AND (height_cm <= (200)::numeric))),
	CONSTRAINT pets_name_check CHECK ((length((name)::text) >= 1)),
	CONSTRAINT pets_notes_check CHECK ((length(notes) <= 1000)),
	CONSTRAINT pets_pet_type_check CHECK (((pet_type)::text = ANY (ARRAY[('dog'::character varying)::text, ('cat'::character varying)::text, ('bird'::character varying)::text, ('fish'::character varying)::text, ('rabbit'::character varying)::text, ('other'::character varying)::text]))),
	CONSTRAINT pets_pkey PRIMARY KEY (id),
	CONSTRAINT pets_target_weight_kg_check CHECK (((target_weight_kg >= 0.1) AND (target_weight_kg <= (200)::numeric)))
);
CREATE INDEX idx_pets_created_at ON public.pets USING btree (created_at);
CREATE INDEX idx_pets_group_id ON public.pets USING btree (group_id);
CREATE INDEX idx_pets_is_active ON public.pets USING btree (is_active);
CREATE INDEX idx_pets_owner_id ON public.pets USING btree (owner_id);
CREATE INDEX idx_pets_pet_type ON public.pets USING btree (pet_type);

create trigger update_pets_updated_at before
update
    on
    public.pets for each row execute function update_updated_at_column();


-- access tokens table
CREATE TABLE access_tokens (
	id serial4 NOT NULL,
	"token" text NOT NULL,
	user_id varchar(8) NOT NULL,
	expires_at timestamptz NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT access_tokens_pkey PRIMARY KEY (id),
	CONSTRAINT access_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_access_tokens_active_tokens ON public.access_tokens USING btree (user_id, expires_at, is_active);
CREATE INDEX idx_access_tokens_expires_at ON public.access_tokens USING btree (expires_at);
CREATE INDEX idx_access_tokens_user_id ON public.access_tokens USING btree (user_id);

create trigger update_access_tokens_updated_at before
update
    on
    public.access_tokens for each row execute function update_updated_at_column();


-- api keys table
CREATE TABLE api_keys (
	id serial4 NOT NULL,
	api_key varchar(255) NOT NULL,
	api_secret varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT api_keys_api_key_key UNIQUE (api_key),
	CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);

create trigger update_api_keys_updated_at before
update
    on
    public.api_keys for each row execute function update_updated_at_column();


-- weight records table
CREATE TABLE weight_records (
	id varchar(11) NOT NULL,
	pet_id varchar(8) NOT NULL,
	weight numeric(5, 2) NOT NULL,
	user_id varchar(8) NOT NULL,
	"timestamp" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT weight_records_pkey PRIMARY KEY (id),
	CONSTRAINT weight_records_weight_valid CHECK (((weight >= 0.1) AND (weight <= (200)::numeric))),
	CONSTRAINT weight_records_notes_check CHECK ((length(notes) <= 500)),
	CONSTRAINT fk_weight_records_pet FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_weight_records_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_weight_records_pet_id ON public.weight_records USING btree (pet_id) WHERE (is_active = true);
CREATE INDEX idx_weight_records_timestamp ON public.weight_records USING btree (timestamp) WHERE (is_active = true);
CREATE INDEX idx_weight_records_created_at ON public.weight_records USING btree (created_at);
CREATE INDEX idx_weight_records_user_id ON public.weight_records USING btree (user_id);
CREATE INDEX idx_weight_records_pet_timestamp ON public.weight_records USING btree (pet_id, timestamp) WHERE (is_active = true);

create trigger update_weight_records_updated_at before
update
    on
    public.weight_records for each row execute function update_updated_at_column();


-- meals table

CREATE TABLE public.meals (
	id varchar(11) NOT NULL,
	pet_id varchar(8) NOT NULL,
	food_id varchar(30) NOT NULL,
	user_id varchar(8) NOT NULL,
	group_id varchar(8) NOT NULL,
	"timestamp" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	meal_type public."meal_type_enum" NULL,
	serving_type public."serving_type_enum" NOT NULL,
	serving_amount numeric(7, 2) NOT NULL,
	actual_weight_g numeric(7, 2) NOT NULL,
	calories numeric(8, 2) NOT NULL,
	protein_g numeric(7, 2) NOT NULL,
	fat_g numeric(7, 2) NOT NULL,
	moisture_g numeric(7, 2) NOT NULL,
	carbohydrate_g numeric(7, 2) NOT NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT meals_actual_weight_g_valid CHECK (((actual_weight_g > (0)::numeric) AND (actual_weight_g <= (10000)::numeric))),
	CONSTRAINT meals_notes_check CHECK ((length(notes) <= 500)),
	CONSTRAINT meals_pkey PRIMARY KEY (id),
	CONSTRAINT meals_serving_amount_valid CHECK (((serving_amount > (0)::numeric) AND (serving_amount <= (10000)::numeric))),
	CONSTRAINT fk_meals_food FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_meals_group FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_meals_pet FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_meals_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_meals_created_at ON public.meals USING btree (created_at);
CREATE INDEX idx_meals_group_id ON public.meals USING btree (group_id) WHERE (is_active = true);
CREATE INDEX idx_meals_group_timestamp ON public.meals USING btree (group_id, "timestamp") WHERE (is_active = true);
CREATE INDEX idx_meals_pet_id ON public.meals USING btree (pet_id) WHERE (is_active = true);
CREATE INDEX idx_meals_pet_timestamp ON public.meals USING btree (pet_id, "timestamp") WHERE (is_active = true);
CREATE INDEX idx_meals_timestamp ON public.meals USING btree ("timestamp") WHERE (is_active = true);
CREATE INDEX idx_meals_user_id ON public.meals USING btree (user_id);

-- Table Triggers

create trigger update_meals_updated_at before
update
    on
    public.meals for each row execute function update_updated_at_column();


-- ================== Medicine Domain ==================

create type medication_type_enum as enum ('oral', 'topical', 'injection', 'eye_drops', 'ear_drops', 'other');
create type dosage_unit_enum as enum ('tablet', 'ml', 'mg', 'drops', 'puff', 'unit', 'application');
create type time_of_day_enum as enum ('all_day', 'morning', 'afternoon', 'evening');


-- medications table (group-scoped medication catalog)
CREATE TABLE medications (
	id varchar(11) NOT NULL,
	group_id varchar(8) NOT NULL,
	"name" varchar(100) NOT NULL,
	medication_type medication_type_enum NOT NULL,
	default_dosage numeric(7, 2) NULL,
	dosage_unit dosage_unit_enum NOT NULL,
	notes text NULL,
	creator_id varchar(8) NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT medications_pkey PRIMARY KEY (id),
	CONSTRAINT medications_notes_check CHECK (length(notes) <= 500),
	CONSTRAINT fk_medications_group FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE CASCADE,
	CONSTRAINT fk_medications_creator FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_medications_group_id ON public.medications USING btree (group_id) WHERE (is_active = true);

create trigger update_medications_updated_at before
update
    on
    public.medications for each row execute function update_updated_at_column();


-- treatment_courses table (open-ended recurring schedules)
CREATE TABLE treatment_courses (
	id varchar(11) NOT NULL,
	pet_id varchar(8) NOT NULL,
	medication_id varchar(11) NOT NULL,
	group_id varchar(8) NOT NULL,
	dosage numeric(7, 2) NOT NULL,
	dosage_unit dosage_unit_enum NOT NULL,
	frequency_days int NOT NULL DEFAULT 1,
	times_per_day time_of_day_enum[] NOT NULL DEFAULT '{morning}',
	start_date date NOT NULL,
	end_date date NULL,
	notes text NULL,
	created_by varchar(8) NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT treatment_courses_pkey PRIMARY KEY (id),
	CONSTRAINT treatment_courses_frequency_valid CHECK (frequency_days >= 1 AND frequency_days <= 365),
	CONSTRAINT treatment_courses_dosage_valid CHECK (dosage > 0),
	CONSTRAINT treatment_courses_notes_check CHECK (length(notes) <= 500),
	CONSTRAINT fk_tc_pet FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
	CONSTRAINT fk_tc_medication FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE,
	CONSTRAINT fk_tc_group FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE CASCADE,
	CONSTRAINT fk_tc_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_tc_pet_id ON public.treatment_courses USING btree (pet_id) WHERE (is_active = true);
CREATE INDEX idx_tc_group_id ON public.treatment_courses USING btree (group_id) WHERE (is_active = true);
CREATE INDEX idx_tc_medication_id ON public.treatment_courses USING btree (medication_id) WHERE (is_active = true);

create trigger update_treatment_courses_updated_at before
update
    on
    public.treatment_courses for each row execute function update_updated_at_column();


-- medication_logs table (actual administration records)
CREATE TABLE medication_logs (
	id varchar(11) NOT NULL,
	pet_id varchar(8) NOT NULL,
	medication_id varchar(11) NOT NULL,
	group_id varchar(8) NOT NULL,
	course_id varchar(11) NULL,
	dosage numeric(7, 2) NOT NULL,
	dosage_unit dosage_unit_enum NOT NULL,
	time_of_day time_of_day_enum NULL,
	administered_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	administered_by varchar(8) NULL,
	notes text NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT medication_logs_pkey PRIMARY KEY (id),
	CONSTRAINT medication_logs_dosage_valid CHECK (dosage > 0),
	CONSTRAINT medication_logs_notes_check CHECK (length(notes) <= 500),
	CONSTRAINT fk_ml_pet FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
	CONSTRAINT fk_ml_medication FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE,
	CONSTRAINT fk_ml_group FOREIGN KEY (group_id) REFERENCES public."groups"(id) ON DELETE CASCADE,
	CONSTRAINT fk_ml_course FOREIGN KEY (course_id) REFERENCES public.treatment_courses(id) ON DELETE SET NULL,
	CONSTRAINT fk_ml_user FOREIGN KEY (administered_by) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_ml_pet_id ON public.medication_logs USING btree (pet_id) WHERE (is_active = true);
CREATE INDEX idx_ml_group_id ON public.medication_logs USING btree (group_id) WHERE (is_active = true);
CREATE INDEX idx_ml_course_id ON public.medication_logs USING btree (course_id) WHERE (is_active = true);
CREATE INDEX idx_ml_administered_at ON public.medication_logs USING btree (administered_at) WHERE (is_active = true);
CREATE INDEX idx_ml_pet_administered ON public.medication_logs USING btree (pet_id, administered_at) WHERE (is_active = true);

create trigger update_medication_logs_updated_at before
update
    on
    public.medication_logs for each row execute function update_updated_at_column();
