import { z } from "zod"

export interface QAPair {
  question: string
  options: [string, string, string, string] // Exactly 4 options
  correctAnswer: number // Index of correct answer (0-3)
  explanation: string
  wrongAnswerExplanations: [string, string, string] // Explanations for why the other 3 options are wrong
  page_range: string
  confidence: number
}

export interface ProcessingOptions {
  onProgress?: (stage: string, percent: number) => void
}

export interface ExtractionResult {
  qaPairs: QAPair[]
}

// Zod schema for VCA Order - structured extraction from images
export const VCAOrderSchema = z.object({
  DO: z.string().default("B").describe("Eyes: B=Both, R=Right, L=Left"),
  ACCN: z.string().optional().describe("The customer's company name or customer code if available"),
  CLIENT: z.string().optional().describe("Wearer's Name"),
  CLIENTF: z.string().optional().describe("Wearer's Name Abbreviation"),
  LNAM: z.string().optional().describe("Lens Code (format: right;left, e.g., 'OVMDXV;OVMDXV')"),
  SPH: z.string().optional().describe("Sphere values (format: right;left, e.g., '-1.75;-1.75')"),
  CYL: z.string().optional().describe("Cylinder values (format: right;left, e.g., '-0.5;-0.25')"),
  AX: z.string().optional().describe("Axis values (format: right;left, e.g., '45;180')"),
  ADD: z.string().optional().describe("Add Power values (format: right;left, e.g., '1.75;1.75')"),
  CORR: z.string().optional().describe("Corridor value (single value, e.g., '15mm', '17mm', '19mm', '21mm')"),
  CRIB: z.string().optional().describe("Diameter 1 (format: right;left, e.g., '70;70')"),
  ELLH: z.string().optional().describe("Diameter 2 (format: right;left, e.g., '70;70')"),
  PRVM: z.string().optional().describe("Prescription Prism (format: right;left, e.g., '0;0')"),
  PRVA: z.string().optional().describe("Prescription Prism Base Direction (format: right;left, e.g., '0;0')"),
  IPD: z.string().optional().describe("Interpupillary Distance Far (format: right;left, e.g., '30.5;30.5')"),
  NPD: z.string().optional().describe("Near Pupillary Distance (format: right;left, e.g., '28.57;28.57')"),
  HBOX: z.string().optional().describe("Frame Width [A] (format: right;left, e.g., '44.95;44.97')"),
  VBOX: z.string().optional().describe("Frame Height [B] (format: right;left, e.g., '39.96;40.01')"),
  DBL: z.string().optional().describe("Distance Between Lenses - Bridge Width (single value, e.g., '20')"),
  FED: z.string().optional().describe("Frame Effective Diameter Diagonal (format: right;left, e.g., '49.84;49.92')"),
  BVD: z.string().optional().describe("Back Vertex Distance (format: right;left, e.g., '13;13')"),
  PANTO: z.string().optional().describe("Pantoscopic Tilt (format: right;left)"),
  SEGHT: z.string().optional().describe("Pupil Height HT (format: right;left, e.g., '28.04;28.02')"),
  BCERIN: z.string().optional().describe("Horizontal Decentration In/Out (format: right;left, e.g., '0;0')"),
  BCERUP: z.string().optional().describe("Vertical Decentration Up/Down (format: right;left, e.g., '0;0')"),
  MINTHKCD: z.string().optional().describe("Minimum Edge/Center Thickness (format: right;left, e.g., '0.51;0.51')"),
  MINCTR: z.string().optional().describe("Minimum Center Thickness (format: right;left, e.g., '1.64;1.64')"),
  TINT: z.string().optional().describe("Tint Code (single value, e.g., 'GRAY')"),
  ACOAT: z.string().optional().describe("Coating Code (single value, e.g., 'PT GREEN')"),
  PRVIN: z.string().optional().describe("Horizontal Prism Direction (format: right;left, e.g., '3;2')"),
  PRVUP: z.string().optional().describe("Vertical Prism Direction (format: right;left, e.g., '1.5;1')"),
  COLR: z.string().optional().describe("Color Code (format: right;left, e.g., 'Gray;Gray')"),
  ShopNumber: z.string().optional().describe("ERP Query Number"),
  CustomerRetailName: z.string().optional().describe("The retail name of the customer"),
})

export type VCAOrder = z.infer<typeof VCAOrderSchema>

// Image processing result interface
export interface ImageExtractionResult {
  success: boolean
  data?: {
    qaPairs: QAPair[]
  }
  error?: string
  metadata?: {
    fileName: string
    fileSize: number
    fileType: string
    processingMethod?: string
    totalQAPairs?: number
  }
  ocrText?: string
}
