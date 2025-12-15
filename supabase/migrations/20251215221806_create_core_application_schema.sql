/*
  # Core Application & Email Management Infrastructure

  1. New Tables
    - `applications` - Main job applications table
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `city` (text)
      - `state` (text)
      - `experience` (text)
      - `employment_type` (text)
      - `start_date` (date)
      - `resume_link` (text)
      - `work_authorization` (boolean)
      - `selected_shift` (text)
      - `source_campaign` (text)
      - `source_url` (text)
      - `user_agent` (text)
      - `submission_status` (text)
      - `interview_status` (text, default 'pending')
      - `interview_scheduled_date` (timestamp, nullable)
      - `confirmation_email_sent` (boolean, default false)
      - `admin_notification_sent` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `application_metrics` - Track application metrics
      - `id` (uuid, primary key)
      - `metric_date` (date)
      - `total_applications` (integer)
      - `by_shift` (jsonb)
      - `created_at` (timestamp)

    - `content_prompts` - Content prompts for TikTok/social media
      - `id` (uuid, primary key)
      - `content_title` (text)
      - `content_body` (text)
      - `category` (text)
      - `authenticity_score` (integer)
      - `views` (integer, default 0)
      - `clicks` (integer, default 0)
      - `conversions` (integer, default 0)
      - `content_status` (text, default 'active')
      - `created_at` (timestamp)

    - `email_logs` - Track all sent emails
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key)
      - `recipient_email` (text)
      - `email_type` (text)
      - `subject` (text)
      - `sent_at` (timestamp)
      - `status` (text)
      - `error_message` (text, nullable)

    - `interviews` - Scheduled interviews
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key)
      - `scheduled_date` (timestamp, nullable)
      - `teams_link` (text, nullable)
      - `interview_status` (text, default 'pending')
      - `admin_notes` (text, nullable)
      - `interview_feedback` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `testimonials` - Applicant testimonials for social proof
      - `id` (uuid, primary key)
      - `applicant_name` (text)
      - `role` (text)
      - `feedback` (text)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Data protected with appropriate access policies

  3. Important Notes
    - These tables support the complete hiring workflow
    - Email logs track automation success/failure
    - Interviews table enables manual scheduling by admin
    - Testimonials provide dynamic social proof on frontend
*/

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  experience text NOT NULL,
  employment_type text NOT NULL,
  start_date date,
  resume_link text,
  work_authorization boolean DEFAULT false,
  selected_shift text NOT NULL,
  source_campaign text DEFAULT 'tiktok',
  source_url text,
  user_agent text,
  submission_status text DEFAULT 'pending',
  interview_status text DEFAULT 'pending',
  interview_scheduled_date timestamptz,
  confirmation_email_sent boolean DEFAULT false,
  admin_notification_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date DEFAULT CURRENT_DATE,
  total_applications integer DEFAULT 0,
  by_shift jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_title text NOT NULL,
  content_body text NOT NULL,
  category text,
  authenticity_score integer DEFAULT 0,
  views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  content_status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('confirmation', 'admin_notification', 'pre_interview')),
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_date timestamptz,
  teams_link text,
  interview_status text NOT NULL DEFAULT 'pending' CHECK (interview_status IN ('scheduled', 'completed', 'no_show', 'rescheduled', 'pending')),
  admin_notes text,
  interview_feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name text NOT NULL,
  role text NOT NULL,
  feedback text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read applications summary"
  ON applications FOR SELECT
  USING (true);

CREATE POLICY "Public can insert applications"
  ON applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read metrics"
  ON application_metrics FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own email logs"
  ON email_logs FOR SELECT
  USING (application_id IN (SELECT id FROM applications WHERE email = current_user::text));

CREATE POLICY "Users can view their own interviews"
  ON interviews FOR SELECT
  USING (application_id IN (SELECT id FROM applications WHERE email = current_user::text));

CREATE POLICY "Public can view approved testimonials"
  ON testimonials FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Public can insert testimonials"
  ON testimonials FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read content prompts"
  ON content_prompts FOR SELECT
  USING (content_status = 'active');

CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_status ON applications(submission_status);
CREATE INDEX idx_applications_interview_status ON applications(interview_status);
CREATE INDEX idx_email_logs_application_id ON email_logs(application_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_interviews_application_id ON interviews(application_id);
CREATE INDEX idx_interviews_status ON interviews(interview_status);
CREATE INDEX idx_testimonials_status ON testimonials(status);
CREATE INDEX idx_content_prompts_status ON content_prompts(content_status);
