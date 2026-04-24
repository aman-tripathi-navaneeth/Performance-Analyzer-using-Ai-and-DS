
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrainCircuit, Download, Copy, Play, Loader2, Sparkles, FileJson } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export const AIQuestionVariationTool = () => {
    const [inputJson, setInputJson] = useState('');
    const [factor, setFactor] = useState(4);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<any>(null);
    const [subject, setSubject] = useState('');

    const handleGenerate = async () => {
        if (!inputJson.trim() || !subject.trim()) {
            toast.error("Please provide base questions and subject.");
            return;
        }

        try {
            const baseQuestions = JSON.parse(inputJson);
            if (!Array.isArray(baseQuestions)) {
                toast.error("Input must be a JSON array of questions.");
                return;
            }

            setIsGenerating(true);
            const totalCount = baseQuestions.length * factor;

            const response = await fetch(`${API_BASE_URL}/api/tests/generate-variations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base_questions: baseQuestions,
                    multiplication_factor: factor,
                    total_count: totalCount,
                    subject: subject
                })
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedResult(data);
                toast.success(`Successfully expanded ${baseQuestions.length} questions into ${data.questions?.length || 0} variations!`);
            } else {
                const err = await response.json();
                toast.error(err.detail || "Generation failed.");
            }
        } catch (e) {
            toast.error("Invalid JSON format. Please check your input.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedResult || !generatedResult.questions) return;
        
        // Convert to CSV string matching BulkQuestionImport format
        let csvContent = 'question_text,option_a,option_b,option_c,option_d,correct_answer\n';
        
        generatedResult.questions.forEach((q: any) => {
            // Escape double quotes and enclose fields in double quotes to handle commas/newlines
            const escapeCSV = (text: string) => `"${String(text).replace(/"/g, '""')}"`;
            
            const row = [
                escapeCSV(q.question),
                escapeCSV(q.options?.A || ''),
                escapeCSV(q.options?.B || ''),
                escapeCSV(q.options?.C || ''),
                escapeCSV(q.options?.D || ''),
                escapeCSV(q.correct_answer || '')
            ];
            
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Expanded_Question_Bank_${subject.replace(/\s/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded CSV format ready for bulk import!");
    };

    const handleCopy = () => {
        if (!generatedResult) return;
        navigator.clipboard.writeText(JSON.stringify(generatedResult, null, 2));
        toast.info("Copied to clipboard!");
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">AI Exam Variation Generator</h2>
                    <p className="text-muted-foreground">Expand your question bank intelligently using AI-powered rephrasing and scenario variations.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card className="border-primary/20 shadow-sm overflow-hidden">
                        <CardHeader className="bg-secondary/20">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                                <FileJson className="h-4 w-4" /> Base Questions (JSON)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject / Topic Name</Label>
                                <Input 
                                    id="subject" 
                                    placeholder="e.g. Operating Systems, Data Structures" 
                                    value={subject} 
                                    onChange={(e) => setSubject(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="json-input">Questions Array</Label>
                                <Textarea 
                                    id="json-input"
                                    placeholder='[{"question": "What is CPU?", "options": {"A": "Central Unit", ...}, "correct_answer": "A"}]' 
                                    className="font-mono text-xs h-[300px] bg-secondary/10"
                                    value={inputJson}
                                    onChange={(e) => setInputJson(e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <Label>Expansion Factor (Multiplier)</Label>
                                    <span className="text-primary font-bold">{factor}x</span>
                                </div>
                                <Slider 
                                    value={[factor]} 
                                    onValueChange={(v) => setFactor(v[0])} 
                                    max={10} 
                                    min={2} 
                                    step={1} 
                                    className="py-4"
                                />
                                <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">
                                    Result: {inputJson.trim() ? (inputJson.split('question').length - 1) * factor : 0} Total Questions
                                </p>
                            </div>

                            <Button 
                                className="w-full mt-2 bg-primary hover:bg-primary/90" 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating Variations...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Expanded Bank
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="h-full border-border/50 shadow-lg relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-3xl"></div>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Output Preview
                                {generatedResult && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCopy}>
                                            <Copy className="h-3 w-3 mr-1" /> Copy
                                        </Button>
                                        <Button variant="default" size="sm" onClick={handleDownload}>
                                            <Download className="h-3 w-3 mr-1" /> Download
                                        </Button>
                                    </div>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0 border-t">
                            {generatedResult ? (
                                <div className="p-4 space-y-4">
                                    {generatedResult.questions?.slice(0, 10).map((q: any, i: number) => (
                                        <div key={i} className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-sm">
                                            <p className="font-bold mb-2">Q{i+1}: {q.question}</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {Object.entries(q.options || {}).map(([key, val]) => (
                                                    <div key={key} className={key === q.correct_answer ? "text-green-600 font-bold" : "text-muted-foreground"}>
                                                        {key}: {val as string}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {generatedResult.questions?.length > 10 && (
                                        <div className="text-center py-4 text-muted-foreground text-xs italic">
                                            + {generatedResult.questions.length - 10} more questions generated...
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                    <Loader2 className={`h-12 w-12 mb-4 opacity-20 ${isGenerating ? 'animate-spin opacity-50' : ''}`} />
                                    <p className="text-sm">Generated questions will appear here.</p>
                                    <p className="text-xs max-w-[200px] mt-2">Paste your source JSON and click Generate to start the AI expansion.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
