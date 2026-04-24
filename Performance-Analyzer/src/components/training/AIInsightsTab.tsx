import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit } from 'lucide-react';
import { PerformanceFilter } from './PerformanceFilter';
import { ClassInsightsDashboard } from './ClassInsightsDashboard';

export const AIInsightsTab = () => {
    const [year, setYear] = useState('');
    const [branch, setBranch] = useState('');
    const [section, setSection] = useState('');

    const [shouldLoad, setShouldLoad] = useState(false);

    const handleFilterUpdate = (type: 'year' | 'branch' | 'section', value: string) => {
        let newYear = year;
        let newBranch = branch;
        let newSection = section;

        if (type === 'year') { newYear = value; setYear(value); }
        if (type === 'branch') { newBranch = value; setBranch(value); }
        if (type === 'section') { newSection = value; setSection(value); }

        if (newYear && newBranch && newSection && newSection.trim() !== '') {
            setShouldLoad(true);
        } else {
            setShouldLoad(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="mb-2">
                <h3 className="text-xl font-semibold mb-2">Predictive Class Insights</h3>
                <p className="text-sm text-muted-foreground">Select year, branch, and section to generate intelligent predictive analytics.</p>
            </div>

            <PerformanceFilter
                year={year} setYear={(v) => handleFilterUpdate('year', v)}
                branch={branch} setBranch={(v) => handleFilterUpdate('branch', v)}
                section={section} setSection={(v) => handleFilterUpdate('section', v)}
            />

            {shouldLoad ? (
                <ClassInsightsDashboard year={year} branch={branch} section={section.trim()} />
            ) : (
                <Card className="border-dashed bg-background/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <BrainCircuit className="h-8 w-8 text-primary" />
                        </div>
                        <h4 className="text-xl font-medium mb-2">Awaiting Parameters</h4>
                        <p className="text-muted-foreground max-w-md">
                            Please select a Year, Branch, and Section to view predictive analytics, risk distributions, and pinpoint struggling students.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
