// Define types for student data
export interface Student {
  id: string;
  name: string;
  roll: string; // hallticket_no
  regulation: string;
  batch: string;
  branch: string;
  performanceLevel: string;
  feedback: string;
}

export interface SubjectMarks {
  subjectName: string;
  marks: number;
  assessmentScore?: number;
  finalScore?: number;
}

export interface StudentPerformance {
  rollNumber: string;
  name: string;
  subjects: SubjectMarks[];
  totalMarks: number;
  averageMarks: number;
}

export interface ClassPerformanceData {
  year: string;
  branch: string;
  section: string;
  students: StudentPerformance[];
}

// New interface for CSV Student Data
export interface CSVStudentData {
  hallticket_no: string;
  regulation: string;
  batch: string;
  branch: string;
  student_name: string;
}

// Year Options
export const yearOptions = ["First Year", "Second Year", "Third Year", "Fourth Year"];

// Regulation options
export const regulationOptions = ["R20", "R19", "R18", "R22"];

// Subject options
export const subjectOptions = ["Python", "Java", "Operating Systems", "Databases", "Computer Networks", "C", "C++"];
