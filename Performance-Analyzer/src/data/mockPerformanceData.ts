import { ClassPerformanceData } from '../components/training/trainingTypes';

const subjectsList = ['Python', 'Java', 'Operating Systems', 'Databases', 'Computer Networks'];

// --- TEST DATA START ---
// Helper to calculate total and average marks for a student
const calculateStats = (subjects: { subjectName: string; marks: number }[]) => {
    const totalMarks = subjects.reduce((sum, s) => sum + s.marks, 0);
    const averageMarks = Number((totalMarks / subjects.length).toFixed(1));
    return { totalMarks, averageMarks };
};

export const mockPerformanceData: ClassPerformanceData[] = [
    {
        year: "Third Year",
        branch: "CSE",
        section: "A",
        students: [
            {
                rollNumber: "216K1A0501",
                name: "Arjun Reddy (High Performer)",
                subjects: [
                    { subjectName: 'Python', marks: 95 },
                    { subjectName: 'Java', marks: 92 },
                    { subjectName: 'Operating Systems', marks: 89 },
                    { subjectName: 'Databases', marks: 96 },
                    { subjectName: 'Computer Networks', marks: 91 },
                ],
                ...calculateStats([
                    { subjectName: 'Python', marks: 95 },
                    { subjectName: 'Java', marks: 92 },
                    { subjectName: 'Operating Systems', marks: 89 },
                    { subjectName: 'Databases', marks: 96 },
                    { subjectName: 'Computer Networks', marks: 91 },
                ])
            },
            {
                rollNumber: "216K1A0502",
                name: "Priya Sharma (Average)",
                subjects: [
                    { subjectName: 'Python', marks: 75 },
                    { subjectName: 'Java', marks: 78 },
                    { subjectName: 'Operating Systems', marks: 68 },
                    { subjectName: 'Databases', marks: 74 },
                    { subjectName: 'Computer Networks', marks: 70 },
                ],
                ...calculateStats([
                    { subjectName: 'Python', marks: 75 },
                    { subjectName: 'Java', marks: 78 },
                    { subjectName: 'Operating Systems', marks: 68 },
                    { subjectName: 'Databases', marks: 74 },
                    { subjectName: 'Computer Networks', marks: 70 },
                ])
            },
            {
                rollNumber: "216K1A0503",
                name: "Rahul Verma (Low Performer)",
                subjects: [
                    { subjectName: 'Python', marks: 45 },
                    { subjectName: 'Java', marks: 42 },
                    { subjectName: 'Operating Systems', marks: 48 },
                    { subjectName: 'Databases', marks: 40 },
                    { subjectName: 'Computer Networks', marks: 44 },
                ],
                ...calculateStats([
                    { subjectName: 'Python', marks: 45 },
                    { subjectName: 'Java', marks: 42 },
                    { subjectName: 'Operating Systems', marks: 48 },
                    { subjectName: 'Databases', marks: 40 },
                    { subjectName: 'Computer Networks', marks: 44 },
                ])
            },
            // Generate 17 more random students to make 20 total students for the class subset
            ...Array.from({ length: 17 }).map((_, i) => {
                const index = i + 4;
                const avg = 55 + Math.floor(Math.random() * 30); // Random base average between 55-85

                const subjects = subjectsList.map(sub => {
                    // Random deviation bounded realistically
                    const dev = Math.floor(Math.random() * 20) - 10;
                    const mark = Math.max(40, Math.min(95, avg + dev));
                    return { subjectName: sub, marks: mark };
                });

                const stats = calculateStats(subjects);
                return {
                    rollNumber: `216K1A${(index).toString().padStart(4, '0')}`,
                    name: `Student ${index}`,
                    subjects,
                    ...stats
                };
            })
        ]
    }
];
// --- TEST DATA END ---

export const getFilteredClassData = (year: string, branch: string, section: string): ClassPerformanceData | undefined => {
    // Normalize strings for slightly fuzzier matching in mock
    return mockPerformanceData.find(d =>
        d.year.toLowerCase() === year.toLowerCase() &&
        d.branch.toLowerCase() === branch.toLowerCase() &&
        d.section.toLowerCase() === section.toLowerCase()
    );
};
