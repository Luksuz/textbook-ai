# Document Q&A Extraction with OpenAI and Google Document AI

This project supports Q&A extraction from both PDFs and images using OpenAI and Google Document AI for OCR.

## New Features

### Image Processing Pipeline
1. **Google Document AI OCR** - Extracts text from images with high accuracy
2. **OpenAI Integration** - Uses GPT-4 Vision for Q&A extraction from text/images
3. **Zod Schema Validation** - Ensures extracted data follows the Q&A format
4. **Fallback Processing** - Uses direct OpenAI vision if Document AI is unavailable

### Q&A Data Schema
The system extracts educational question-answer pairs including:
- Question text
- Answer content
- Explanation/context
- Confidence score
- Page/source reference

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @langchain/google-vertexai @google-cloud/documentai langchain --legacy-peer-deps
```

### 2. Google Cloud Setup

#### Create Document AI Processor
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Document AI API
3. Create a new Document AI processor:
   - Type: "Document OCR" or "Form Parser"
   - Region: us or eu
4. Note the Processor ID

#### Set Up Authentication
The Document AI client supports multiple authentication methods. Choose one:

**Option A: Service Account Key JSON (Recommended for production)**
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Copy the entire JSON content and set it as `GOOGLE_SERVICE_ACCOUNT_KEY` in your `.env.local`

**Option B: Individual Credential Fields**
1. Extract `client_email` and `private_key` from your service account JSON
2. Set `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` in your `.env.local`

**Option C: Credentials File Path**
1. Download the JSON key file to your server
2. Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

**Option D: Google Cloud CLI (Development)**
1. Install Google Cloud CLI
2. Run `gcloud auth application-default login`

**Option E: Google Cloud Environment**
If running on Google Cloud, credentials are automatically available

### 3. Environment Variables
Copy `env.example` to `.env.local` and fill in your values:

```bash
# OpenAI (existing functionality)
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your_processor_id

# Google Cloud Authentication (choose one method)
# Method 1: Service Account Key JSON
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}

# Method 2: Individual fields (alternative to JSON)
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Method 3: File path (alternative to above)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 4. Run the Application
```bash
npm run dev
```

## Usage

### For Image Q&A Extraction
1. Upload an image file (JPEG, PNG, WebP, GIF, BMP, TIFF)
2. The system will:
   - Extract text using Google Document AI OCR (if configured)
   - Process the text/image with OpenAI GPT-4 Vision
   - Validate and structure the data using Zod
   - Display results as Q&A pairs

### For PDF Q&A Extraction
1. Upload a PDF file
2. The system extracts Q&A pairs using the OpenAI pipeline

## API Endpoints

### `/api/process-image`
- **Method**: POST
- **Body**: FormData with `image` field
- **Response**: Q&A pairs extracted from image
- **Features**: Automatic fallback between Document AI OCR + OpenAI and direct OpenAI vision

### `/api/process-pdf`
- **Method**: POST
- **Body**: FormData with `pdf` field
- **Response**: Q&A pairs extracted from PDF
- **Features**: OpenAI-powered text analysis and question generation

## File Structure

```
lib/
├── document-ai-utils.ts     # Google Document AI integration
├── langchain-utils.ts       # LangChain processing with Zod validation
├── types.ts                 # Zod schemas and TypeScript types
├── env-config.ts            # Environment validation and capabilities
├── actions.ts               # Deprecated - replaced with API routes
└── ...

app/
├── api/
│   ├── process-image/       # Image processing API route
│   └── process-pdf/         # PDF processing API route
└── page.tsx                 # Updated main interface

components/
├── VCAResultDisplay.tsx     # Display component for VCA data
├── FileUploader.tsx         # Updated to support both PDFs and images
└── ...
```

## Error Handling

The system includes comprehensive error handling:
- **Environment Validation**: Automatic detection of missing configuration
- **File Validation**: Type and size limits (20MB for images, 50MB for PDFs)
- **Processing Fallbacks**: Document AI → Direct Vision for images
- **Authentication**: Clear error messages for credential issues
- **API Quotas**: Proper handling of rate limits and quota exceeded errors
- **Service Availability**: Graceful degradation when services are unavailable

## Recent Fixes

### Fixed Client-Server Boundary Issue
- **Problem**: Server actions couldn't call client-side progress callbacks
- **Solution**: Migrated from server actions to API routes (`/api/process-pdf`)
- **Benefits**: Better error handling, progress tracking, and scalability

## Tint and Coating Code References

The system automatically maps lens specifications to codes:

### Tint Codes
- 1.50 CR39 1T+UV400 → "501TUV"
- 1.67 MR-7 2T → "672T"
- 1.60 MR-8 1T → "601T"
- etc.

### Coating Codes
- PT DRIVE → "PT DRIVE"
- PT BLUE → "PT BLUE"
- PT GREEN → "PT GREEN"
- etc.

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Google Cloud credentials
   - Check service account permissions
   - Ensure Document AI API is enabled

2. **Processing Failures**
   - Verify image quality and text visibility
   - Check processor ID and region settings
   - Monitor API quotas in Google Cloud Console

3. **Fallback Behavior**
   - If Document AI fails, the system uses direct LangChain vision
   - Both methods use the same Zod validation schema
   - Check logs for specific error details