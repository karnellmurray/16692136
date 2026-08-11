import twilio from 'twilio'

let client = null

export function getTwilioClient() {
  if (!client) client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return client
}
