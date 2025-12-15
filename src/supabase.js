import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const getEdgeFunctionUrl = (functionName) => {
  return `${SUPABASE_URL}/functions/v1/${functionName}`
}

const sendEmail = async (emailType, data) => {
  try {
    const response = await fetch(getEdgeFunctionUrl('send_application_emails'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ emailType, data })
    })

    if (!response.ok) {
      console.error(`Email send failed: ${response.statusText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Email service error:', error)
    return false
  }
}

export const submitApplication = async (formData) => {
  const { data, error } = await supabase
    .from('applications')
    .insert([
      {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        experience: formData.experience,
        employment_type: formData.employmentType,
        start_date: formData.startDate,
        resume_link: formData.resumeLink,
        work_authorization: formData.workAuthorization,
        selected_shift: formData.selectedShift,
        source_campaign: 'tiktok',
        source_url: window.location.href,
        user_agent: navigator.userAgent,
        submission_status: 'pending'
      }
    ])
    .select()

  if (error) {
    console.error('Application submission error:', error)
    return { success: false, error: error.message }
  }

  const applicationId = data?.[0]?.id

  if (applicationId) {
    try {
      await sendEmail('confirmation', {
        applicationId,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        selectedShift: formData.selectedShift
      })

      await sendEmail('admin_notification', {
        applicationId,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        selectedShift: formData.selectedShift
      })

      await supabase
        .from('applications')
        .update({
          confirmation_email_sent: true,
          admin_notification_sent: true
        })
        .eq('id', applicationId)
    } catch (emailError) {
      console.error('Email sending error:', emailError)
    }
  }

  return { success: true, data }
}

export const scheduleInterview = async (applicationId, scheduledDate, teamsLink) => {
  const { data: appData, error: appError } = await supabase
    .from('applications')
    .select('full_name, email')
    .eq('id', applicationId)
    .maybeSingle()

  if (appError || !appData) {
    return { success: false, error: 'Application not found' }
  }

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .insert([
      {
        application_id: applicationId,
        scheduled_date: scheduledDate,
        teams_link: teamsLink,
        interview_status: 'scheduled'
      }
    ])
    .select()

  if (interviewError) {
    console.error('Interview scheduling error:', interviewError)
    return { success: false, error: interviewError.message }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  try {
    await sendEmail('pre_interview', {
      applicationId,
      applicantEmail: appData.email,
      applicantName: appData.full_name,
      interviewDate: formatDate(scheduledDate),
      teamsLink
    })

    await supabase
      .from('applications')
      .update({
        interview_status: 'scheduled',
        interview_scheduled_date: scheduledDate
      })
      .eq('id', applicationId)
  } catch (emailError) {
    console.error('Pre-interview email error:', emailError)
  }

  return { success: true, data: interview }
}

export const getTestimonials = async () => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Testimonials fetch error:', error)
    return []
  }

  return data || []
}

export const getApplicationMetrics = async () => {
  const { data, error } = await supabase
    .from('application_metrics')
    .select('*')
    .order('metric_date', { ascending: false })

  if (error) {
    console.error('Metrics fetch error:', error)
    return []
  }

  return data || []
}

export const getContentPrompts = async (category = null) => {
  let query = supabase
    .from('content_prompts')
    .select('*')
    .eq('content_status', 'active')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query.order('authenticity_score', { ascending: false })

  if (error) {
    console.error('Content prompts fetch error:', error)
    return []
  }

  return data || []
}

export const updatePromptMetrics = async (promptId, views = 0, clicks = 0, conversions = 0) => {
  const { data, error } = await supabase
    .from('content_prompts')
    .update({
      views: views + 1,
      clicks,
      conversions
    })
    .eq('id', promptId)

  if (error) {
    console.error('Metrics update error:', error)
    return false
  }

  return true
}
