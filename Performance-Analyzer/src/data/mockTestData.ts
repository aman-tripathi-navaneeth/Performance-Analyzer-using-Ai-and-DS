export interface AssignedTest {
    id: string;
    title: string;
    year: string;
    branch: string;
    section: string;
    subject: string;
    date: string;
    startTime: string;
    endTime: string;
    createdBy: string;
}

// In-memory array for our mock session.
// Re-initializing won't persist across hard reloads, but serves the UI needs for now.
export let mockTestDatabase: AssignedTest[] = [];

export const addMockTest = (test: Omit<AssignedTest, 'id'>) => {
    const newTest: AssignedTest = {
        ...test,
        id: `test-${Date.now()}`
    };
    // Push to the beginning to show newest first
    mockTestDatabase = [newTest, ...mockTestDatabase];
    return newTest;
};

export const getTestsByFaculty = (facultyUsername: string) => {
    return mockTestDatabase.filter(t => t.createdBy === facultyUsername);
};

export const getAvailableTestsForStudent = (year: string, branch: string, section: string) => {
    // Return tests that match the student's cohort
    return mockTestDatabase.filter(t =>
        t.year.toLowerCase() === year.toLowerCase() &&
        t.branch.toLowerCase() === branch.toLowerCase() &&
        t.section.toLowerCase() === section.toLowerCase()
    );
};
