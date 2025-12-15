import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ApplicationData {
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  selectedShift: string;
  adminEmail?: string;
}

interface InterviewData {
  applicationId: string;
  applicantEmail: string;
  applicantName: string;
  interviewDate: string;
  teamsLink: string;
}

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@example.com";
const COMPANY_NAME = "Remote Data Entry Solutions";

async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!SENDGRID_API_KEY) {
      console.log("SendGrid API key not configured, logging email instead");
      console.log(`Email to: ${to}`);
      console.log(`Subject: ${subject}`);
      return { success: true };
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "noreply@remotedataentry.com", name: COMPANY_NAME },
        subject,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function generateConfirmationEmail(applicantName: string, shift: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Application Received</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">We're excited to review your application</p>
          </div>

          <h2 style="color: #1e3a8a; font-size: 20px; margin-bottom: 20px;">Hello ${applicantName},</h2>

          <p style="margin-bottom: 16px; font-size: 15px;">
            Thank you for applying to the <strong>${shift}</strong> shift at ${COMPANY_NAME}. We've successfully received your application and are reviewing it carefully.
          </p>

          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
              <strong>What's Next?</strong> Our team will review your qualifications and contact you within <strong>24-48 hours</strong> to discuss next steps or schedule your interview.
            </p>
          </div>

          <h3 style="color: #1e3a8a; font-size: 16px; margin-bottom: 12px; margin-top: 24px;">Application Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600; width: 40%;">Selected Shift:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${shift}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">Status:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Under Review</span></td>
            </tr>
          </table>

          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <strong>Interview Format:</strong> Text-based interview via Microsoft Teams. You'll have time to provide thoughtful responses in writing.
            </p>
          </div>

          <p style="margin-bottom: 16px; font-size: 14px; color: #666;">
            If you have any questions about the position or application process, feel free to reply to this email.
          </p>

          <p style="margin-bottom: 8px; font-size: 14px; color: #999;">Best regards,</p>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e3a8a;">${COMPANY_NAME} Hiring Team</p>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #999;">
            <p style="margin: 5px 0;">This is an automated message. Please do not reply with sensitive information.</p>
            <p style="margin: 5px 0;">We're committed to HIPAA compliance and data security.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateAdminNotificationEmail(applicantName: string, email: string, phone: string, shift: string, applicationId: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">NEW APPLICATION RECEIVED</h1>
          </div>

          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">Applicant Information</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr style="background: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: 600; width: 35%;">Name:</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${applicantName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: 600;">Email:</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${email}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: 600;">Phone:</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: 600;">Shift Applied For:</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${shift}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: 600;">Application ID:</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;"><code style="background: #e5e7eb; padding: 4px 8px; border-radius: 3px;">${applicationId}</code></td>
            </tr>
          </table>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Quick Action:</strong> Review application details and schedule interview using the admin dashboard.
            </p>
          </div>

          <p style="margin-bottom: 16px; font-size: 14px; color: #666;">
            This is an automated notification. Log into your admin dashboard to review the full application and schedule an interview.
          </p>
        </div>
      </body>
    </html>
  `;
}

function generatePreInterviewEmail(applicantName: string, interviewDate: string, teamsLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Interview Scheduled</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Great news! Your interview is confirmed</p>
          </div>

          <h2 style="color: #047857; font-size: 20px; margin-bottom: 20px;">Hello ${applicantName},</h2>

          <p style="margin-bottom: 16px; font-size: 15px;">
            Congratulations! We're impressed with your application and would like to move forward with an interview. Here are the details:
          </p>

          <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #166534; font-size: 16px;">Interview Details</h3>
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Date & Time</p>
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #047857;">${interviewDate}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Interview Platform</p>
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #047857;">Microsoft Teams (Text-based)</p>
            </div>
          </div>

          <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #3730a3;">
              <strong>Join Interview:</strong> <a href="${teamsLink}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Click here to join on Microsoft Teams</a>
            </p>
          </div>

          <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px; margin-top: 24px;">What to Expect</h3>
          <ul style="margin: 0 0 24px 20px; padding: 0; font-size: 14px; color: #666;">
            <li style="margin-bottom: 10px;"><strong>Format:</strong> Text-based conversation on Microsoft Teams</li>
            <li style="margin-bottom: 10px;"><strong>Duration:</strong> Approximately 30-45 minutes</li>
            <li style="margin-bottom: 10px;"><strong>Environment:</strong> Quiet space with stable internet connection</li>
            <li><strong>Required:</strong> Computer or smartphone, Microsoft Teams installed or web browser access</li>
          </ul>

          <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px;">Prepare Ahead</h3>
          <ul style="margin: 0 0 24px 20px; padding: 0; font-size: 14px; color: #666;">
            <li style="margin-bottom: 10px;">Have a quiet space ready where you won't be interrupted</li>
            <li style="margin-bottom: 10px;">Test your internet connection beforehand</li>
            <li style="margin-bottom: 10px;">Have a notebook ready for taking notes</li>
            <li>Review the job description and company information</li>
          </ul>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
              <strong>Important:</strong> If you can't make this interview time, please reply to this email as soon as possible to reschedule.
            </p>
          </div>

          <p style="margin-bottom: 8px; font-size: 14px; color: #999;">Good luck! We look forward to speaking with you.</p>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #047857;">${COMPANY_NAME} Hiring Team</p>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { emailType, data } = body;

    if (!emailType || !data) {
      return new Response(
        JSON.stringify({ error: "Missing emailType or data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let emailResult;

    if (emailType === "confirmation") {
      const appData = data as ApplicationData;
      const htmlContent = generateConfirmationEmail(appData.fullName, appData.selectedShift);
      emailResult = await sendEmailViaSendGrid(
        appData.email,
        "Application Received - We're Reviewing Your Submission",
        htmlContent
      );
    } else if (emailType === "admin_notification") {
      const appData = data as ApplicationData;
      const htmlContent = generateAdminNotificationEmail(
        appData.fullName,
        appData.email,
        appData.phone,
        appData.selectedShift,
        appData.applicationId
      );
      emailResult = await sendEmailViaSendGrid(
        appData.adminEmail || ADMIN_EMAIL,
        `[NEW APP] ${appData.fullName} - ${appData.selectedShift}`,
        htmlContent
      );
    } else if (emailType === "pre_interview") {
      const interviewData = data as InterviewData;
      const htmlContent = generatePreInterviewEmail(
        interviewData.applicantName,
        interviewData.interviewDate,
        interviewData.teamsLink
      );
      emailResult = await sendEmailViaSendGrid(
        interviewData.applicantEmail,
        "Your Interview is Scheduled - Join via Microsoft Teams",
        htmlContent
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid emailType" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: emailResult.success, error: emailResult.error }),
      {
        status: emailResult.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
