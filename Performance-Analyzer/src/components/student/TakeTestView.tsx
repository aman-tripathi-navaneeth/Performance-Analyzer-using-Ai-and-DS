import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface Question {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
}

interface TakeTestViewProps {
    testId: string;
    testName: string;
    studentRoll: string;
    onBack: () => void;
    onComplete: (score: number, total: number) => void;
}

export const TakeTestView = ({ testId, testName, studentRoll, onBack, onComplete }: TakeTestViewProps) => {
    // Permission State
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Proctoring
    const [isProctoringReady, setIsProctoringReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Pagination
    const [currentIndex, setCurrentIndex] = useState(0);

    const requestCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Temporarily shut tracks down so the main proctor hook can cleanly assume control in rendering
            stream.getTracks().forEach(track => track.stop());
            setHasCameraPermission(true);
        } catch (err) {
            toast.error("Camera access is required to start the test. Please allow access in your browser.");
        }
    };

    useEffect(() => {
        if (!hasCameraPermission) return;

        const fetchQuestions = async () => {
            try {
                // 1. Establish Absolute Session Lock Immediately NOW that they accepted permissions
                const lockRes = await fetch(`${API_BASE_URL}/api/tests/${testId}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_roll: studentRoll }),
                });

                if (!lockRes.ok) {
                     const errorData = await lockRes.json();
                     toast.error(errorData.detail || "Test lock enforced. You cannot reattempt this assessment.", { duration: 5000 });
                     onBack(); // Immediately eject 
                     return;
                }

                const response = await fetch(`${API_BASE_URL}/api/tests/${testId}/questions?student_roll=${studentRoll}`);
                if (response.ok) {
                    const data = await response.json();
                    setQuestions(data);
                } else {
                    toast.error("Failed to load test questions.");
                    onBack();
                }
            } catch (err) {
                console.error(err);
                toast.error("Connection error while loading test.");
                onBack();
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, [testId, onBack, studentRoll, hasCameraPermission]);

    const handleOptionSelect = (value: string) => {
        const currentQuestion = questions[currentIndex];
        if (currentQuestion) {
            setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: value
            }));
        }
    };

    // Auto-submit rules (Fullscreen, Visibility, & Proctoring)
    useEffect(() => {
        if (!hasCameraPermission || isLoading || questions.length === 0) return;

        let detectAnimationId: number;
        let detectionModel: cocoSsd.ObjectDetection | null = null;
        let isActive = true;

        const enterFullscreen = async () => {
            try {
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.error("Could not request fullscreen", err);
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isActive) {
                toast.error("You exited fullscreen mode. Your test has been automatically submitted.", { duration: 5000 });
                handleSubmit(true);
            }
        };

        const handleVisibilityChange = () => {
            if ((document.hidden || !document.hasFocus()) && isActive) {
                toast.error("You switched tabs or left the screen. Your test has been automatically submitted.", { duration: 5000 });
                handleSubmit(true);
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isActive) {
                 e.preventDefault();
                 e.returnValue = '';
                 
                 // Fallback sync transmission for absolute force submissions
                 // This natively alters the localStorage file so if the browser is force-killed, the session irrevocably grades and terminates
                 try {
                     const ls = window.localStorage;
                     if(ls) {
                         const existingTokens = JSON.parse(ls.getItem('db_analytics') || "[]");
                         const i = existingTokens.findIndex((a:any) => a.studentRoll === studentRoll && a.testId === testId);
                         if(i !== -1 && existingTokens[i].status === 'in_progress') {
                             existingTokens[i].status = 'completed'; // Forcibly closed
                             ls.setItem('db_analytics', JSON.stringify(existingTokens));
                         }
                     }
                 } catch(e) {}
            }
        };

        const setupProctoring = async () => {
            if (isActive) {
                setIsProctoringReady(true);
            }

            try {
                await enterFullscreen().catch(e => console.warn(e));

                let stream: MediaStream | null = null;
                try {
                    const streamPromise = navigator.mediaDevices.getUserMedia({ video: true });
                    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Camera request timed out")), 5000));
                    stream = await Promise.race([streamPromise, timeoutPromise]);
                } catch (camErr) {
                    // STRICT ENFORCEMENT TRIGGERED 
                    console.error("Camera initialization failed:", camErr);
                    toast.error("Security Violation: Camera access is strictly mandatory. Auto-submitting 0 points.", { duration: 6000 });
                    handleSubmit(true); // Purge Attempt Automatically
                    return; // Halt all further proctor allocations organically
                }

                if (stream && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error(e));
                    
                    Promise.resolve().then(async () => {
                        try {
                            await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
                            await tf.ready();
                            detectionModel = await cocoSsd.load();

                            if (!isActive) return;

                            const detectLoop = async () => {
                                if (!isActive) return;

                                if (videoRef.current && videoRef.current.readyState === 4 && detectionModel) {
                                    try {
                                        const predictions = await detectionModel.detect(videoRef.current);
                                        const personsCount = predictions.filter(p => p.class === 'person' && p.score > 0.50).length;
                                        const isCheating = predictions.some(p =>
                                            (p.class === 'cell phone' || p.class === 'book') && p.score > 0.50
                                        ) || personsCount > 1;

                                        if (isCheating && isActive) {
                                            let reason = "Suspicious object detected (Phone/Book).";
                                            if (personsCount > 1) reason = "Multiple people detected in frame.";
                                            toast.error(`${reason} Your test has been terminated.`, { duration: 5000 });
                                            handleSubmit(true);
                                            isActive = false;
                                            return;
                                        }
                                    } catch (e) {}
                                }
                                if (isActive) {
                                    detectAnimationId = requestAnimationFrame(detectLoop);
                                }
                            };
                            detectLoop();
                        } catch (tfError) {
                            console.error("Failed to load TF model:", tfError);
                        }
                    });
                }
            } catch (err) {
                console.error("Proctoring setup general failure", err);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        setupProctoring();

        return () => {
            isActive = false;
            if (detectAnimationId) cancelAnimationFrame(detectAnimationId);

            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);

            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }

            // Exit fullscreen when component unmounts naturally
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.error(err));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, questions.length, hasCameraPermission]);

    const handleSubmit = async (forceSubmit = false) => {
        // Validation: Ensure all questions are answered, unless auto-submitting due to violation
        if (!forceSubmit && Object.keys(answers).length < questions.length) {
            toast.error("Please answer all questions before submitting.");
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tests/${testId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_roll: studentRoll,
                    answers: answers
                }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(`Test submitted successfully! You scored ${result.score}/${result.total_questions}`);
                onComplete(result.score, result.total_questions);
            } else {
                toast.error("Failed to submit test.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Connection error while submitting.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentQ = questions[currentIndex];
    const isFirstQuestion = currentIndex === 0;
    const isLastQuestion = currentIndex === questions.length - 1;
    const allAnswered = Object.keys(answers).length === questions.length;

    // --- PRE-TEST CAMERA GATEWAY ---
    if (!hasCameraPermission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
                <Card className="w-full max-w-lg shadow-xl animate-fade-in border border-primary/20">
                    <CardHeader className="bg-secondary/5 rounded-t-xl pb-6 border-b">
                        <div className="flex justify-center mb-4">
                            <ShieldAlert className="w-12 h-12 text-primary" />
                        </div>
                        <CardTitle className="text-2xl text-primary font-jetbrains">Security Check Required</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 text-left text-sm text-muted-foreground">
                        <p className="text-base text-foreground font-medium">To maintain academic integrity, this test requires strict proctoring. You must grant camera access to begin.</p>
                        
                        <div className="bg-secondary/20 p-4 rounded-lg space-y-2">
                            <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">Rules of Conduct:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Your face must be clearly visible in the camera frame at all times.</li>
                                <li>No mobile phones, books, or secondary devices are permitted.</li>
                                <li>Multiple people detected in the frame will trigger a termination.</li>
                                <li><strong className="text-destructive">Exiting fullscreen mode, switching tabs, or minimizing the window will result in an immediate automatic submission of your exam.</strong></li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-secondary/5 rounded-b-xl border-t p-6">
                        <Button variant="outline" onClick={onBack} className="w-32">Cancel</Button>
                        <Button onClick={requestCameraPermission} className="w-48 bg-primary">Grant Access & Start</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-screen bg-background pb-12 pt-4 px-4 md:px-8">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`fixed bottom-6 right-6 w-48 h-36 object-cover rounded-xl shadow-2xl border-4 border-primary/50 z-50 transform -scale-x-100 transition-opacity duration-300 ${(isLoading || !isProctoringReady) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            />

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-6 min-h-[60vh]">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <div className="text-center space-y-2">
                        <p className="text-lg font-medium text-foreground">
                            Loading test questions...
                        </p>
                    </div>
                </div>
            ) : questions.length === 0 ? (
                <div className="text-center p-12">
                    <p className="text-muted-foreground mb-4">No questions found for this test.</p>
                    <Button variant="outline" onClick={onBack}>Go Back</Button>
                </div>
            ) : (
                <Card className="w-full max-w-4xl mx-auto shadow-lg animate-fade-in border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-secondary/5">
                        <div className="space-y-1">
                            {/* FORCE EXIT TO TRIGGER AUTO SUBMIT */}
                            <Button variant="ghost" size="sm" onClick={() => handleSubmit(true)} className="mb-2 -ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Exit Test (Auto-Submits)
                            </Button>
                            <CardTitle className="text-2xl text-primary font-jetbrains">{testName}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2 bg-background p-2 px-4 rounded-full border shadow-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                                Question {currentIndex + 1} of {questions.length}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 pb-8 px-6 md:px-12">
                        <div className="mb-8 p-4 bg-secondary/10 rounded-lg border border-border/50">
                            <h3 className="text-lg font-medium leading-relaxed">
                                <span className="text-primary mr-2">{currentIndex + 1}.</span>
                                {currentQ?.question}
                            </h3>
                        </div>

                        <RadioGroup
                            value={currentQ ? (answers[currentQ.id] || "") : ""}
                            onValueChange={handleOptionSelect}
                            className="space-y-4"
                        >
                            {currentQ && [
                                { id: 'a', text: currentQ.option_a },
                                { id: 'b', text: currentQ.option_b },
                                { id: 'c', text: currentQ.option_c },
                                { id: 'd', text: currentQ.option_d }
                            ].map((opt) => (
                                <div key={opt.id} className={`
                                    flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer
                                    ${answers[currentQ.id] === opt.text ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-secondary/20 hover:border-border'}
                                `}
                                    onClick={() => handleOptionSelect(opt.text)}
                                >
                                    <RadioGroupItem value={opt.text} id={`option-${opt.id}`} />
                                    <Label htmlFor={`option-${opt.id}`} className="flex-1 cursor-pointer text-base">
                                        {opt.text}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6 bg-secondary/5">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={isFirstQuestion}
                            className="w-24"
                        >
                            Previous
                        </Button>

                        <div className="flex space-x-2">
                            {Object.keys(answers).length > 0 && (
                                <span className="text-sm text-muted-foreground flex items-center justify-center mr-4">
                                    {Object.keys(answers).length} / {questions.length} answered
                                </span>
                            )}

                            {!isLastQuestion ? (
                                <Button
                                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                    className="w-24"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    disabled={!allAnswered || isSubmitting}
                                    className={`w-36 ${allAnswered ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                                >
                                    {isSubmitting ? "Submitting..." : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Submit Test
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
};
