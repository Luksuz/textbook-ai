import type { QAPair } from "@/lib/types"
import { QAPairCard } from "./QAPairCard"

interface QAPairListProps {
  qaPairs: QAPair[]
}

export function QAPairList({ qaPairs }: QAPairListProps) {
  return (
    <div className="space-y-4">
      {qaPairs.map((pair, index) => (
        <QAPairCard key={index} qaPair={pair} index={index} />
      ))}
    </div>
  )
}
