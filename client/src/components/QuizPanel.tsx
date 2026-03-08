import { useState } from "react";
import { useQuiz, useSubmitQuiz } from "@/hooks/use-episodes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function QuizPanel({ videoId, episodeIndex, onComplete }: { videoId: number, episodeIndex: number, onComplete: () => void }) {
    const { data: quizData, isLoading } = useQuiz(videoId, episodeIndex);
    const submitQuiz = useSubmitQuiz();
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState<{ score: number, passed: boolean, xpEarned?: number } | null>(null);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 bg-card rounded-2xl border border-border h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Generating Quiz...</span>
            </div>
        );
    }

    if (!quizData?.questions?.length) {
        return null;
    }

    const handleSubmit = () => {
        let correct = 0;
        quizData.questions.forEach((q: any) => {
            if (answers[q.id] === q.correctAnswer) correct++;
        });

        const scorePct = (correct / quizData.questions.length) * 100;
        const passed = scorePct >= 60;

        submitQuiz.mutate(
            { videoId, episodeIndex, score: scorePct, passed },
            {
                onSuccess: (res) => {
                    setResults({ score: scorePct, passed, xpEarned: res.xpEarned });
                    setSubmitted(true);
                }
            }
        );
    };

    if (submitted && results) {
        return (
            <Card className="h-full flex flex-col items-center justify-center p-8 bg-card/80 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        {results.passed ? "Quiz Passed! 🎉" : "Quiz Failed 😔"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <p className="text-xl">Score: {results.score}%</p>
                    {results.passed && (
                        <p className="text-green-500 font-bold">You earned +{results.xpEarned} XP!</p>
                    )}
                    {!results.passed && (
                        <p className="text-muted-foreground text-center">You need 60% to pass and unlock the next episode.</p>
                    )}
                    <Button onClick={onComplete} className="mt-4">
                        {results.passed ? "Continue to Next Episode" : "Close and Retry Later"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col bg-card overflow-y-auto">
            <CardHeader>
                <CardTitle>Episode Quiz</CardTitle>
                <p className="text-sm text-muted-foreground">Pass with 60% or higher to unlock the next episode.</p>
            </CardHeader>
            <CardContent className="space-y-6">
                {quizData.questions.map((q: any, i: number) => (
                    <div key={q.id} className="space-y-3">
                        <h4 className="font-medium text-sm leading-snug">{i + 1}. {q.question}</h4>
                        <RadioGroup
                            onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: parseInt(val) }))}
                            value={answers[q.id]?.toString()}
                        >
                            <div className="space-y-2">
                                {q.options.map((opt: string, optIdx: number) => (
                                    <div key={optIdx} className="flex items-center space-x-2 bg-secondary/30 p-2 rounded hover:bg-secondary/50 transition-colors">
                                        <RadioGroupItem value={optIdx.toString()} id={`${q.id}-${optIdx}`} />
                                        <Label htmlFor={`${q.id}-${optIdx}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                                    </div>
                                ))}
                            </div>
                        </RadioGroup>
                    </div>
                ))}

                <Button
                    className="w-full mt-4"
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length < quizData.questions.length || submitQuiz.isPending}
                >
                    {submitQuiz.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Answers
                </Button>
            </CardContent>
        </Card>
    );
}
