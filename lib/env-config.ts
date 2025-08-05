// Environment configuration validation
export function validateEnvConfig() {
  const config = {
    // OpenAI configuration (required for existing Q&A functionality)
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    
    // Google Cloud configuration (required for Document AI)
    googleCloud: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
      processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
    }
  }

  const warnings: string[] = []
  const errors: string[] = []

  // Check OpenAI configuration
  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required for Q&A extraction functionality')
  }

  // Check Google Cloud configuration
  if (!config.googleCloud.projectId) {
    warnings.push('GOOGLE_CLOUD_PROJECT_ID is not set - Document AI features will be disabled')
  }

  if (!config.googleCloud.processorId) {
    warnings.push('GOOGLE_DOCUMENT_AI_PROCESSOR_ID is not set - Document AI features will be disabled')
  }

  // Check Google Cloud authentication options
  const hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const hasIndividualCreds = !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
  const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  
  if (!hasServiceAccountKey && !hasIndividualCreds && !hasCredentialsFile) {
    warnings.push('No Google Cloud credentials configured - will try default credentials (gcloud CLI or metadata service)')
  } else {
    if (hasServiceAccountKey) {
      console.log('Google Cloud: Using service account key from GOOGLE_SERVICE_ACCOUNT_KEY')
    } else if (hasIndividualCreds) {
      console.log('Google Cloud: Using individual credentials from GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY')
    } else if (hasCredentialsFile) {
      console.log('Google Cloud: Using credentials file from GOOGLE_APPLICATION_CREDENTIALS')
    }
  }

  // Log warnings and errors
  if (warnings.length > 0) {
    console.warn('Environment configuration warnings:')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }

  if (errors.length > 0) {
    console.error('Environment configuration errors:')
    errors.forEach(error => console.error(`  - ${error}`))
  }

  return {
    config,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings
  }
}

export function getProcessingCapabilities() {
  const envCheck = validateEnvConfig()
  
  return {
    pdfQAExtraction: !!envCheck.config.openai.apiKey,
    documentAIOCR: !!(envCheck.config.googleCloud.projectId && envCheck.config.googleCloud.processorId),
    langchainVision: !!envCheck.config.googleCloud.projectId, // Can use vision even without Document AI
  }
}