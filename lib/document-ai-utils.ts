const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1

interface DocumentAIConfig {
  projectId: string
  location: string
  processorId: string
}

// Initialize the Document AI client
let documentAIClient: any | null = null

function getDocumentAIClient(): any {
  if (!documentAIClient) {
    try {
      let clientConfig: any = {}

      // Option 1: Use service account key JSON from environment variable
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.log('Using Google Service Account Key from environment')
        try {
          // Parse the JSON string to an object
          const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
          clientConfig.credentials = serviceAccountKey
          console.log('Service account key parsed successfully')
        } catch (parseError) {
          console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_KEY:', parseError)
          throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be valid JSON')
        }
      }
      // Option 2: Use individual credential fields
      else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        console.log('Using Google credentials from individual environment variables')
        clientConfig.credentials = {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
      }
      // Option 3: Use application credentials file path
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('Using Google Application Credentials file path')
        clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS
      }
      // Option 4: Use default credentials (gcloud CLI or metadata service)
      else {
        console.log('Using default Google Cloud credentials')
      }

      // Add regional endpoint if needed
      // clientConfig.apiEndpoint = 'eu-documentai.googleapis.com'; // Uncomment for EU region

      // Instantiates a client
      documentAIClient = new DocumentProcessorServiceClient(clientConfig)
      console.log('Document AI client initialized successfully')
    } catch (error) {
      console.error('Error initializing Document AI client:', error)
      throw new Error(`Failed to initialize Document AI client: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  return documentAIClient
}

export async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const config: DocumentAIConfig = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
      processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID!,
    }

    // Validate required environment variables
    if (!config.projectId || !config.processorId) {
      throw new Error('Google Cloud Project ID and Document AI Processor ID are required')
    }

    const client = getDocumentAIClient()

    // The full resource name of the processor, e.g.:
    // projects/project-id/locations/location/processor/processor-id
    // You must create new processors in the Cloud Console first
    const name = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`

    // Convert the image data to a Buffer and base64 encode it.
    const encodedImage = imageBuffer.toString('base64')

    const request = {
      name,
      rawDocument: {
        content: encodedImage,
        mimeType,
      },
    }

    console.log('Processing document with Google Document AI...')
    
    // Recognizes text entities in the document
    const [result] = await client.processDocument(request)
    const { document } = result

    if (!document) {
      throw new Error('No document returned from Document AI')
    }

    // Get all of the document text as one big string
    const { text } = document
    
    console.log('Document AI processing completed')
    console.log('Extracted text length:', text ? text.length : 0)

    return text || ''
  } catch (error) {
    console.error('Error in Document AI processing:', error)
    throw new Error(`Document AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Enhanced OCR method with paragraph extraction for better text structure
export async function extractTextWithOCR(imageBuffer: Buffer, mimeType: string): Promise<{
  text: string
  paragraphs?: string[]
  entities?: Array<{
    type: string
    mentionText: string
    confidence: number
  }>
}> {
  try {
    const config: DocumentAIConfig = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
      processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID!,
    }

    // Validate required environment variables
    if (!config.projectId || !config.processorId) {
      throw new Error('Google Cloud Project ID and Document AI Processor ID are required')
    }

    const client = getDocumentAIClient()

    // The full resource name of the processor, e.g.:
    // projects/project-id/locations/location/processor/processor-id
    // You must create new processors in the Cloud Console first
    const name = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`

    // Convert the image data to a Buffer and base64 encode it.
    const encodedImage = imageBuffer.toString('base64')

    const request = {
      name,
      rawDocument: {
        content: encodedImage,
        mimeType,
      },
    }

    console.log('Processing document with Google Document AI OCR...')
    
    // Recognizes text entities in the document
    const [result] = await client.processDocument(request)
    const { document } = result

    if (!document) {
      throw new Error('No document returned from Document AI')
    }

    // Get all of the document text as one big string
    const { text } = document

    // Extract shards from the text field
    const getText = (textAnchor: any) => {
      if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
        return ''
      }

      // First shard in document doesn't have startIndex property
      const startIndex = textAnchor.textSegments[0].startIndex || 0
      const endIndex = textAnchor.textSegments[0].endIndex

      return text.substring(startIndex, endIndex)
    }

    // Read the text recognition output from the processor
    console.log('Extracting paragraphs from the document...')
    const paragraphs: string[] = []
    
    if (document.pages && document.pages.length > 0) {
      const [page1] = document.pages
      const { paragraphs: pageParagraphs } = page1 || {}

      if (pageParagraphs) {
        for (const paragraph of pageParagraphs) {
          const paragraphText = getText(paragraph.layout.textAnchor)
          if (paragraphText.trim()) {
            paragraphs.push(paragraphText.trim())
            console.log(`Paragraph text:\n${paragraphText}`)
          }
        }
      }
    }
    
    // Extract entities if available
    const entities = document.entities?.map((entity: any) => ({
      type: entity.type || 'unknown',
      mentionText: entity.mentionText || '',
      confidence: entity.confidence || 0,
    })) || []

    console.log('Document AI OCR processing completed')
    console.log('Extracted text length:', text ? text.length : 0)
    console.log('Extracted paragraphs:', paragraphs.length)
    console.log('Extracted entities:', entities.length)

    return {
      text: text || '',
      paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
      entities: entities.length > 0 ? entities : undefined,
    }
  } catch (error) {
    console.error('Error in Document AI OCR processing:', error)
    throw new Error(`Document AI OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper function to validate image format
export function validateImageFormat(mimeType: string): boolean {
  const supportedFormats = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ]
  
  return supportedFormats.includes(mimeType.toLowerCase())
}

// Helper function to validate file size
export function validateImageSize(fileSize: number, maxSizeMB: number = 20): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  return fileSize <= maxBytes
}