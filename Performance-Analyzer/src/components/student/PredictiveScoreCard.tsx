import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface PredictiveScoreCardProps {
  rollNumber: string;
}

export const PredictiveScoreCard = ({ rollNumber }: PredictiveScoreCardProps) => {
  const [prediction, setPrediction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!rollNumber) return;
    const fetchPrediction = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/predictions`);
        if (res.ok) setPrediction(await res.json());
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetchPrediction();
  }, [rollNumber]);

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;
  if (!prediction || prediction.trend === 'insufficient_data') return null;

  const TrendIcon = prediction.trend === 'improving' ? TrendingUp
    : prediction.trend === 'declining' ? TrendingDown : Minus;

  const trendColor = prediction.trend === 'improving' ? 'text-green-500'
    : prediction.trend === 'declining' ? 'text-red-500' : 'text-yellow-500';

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Predictive Performance Score</CardTitle>
        </div>
        <CardDescription>Based on linear regression of your {prediction.attempts_count} test attempts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-primary">{prediction.predicted_score}%</p>
            <p className="text-xs text-muted-foreground mt-1">Predicted next attempt</p>
          </div>
          <div className="text-right space-y-2">
            <div className={`flex items-center gap-1 justify-end font-medium ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="capitalize">{prediction.trend}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Confidence: {prediction.confidence}
            </Badge>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground border-t pt-3">
          <span>Current avg: <strong>{prediction.current_average}%</strong></span>
          <span>Slope: <strong>{prediction.slope > 0 ? '+' : ''}{prediction.slope}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
};
