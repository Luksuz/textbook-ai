"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { VCAOrder } from "@/lib/types"

interface VCAResultDisplayProps {
  data: VCAOrder
  metadata?: {
    fileName: string
    fileSize: number
    fileType: string
    processingMethod?: string
  }
}

export function VCAResultDisplay({ data, metadata }: VCAResultDisplayProps) {
  // Helper function to format field values
  const formatValue = (value: string | undefined): string => {
    return value && value.trim() !== "" ? value : "—"
  }

  // Helper function to render field with label
  const renderField = (label: string, value: string | undefined, description?: string) => (
    <div className="flex justify-between items-start py-1">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{label}:</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <span className="text-sm text-gray-900 font-mono ml-4 text-right">
        {formatValue(value)}
      </span>
    </div>
  )

  // Group fields by category
  const prescriptionFields = [
    { label: "SPH", value: data.SPH, description: "Sphere values (R;L)" },
    { label: "CYL", value: data.CYL, description: "Cylinder values (R;L)" },
    { label: "AX", value: data.AX, description: "Axis values (R;L)" },
    { label: "ADD", value: data.ADD, description: "Add Power values (R;L)" },
    { label: "PRVM", value: data.PRVM, description: "Prescription Prism (R;L)" },
    { label: "PRVA", value: data.PRVA, description: "Prism Base Direction (R;L)" },
  ]

  const measurementFields = [
    { label: "IPD", value: data.IPD, description: "Interpupillary Distance (R;L)" },
    { label: "NPD", value: data.NPD, description: "Near PD (R;L)" },
    { label: "SEGHT", value: data.SEGHT, description: "Pupil Height (R;L)" },
    { label: "BVD", value: data.BVD, description: "Back Vertex Distance (R;L)" },
    { label: "PANTO", value: data.PANTO, description: "Pantoscopic Tilt (R;L)" },
  ]

  const frameFields = [
    { label: "HBOX", value: data.HBOX, description: "Frame Width [A] (R;L)" },
    { label: "VBOX", value: data.VBOX, description: "Frame Height [B] (R;L)" },
    { label: "DBL", value: data.DBL, description: "Bridge Width" },
    { label: "FED", value: data.FED, description: "Frame Effective Diameter (R;L)" },
  ]

  const lensFields = [
    { label: "LNAM", value: data.LNAM, description: "Lens Code (R;L)" },
    { label: "CORR", value: data.CORR, description: "Corridor value" },
    { label: "CRIB", value: data.CRIB, description: "Diameter 1 (R;L)" },
    { label: "ELLH", value: data.ELLH, description: "Diameter 2 (R;L)" },
    { label: "MINTHKCD", value: data.MINTHKCD, description: "Min Edge/Center Thickness (R;L)" },
    { label: "MINCTR", value: data.MINCTR, description: "Min Center Thickness (R;L)" },
  ]

  const coatingFields = [
    { label: "TINT", value: data.TINT, description: "Tint Code" },
    { label: "ACOAT", value: data.ACOAT, description: "Coating Code" },
    { label: "COLR", value: data.COLR, description: "Color Code (R;L)" },
  ]

  const customerFields = [
    { label: "CLIENT", value: data.CLIENT, description: "Wearer's Name" },
    { label: "CLIENTF", value: data.CLIENTF, description: "Wearer's Name Abbreviation" },
    { label: "ACCN", value: data.ACCN, description: "Customer/Company Code" },
    { label: "CustomerRetailName", value: data.CustomerRetailName, description: "Retail Name" },
    { label: "ShopNumber", value: data.ShopNumber, description: "ERP Query Number" },
  ]

  return (
    <div className="space-y-4">
      {/* Header with metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            VCA Data Extraction Results
            <Badge variant="secondary" className="ml-2">
              {data.DO === "B" ? "Both Eyes" : data.DO === "R" ? "Right Eye" : "Left Eye"}
            </Badge>
          </CardTitle>
          {metadata && (
            <CardDescription>
              File: {metadata.fileName} ({Math.round(metadata.fileSize / 1024)}KB) • 
              Method: {metadata.processingMethod || "Unknown"}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customerFields.map(field => (
            <div key={field.label}>
              {renderField(field.label, field.value, field.description)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Prescription Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prescription Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {prescriptionFields.map(field => (
            <div key={field.label}>
              {renderField(field.label, field.value, field.description)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {measurementFields.map(field => (
            <div key={field.label}>
              {renderField(field.label, field.value, field.description)}
            </div>
          ))}
          <Separator className="my-2" />
          <div className="space-y-2">
            {renderField("BCERIN", data.BCERIN, "Horizontal Decentration In/Out (R;L)")}
            {renderField("BCERUP", data.BCERUP, "Vertical Decentration Up/Down (R;L)")}
            {renderField("PRVIN", data.PRVIN, "Horizontal Prism Direction (R;L)")}
            {renderField("PRVUP", data.PRVUP, "Vertical Prism Direction (R;L)")}
          </div>
        </CardContent>
      </Card>

      {/* Frame Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frame Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {frameFields.map(field => (
            <div key={field.label}>
              {renderField(field.label, field.value, field.description)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lens Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lens Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lensFields.map(field => (
            <div key={field.label}>
              {renderField(field.label, field.value, field.description)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coating & Tint */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coating & Tint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {coatingFields.map(field => (
            <div key={field.label}>
              {renderField(field.label, field.value, field.description)}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}