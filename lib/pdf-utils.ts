const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1

interface TextChunk {
  text: string
  pageRange: string
  startPage: number
  endPage: number
  paragraphs?: string[]
}

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

      // // Option 1: Use service account key JSON from environment variable
      // if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      //   console.log('Using Google Service Account Key from environment')
      //   try {
      //     // Parse the JSON string to an object
      //     const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      //     clientConfig.credentials = serviceAccountKey
      //     console.log('Service account key parsed successfully')
      //   } catch (parseError) {
      //     console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_KEY:', parseError)
      //     throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be valid JSON')
      //   }
      // }
      // // Option 2: Use individual credential fields
      // else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      //   console.log('Using Google credentials from individual environment variables')
      //   clientConfig.credentials = {
      //     client_email: process.env.GOOGLE_CLIENT_EMAIL,
      //     private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      //   }
      // }
      // Option 3: Use application credentials file path
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('Using Google Application Credentials file path')
        clientConfig.credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('ascii'));
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

export async function extractTextFromPDF(pdfFile: File): Promise<TextChunk[]> {
  try {
    console.log("=== Extracting Text from PDF using Document AI ===")
    console.log("File:", { name: pdfFile.name, size: pdfFile.size, type: pdfFile.type })

    const config: DocumentAIConfig = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
      processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID!,
    }

    // Check if Document AI is configured
    if (!config.projectId || !config.processorId) {
      console.warn("Document AI not configured, falling back to basic text extraction")
      return await extractTextFromPDFBasic(pdfFile)
    }

    // Convert File to ArrayBuffer and then to Buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    const client = getDocumentAIClient()

    // The full resource name of the processor, e.g.:
    // projects/project-id/locations/location/processor/processor-id
    // You must create new processors in the Cloud Console first
    const name = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`

    // Convert the PDF data to a Buffer and base64 encode it.
    const encodedPDF = pdfBuffer.toString('base64')

    const request = {
      name,
      rawDocument: {
        content: encodedPDF,
        mimeType: 'application/pdf',
      },
    }

    console.log('Processing PDF with Google Document AI...')
    
    // Recognizes text entities in the PDF document
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

    console.log('Document AI processing completed')
    console.log('Extracted text length:', text ? text.length : 0)

    // Process pages and extract paragraphs, combining into chunks of 10 pages
    const chunks: TextChunk[] = []
    const pages = document.pages || []
    const pagesPerChunk = 5
    const overlapPages = 1
    
    if (pages.length === 0) {
      // If no pages structure, return the whole text as one chunk
      chunks.push({
        text: text || '',
        pageRange: '1-1',
        startPage: 1,
        endPage: 1,
        paragraphs: [],
      })
    } else {
      // Process pages in chunks of 5 with 1 page overlap
      for (let chunkIndex = 0; chunkIndex < pages.length; chunkIndex += (pagesPerChunk - overlapPages)) {
        const chunkStartPage = chunkIndex + 1
        const chunkEndPage = Math.min(chunkIndex + pagesPerChunk, pages.length)
        const hasOverlap = chunkIndex > 0
        
        let chunkText = ''
        const chunkParagraphs: string[] = []
        
        // Process each page in this chunk
        for (let pageIndex = chunkIndex; pageIndex < chunkEndPage; pageIndex++) {
          const page = pages[pageIndex]
          const pageNumber = pageIndex + 1
          const { paragraphs } = page || {}

          const pageParagraphs: string[] = []
          let pageText = ''

          if (paragraphs) {
            for (const paragraph of paragraphs) {
              const paragraphText = getText(paragraph.layout.textAnchor)
              if (paragraphText.trim()) {
                pageParagraphs.push(paragraphText.trim())
                pageText += paragraphText + '\n\n'
              }
            }
          }

          // If no paragraphs found, use a portion of the full text
          if (!pageText.trim() && text) {
            const charsPerPage = Math.ceil(text.length / pages.length)
            const startIndex = pageIndex * charsPerPage
            const endIndex = Math.min((pageIndex + 1) * charsPerPage, text.length)
            pageText = text.substring(startIndex, endIndex)
          }

          // Add page separator and content to chunk
          if (chunkText) {
            chunkText += '\n\n--- PAGE SEPARATOR ---\n\n'
          }
          
          // Mark overlap pages for context
          const isOverlapPage = hasOverlap && pageIndex === chunkIndex
          const pageMarker = isOverlapPage ? `=== PAGE ${pageNumber} (OVERLAP - USE ONLY IF RELEVANT TO FOLLOWING PAGES) ===` : `=== PAGE ${pageNumber} ===`
          chunkText += `${pageMarker}\n\n${pageText.trim()}`
          
          // Add page paragraphs to chunk paragraphs
          chunkParagraphs.push(...pageParagraphs)

          console.log(`Page ${pageNumber}: ${pageParagraphs.length} paragraphs, ${pageText.length} characters`)
        }

        // Create the chunk
        const pageRange = chunkStartPage === chunkEndPage ? `${chunkStartPage}` : `${chunkStartPage}-${chunkEndPage}`
        chunks.push({
          text: chunkText.trim(),
          pageRange,
          startPage: chunkStartPage,
          endPage: chunkEndPage,
          paragraphs: chunkParagraphs,
        })

        console.log(`Chunk ${chunks.length}: Pages ${pageRange}, ${chunkParagraphs.length} total paragraphs, ${chunkText.length} characters`)
      }
    }

    console.log(`Successfully extracted text from ${chunks.length} pages`)
    return chunks

  } catch (error) {
    console.error("Error extracting text from PDF with Document AI:", error)
    console.log("Falling back to basic text extraction...")
    
    // Fallback to basic extraction if Document AI fails
    return await extractTextFromPDFBasic(pdfFile)
  }
}

// Fallback method using basic PDF processing
async function extractTextFromPDFBasic(pdfFile: File): Promise<TextChunk[]> {
  try {
    console.log("Using basic PDF text extraction (fallback)")
    
    // This is a basic fallback - in a production environment, you might want to use pdf-parse or similar
    const arrayBuffer = await pdfFile.arrayBuffer()
    const chunks: TextChunk[] = []

    // Create a single chunk with basic info
    chunks.push({
      text: `PDF Content from ${pdfFile.name}\n\nThis PDF contains ${Math.round(pdfFile.size / 1024)}KB of data.\n\nTo extract actual text content, please configure Google Document AI with:\n- GOOGLE_CLOUD_PROJECT_ID\n- GOOGLE_DOCUMENT_AI_PROCESSOR_ID\n- Valid Google Cloud credentials`,
      pageRange: "1",
      startPage: 1,
      endPage: 1,
      paragraphs: ["PDF processing requires Document AI configuration"],
    })

    return chunks
  } catch (error) {
    console.error("Error in basic PDF extraction:", error)
    throw new Error("Failed to extract text from PDF")
  }
}
