import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileUp, Download, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface BulkQuestionImportProps {
  testId: number;
  onImported?: () => void;
}

const TEMPLATE_CSV = `question_text,option_a,option_b,option_c,option_d,correct_answer
What is the output of print(2**3) in Python?,6,8,4,16,B
Which data structure uses LIFO?,Queue,Stack,Heap,Tree,B
What does HTML stand for?,HyperText Markup Language,HighText Machine Language,Hyperlink Text Mode Language,None,A`;

export const BulkQuestionImport = ({ testId, onImported }: BulkQuestionImportProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('test_id', String(testId));
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/tests/import-questions`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Questions imported successfully!');
        onImported?.();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Import failed');
      }
    } catch (e) {
      toast.error('Failed to connect to server');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" /> Bulk Question Import</CardTitle>
            <CardDescription className="mt-1">Upload an Excel or CSV file to import questions in bulk.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.xlsx,.xls';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Importing {fileName}...</p>
            </div>
          ) : fileName ? (
            <div className="space-y-1">
              <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-green-600">{fileName}</p>
              <p className="text-xs text-muted-foreground">Click to upload another file</p>
            </div>
          ) : (
            <div className="space-y-2">
              <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-sm">Drag & drop or click to select</p>
              <p className="text-xs text-muted-foreground">Supports .csv, .xlsx, .xls</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Required columns: <code className="bg-secondary px-1 rounded">question_text</code>, <code className="bg-secondary px-1 rounded">option_a</code> – <code className="bg-secondary px-1 rounded">option_d</code>, <code className="bg-secondary px-1 rounded">correct_answer</code> (A/B/C/D)
        </p>
      </CardContent>
    </Card>
  );
};
