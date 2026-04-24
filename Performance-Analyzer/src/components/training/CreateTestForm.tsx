import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { yearOptions, subjectOptions } from './trainingTypes';
import { useBranches } from '../../hooks/useBranches';
import { API_BASE_URL } from '../../config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, FileJson, AlertCircle } from 'lucide-react';

interface CreateTestFormProps {
    facultyUsername: string;
    onTestCreated: () => void;
}

export const CreateTestForm = ({ facultyUsername, onTestCreated }: CreateTestFormProps) => {
    const { branchOptions } = useBranches();
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [branch, setBranch] = useState('');
    const [section, setSection] = useState('');
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [numQuestions, setNumQuestions] = useState<number>(20);

    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [dynamicSubjects, setDynamicSubjects] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [creationMode, setCreationMode] = useState<'ai' | 'json'>('ai');
    const [jsonQuestions, setJsonQuestions] = useState('');
    const [isParsingJson, setIsParsingJson] = useState(false);

    useEffect(() => {
        // Fetch sections
        fetch(`${API_BASE_URL}/api/sections`)
            .then(res => res.json())
            .then(data => setAvailableSections(data.map((s: any) => s.name)))
            .catch(err => console.error('Failed to fetch sections', err));
        
        // Fetch existing subjects for suggestions
        fetch(`${API_BASE_URL}/api/subjects`)
            .then(res => res.json())
            .then(data => setDynamicSubjects(data))
            .catch(err => console.error('Failed to fetch subjects', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !year || !branch || !section || !subject || !date || !startTime || !endTime || !numQuestions) {
            toast.error('Please fill in all required fields to create a test.');
            return;
        }

        if (numQuestions < 1 || numQuestions > 60) {
            toast.error('Number of questions must be between 1 and 60 solely.');
            return;
        }

        setIsSubmitting(true);

        try {
            let parsedQuestions = null;
            if (creationMode === 'json') {
                if (!jsonQuestions.trim()) {
                    toast.error("Please provide JSON questions or switch to AI mode.");
                    return;
                }
                try {
                    parsedQuestions = JSON.parse(jsonQuestions);
                    if (!Array.isArray(parsedQuestions)) {
                        throw new Error("JSON must be an array of objects");
                    }
                } catch (err: any) {
                    toast.error(`JSON Error: ${err.message}`);
                    return;
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/tests/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    testName: title,
                    subject: subject,
                    year: year,
                    branch: branch,
                    section: section,
                    numberOfQuestions: creationMode === 'ai' ? numQuestions : (parsedQuestions?.length || 0),
                    startTime: `${date}T${startTime}:00`,
                    endTime: `${date}T${endTime}:00`,
                    createdBy: facultyUsername,
                    questions: parsedQuestions
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create test');
            }

            toast.success(creationMode === 'ai' ? 'AI Test created successfully!' : 'Custom JSON Test created!');

            // Reset form
            setTitle('');
            setYear('');
            setBranch('');
            setSection('');
            setSubject('');
            setDate('');
            setStartTime('');
            setEndTime('');
            setNumQuestions(20);
            setJsonQuestions('');

            onTestCreated();
        } catch (error: any) {
            toast.error(error.message || 'Error connecting to the server');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="shadow-md border border-border/50 animate-fade-in">
            <CardHeader>
                <CardTitle>Create New Test</CardTitle>
                <CardDescription>Configure a new test assigned to a specific class section.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Test Title <span className="text-destructive">*</span></Label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Midterm Evaluation 1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Year <span className="text-destructive">*</span></Label>
                            <Select value={year} onValueChange={setYear} required>
                                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Branch <span className="text-destructive">*</span></Label>
                            <Select value={branch} onValueChange={setBranch} required>
                                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                                <SelectContent>
                                    {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Section <span className="text-destructive">*</span></Label>
                            <Select value={section} onValueChange={setSection} required>
                                <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                                <SelectContent>
                                    {availableSections.length === 0 ? (
                                        <SelectItem value="none" disabled>No sections available</SelectItem>
                                    ) : (
                                        availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Subject <span className="text-destructive">*</span></Label>
                            <Input 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)}
                                list="test-subjects-list"
                                placeholder="Type or select subject"
                                required
                            />
                            <datalist id="test-subjects-list">
                                {dynamicSubjects.length > 0 ? dynamicSubjects.map(s => (
                                    <option key={s.id} value={s.name} />
                                )) : subjectOptions.map(s => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <Label>Date <span className="text-destructive">*</span></Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Start Time <span className="text-destructive">*</span></Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>End Time <span className="text-destructive">*</span></Label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/30">
                        <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Question Configuration</Label>
                        
                        <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as 'ai' | 'json')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-12 bg-secondary/20">
                                <TabsTrigger value="ai" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                                    <BrainCircuit size={16} />
                                    AI Generation
                                </TabsTrigger>
                                <TabsTrigger value="json" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                                    <FileJson size={16} />
                                    JSON Import
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="ai" className="pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-4 bg-secondary/5 p-4 rounded-lg border border-primary/10">
                                    <div className="space-y-2">
                                        <Label>Number of AI Questions <span className="text-destructive">*</span></Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={numQuestions}
                                            onChange={e => setNumQuestions(Number(e.target.value))}
                                            className="bg-background/50"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            The system will use Gemini 2.0 to generate high-quality questions for the selected subject.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="json" className="pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-4 bg-secondary/5 p-4 rounded-lg border border-primary/10">
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-background/30 rounded-lg border border-border/30">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            className="gap-2 h-8 text-[10px] uppercase font-bold text-primary"
                                            onClick={() => {
                                                const sample = [{"question":"What is AI?","option_a":"Artificial Intelligence","option_b":"Apple Ink","option_c":"Auto Index","option_d":"All In","correct_answer":"Artificial Intelligence"}];
                                                const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = 'sample_questions.json';
                                                a.click();
                                                URL.revokeObjectURL(url);
                                                toast.info("Sample JSON downloaded!");
                                            }}
                                        >
                                            <BrainCircuit size={14} /> Sample JSON
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            className="gap-2 h-8 text-[10px] uppercase font-bold text-primary"
                                            onClick={() => {
                                                const promptText = `Generate 10 multiple-choice questions for the subject "${subject || '[SUBJECT]'}". The response must be ONLY a valid JSON array of objects. Each object must have these exact keys: "question", "option_a", "option_b", "option_c", "option_d", "correct_answer". "correct_answer" must exactly match the text of one of the 4 options.`;
                                                navigator.clipboard.writeText(promptText);
                                                toast.success("LLM Prompt copied!");
                                            }}
                                        >
                                            <FileJson size={14} /> LLM Prompt
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <Label>Questions Array (JSON) <span className="text-destructive">*</span></Label>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-[10px] uppercase font-bold text-primary"
                                                onClick={() => setJsonQuestions(JSON.stringify([{"question":"Example Question?","option_a":"A","option_b":"B","option_c":"C","option_d":"D","correct_answer":"A"}], null, 2))}
                                            >
                                                Load Template
                                            </Button>
                                        </div>
                                        <Textarea
                                            placeholder='[{"question": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "..."}]'
                                            className="font-mono text-sm h-48 bg-background/50 resize-none border-primary/20 focus:border-primary/50"
                                            value={jsonQuestions}
                                            onChange={e => setJsonQuestions(e.target.value)}
                                        />
                                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground mt-2 leading-tight">
                                            <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                            <p>JSON must be an array of objects with keys: question, option_a, option_b, option_c, option_d, correct_answer. Number of questions is automatically detected.</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <Button type="submit" className="w-full text-md py-6 mt-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-bold group" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                                {creationMode === 'ai' ? "Generating AI Questions..." : "Deploying Custom Test..."}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <BrainCircuit className="group-hover:scale-110 transition-transform" size={20} />
                                DEPLOY ASSIGNED TEST
                            </span>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
