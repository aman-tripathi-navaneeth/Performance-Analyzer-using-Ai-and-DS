import { getCollection, insertItem, updateItem, deleteItem, saveCollection } from './storage';
import { API_BASE_URL } from '../config';

const originalFetch = window.fetch;

/**
 * Mock Backend Interceptor
 * 
 * Hijacks fetch calls to API_BASE_URL and responds directly using LocalStorage/Cookies.
 * This completely eliminates the need for the Python SQLite backend.
 */
export const initMockBackend = () => {
    const hashPassword = (password: string) => {
        // Simple hash simulation for mock environment
        return btoa(password).split('').reverse().join('');
    };

    console.log("🚀 Initializing Client-Side Mock Backend (Local Serverless Mode)");

    // Seed default data
    const admins = getCollection<any>('db_admins');
    if (!admins.find(a => a.username === 'admin')) {
        insertItem('db_admins', { username: 'admin', password: 'admin123' });
    }

    const teachers = getCollection<any>('db_teachers');
    if (!teachers.find(t => t.id === 'Aman')) {
        insertItem('db_teachers', { id: 'Aman', username: 'Aman', name: 'Aman', branch: 'CSE', password: 'aman@123', role: 'faculty' });
    }
    if (!teachers.find(t => t.id === 'FL-001')) {
        insertItem('db_teachers', { id: 'FL-001', name: 'John Doe', branch: 'CSE', password: 'password123', role: 'faculty' });
    }

    const students = getCollection<any>('db_students');
    if (!students.find(s => s.rollNumber === '226K1A0545')) {
        insertItem('db_students', { rollNumber: '226K1A0545', name: 'Aman', password: 'aman', status: 'approved', year: '3rd Year', branch: 'CSE', section: 'A' });
    }
    if (getCollection('db_sections').length === 0) {
        saveCollection('db_sections', [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]);
    }
    if (getCollection('db_branches').length === 0) {
        saveCollection('db_branches', [{ id: '1', name: 'CSE' }, { id: '2', name: 'ECE' }]);
    }

    const generateGeminiQuestions = async (subject: string, numQuestions: number) => {
        try {
            console.log(`Pinging Gemini API Native Web for ${numQuestions} questions on ${subject}...`);
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const prompt = `Generate exactly ${numQuestions} multiple-choice questions for the academic subject "${subject}". 
The response must be ONLY a raw JSON array. Do not include markdown \`\`\`json wrappers. 
Each JSON object must have strictly these 6 keys: "question", "option_a", "option_b", "option_c", "option_d", "correct_answer". 
The "correct_answer" field MUST EXACTLY match the text of one of the 4 options exactly. No other text.`;

            const res = await originalFetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!res.ok) throw new Error(`Gemini rejected request: ${res.status}`);
            
            const data = await res.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!textContent) throw new Error("Recieved empty content chunk from AI");
            
            let parsed = null;
            try {
                parsed = JSON.parse(textContent.trim().replace(/^```json/i, '').replace(/```$/i, ''));
            } catch (e) {
                parsed = JSON.parse(textContent);
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((q: any, i: number) => ({
                    id: `ai-${Date.now()}-${i}`,
                    ...q
                }));
            }
        } catch (e) {
            console.error("Gemini Native Execution Failed:", e);
        }
        return null;
    };

    window.fetch = async (...args) => {
        const [resource, config] = args;
        const url = typeof resource === 'string' 
            ? resource 
            : (resource instanceof URL ? resource.toString() : (resource as Request).url);
        
        // If not calling our API base url, just pass through (e.g., loading assets)
        if (!url.startsWith(API_BASE_URL) && !url.includes('/api/')) {
            return originalFetch(...args);
        }

        const method = config?.method || 'GET';
        let body: any = null;
        if (config?.body) {
            try {
                body = JSON.parse(config.body as string);
            } catch (e) {}
        }

        console.log(`[Mock API] ${method} ${url}`, body || '');

        const createResponse = (data: any, status = 200) => {
            return new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json' }
            });
        };

        const createError = (detail: string, status = 400) => {
            return new Response(JSON.stringify({ detail }), {
                status,
                headers: { 'Content-Type': 'application/json' }
            });
        };

        // --- AUTH ROUTES ---
        if (url.includes('/api/admin/login') && method === 'POST') {
            const admins = getCollection<any>('db_admins');
            const admin = admins.find(a => a.username === body.username && a.password === body.password);
            if (admin) return createResponse({ admin });
            return createError('Invalid admin credentials', 401);
        }

        if (url.includes('/api/teachers/login') && method === 'POST') {
            const teachers = getCollection<any>('db_teachers');
            const teacher = teachers.find(t => (t.id === body.facultyId || t.username === body.facultyId) && t.password === body.password);
            if (teacher) return createResponse({ faculty: teacher });
            return createError('Invalid faculty credentials', 401);
        }

        if (url.includes('/api/students/login') && method === 'POST') {
            const students = getCollection<any>('db_students');
            const student = students.find(s => s.rollNumber === body.rollNumber && (s.password === body.password || s.password === hashPassword(body.password)));
            if (student) {
                if (student.status === 'pending') return createError('Registration pending admin approval');
                return createResponse({ 
                    student: {
                        ...student,
                        role: 'student',
                        username: student.name
                    } 
                });
            }
            return createError('Invalid Roll Number or Password', 401);
        }

        if (url.includes('/api/students/register') && method === 'POST') {
            const students = getCollection<any>('db_students');
            if (students.find(s => s.rollNumber === body.rollNumber)) {
                return createError('Student already exists');
            }
            const newStudent = { ...body, status: 'pending', id: Date.now().toString() };
            insertItem('db_students', newStudent);
            return createResponse({ message: 'Registration submitted successfully', student: newStudent });
        }

        // --- RESOURCE ROUTES (GET) ---
        if (url.includes('/api/sections') && method === 'GET') {
            return createResponse(getCollection('db_sections'));
        }

        if (url.includes('/api/sections/add') && method === 'POST') {
            const newItem = { id: Date.now().toString(), name: body.name };
            insertItem('db_sections', newItem);
            return createResponse(newItem);
        }

        if (url.includes('/api/sections/') && method === 'DELETE') {
            const sectionName = url.split('/').pop();
            const sections = getCollection<any>('db_sections');
            saveCollection('db_sections', sections.filter(s => s.name !== sectionName));
            return createResponse({ message: 'Section Deleted' });
        }

        if (url.endsWith('/api/branches') && method === 'GET') {
            return createResponse(getCollection('db_branches'));
        }

        if (url.endsWith('/api/branches') && method === 'POST') {
            const newItem = { id: Date.now().toString(), name: body.name, full_name: body.full_name || body.name };
            insertItem('db_branches', newItem);
            return createResponse(newItem);
        }

        if (url.includes('/api/branches/') && method === 'DELETE') {
            const branchId = url.split('/').pop();
            if (branchId) deleteItem('db_branches', { id: branchId });
            return createResponse({ message: 'Branch Deleted' });
        }

        if (url.includes('/api/admin/pending-students/bulk-approve') && method === 'POST') {
            const students = getCollection<any>('db_students');
            const rollNumbers = body.rollNumbers || [];
            const updated = students.map((s: any) => {
                if (rollNumbers.includes(s.rollNumber)) {
                    return { ...s, status: 'approved' };
                }
                return s;
            });
            saveCollection('db_students', updated);
            return createResponse({ message: `Successfully approved ${rollNumbers.length} students` });
        }

        if (url.includes('/api/admin/pending-students/bulk-reject') && method === 'POST') {
            const students = getCollection<any>('db_students');
            const rollNumbers = body.rollNumbers || [];
            const filtered = students.filter((s: any) => !rollNumbers.includes(s.rollNumber));
            saveCollection('db_students', filtered);
            return createResponse({ message: `Successfully rejected ${rollNumbers.length} registrations` });
        }

        if (url.includes('/api/admin/pending-students') && method === 'GET') {
            const students = getCollection<any>('db_students');
            return createResponse(students.filter(s => s.status === 'pending'));
        }

        if (url.endsWith('/api/students') && method === 'GET') {
            const students = getCollection<any>('db_students');
            return createResponse(students.filter(s => s.status === 'approved'));
        }

        // --- DASHBOARD REALTIME ENDPOINTS ---
        
        // Announcements
        if (url.includes('/api/announcements') && method === 'POST') {
            const newAnnouncement = { ...body, id: Date.now().toString(), timestamp: new Date().toISOString() };
            insertItem('db_announcements', newAnnouncement);
            return createResponse({ message: 'Broadcast successful', announcement: newAnnouncement });
        }

        if (url.includes('/api/announcements') && method === 'GET') {
            const allAnnouncements = getCollection<any>('db_announcements').reverse();
            
            try {
                const urlObj = new URL(url, API_BASE_URL); // Ensure absolute URL for parsing
                const year = urlObj.searchParams.get('year');
                const branch = urlObj.searchParams.get('branch');
                
                if (year && branch) {
                    const filtered = allAnnouncements.filter(a => 
                        (a.targetYear === 'All' || a.targetYear === year) && 
                        (a.targetBranch === 'All' || a.targetBranch === branch)
                    );
                    return createResponse(filtered);
                }
            } catch (e) {
                console.warn("Announcement URL parsing failed", e);
            }

            return createResponse(allAnnouncements);
        }

        // Tests
        if (url.includes('/api/tests/create') && method === 'POST') {
            let testQuestions = body.questions;
            
            // If AI generation was requested, intercept locally to replace missing Python backend loop
            if (!testQuestions || testQuestions.length === 0) {
                 const num = Number(body.numberOfQuestions) || 10;
                 const subjectString = body.subject || "General Computer Science";
                 
                 const generatedQuestions = await generateGeminiQuestions(subjectString, num);
                 
                 if (generatedQuestions && Array.isArray(generatedQuestions)) {
                     testQuestions = generatedQuestions;
                     console.log(`Successfully generated ${testQuestions.length} real AI queries!`);
                 } else {
                     console.warn("Gemini AI failed, deploying mock fallback questions instead!");
                     testQuestions = Array.from({ length: num }, (_, i) => ({
                          id: `q-${Date.now()}-${i}`,
                          question: `[Fallback Mock] Example question ${i + 1} for ${subjectString}?`,
                          option_a: 'Option A',
                          option_b: 'Option B',
                          option_c: 'Option C',
                          option_d: 'Option D',
                          correct_answer: Math.random() > 0.5 ? 'Option A' : 'Option C'
                     }));
                 }
            }

            // CRITICAL: Normalize all questions to ensure consistent field names and IDs.
            // Gemini/LLMs may return varying field names (question_text, questionText, text, etc.)
            // The UI expects: id, question, option_a, option_b, option_c, option_d, correct_answer
            if (Array.isArray(testQuestions)) {
                testQuestions = testQuestions.map((q: any, i: number) => ({
                    id: q.id || `q-${Date.now()}-${i}`,
                    question: q.question || q.question_text || q.questionText || q.text || q.prompt || `Question ${i + 1}`,
                    option_a: q.option_a || q.optionA || q.option_1 || q.a || q.options?.[0] || 'Option A',
                    option_b: q.option_b || q.optionB || q.option_2 || q.b || q.options?.[1] || 'Option B',
                    option_c: q.option_c || q.optionC || q.option_3 || q.c || q.options?.[2] || 'Option C',
                    option_d: q.option_d || q.optionD || q.option_4 || q.d || q.options?.[3] || 'Option D',
                    correct_answer: q.correct_answer || q.correctAnswer || q.answer || q.correct_option || q.correct || ''
                }));
            }

            const newTest = { 
                ...body, 
                id: Date.now().toString(), 
                title: body.testName || body.title || 'Untitled Test',
                createdAt: new Date().toISOString(),
                questions: testQuestions 
            };
            insertItem('db_tests', newTest);
            console.log(`[Mock API] Test created with ${testQuestions?.length || 0} questions, ID: ${newTest.id}`);
            return createResponse({ message: 'Test created natively', test: newTest });
        }
        
        if (url.includes('/api/tests/faculty') && method === 'GET') {
            const tests = getCollection<any>('db_tests');
            return createResponse(tests);
        }

        if (url.includes('/api/tests/student') && method === 'GET') {
            const allTests = getCollection<any>('db_tests');
            const allAnalytics = getCollection<any>('db_analytics');

            try {
                const urlObj = new URL(url, API_BASE_URL);
                const year = urlObj.searchParams.get('year');
                const branch = urlObj.searchParams.get('branch');
                const section = urlObj.searchParams.get('section');
                const studentRoll = urlObj.searchParams.get('student_roll');
                
                if (year && branch && section) {
                    let targetTests = allTests.filter(t => 
                        String(t.year).trim() === String(year).trim() && 
                        String(t.branch).trim().toLowerCase() === String(branch).trim().toLowerCase() && 
                        String(t.section).trim().toLowerCase() === String(section).trim().toLowerCase()
                    );

                    // Strictly strip any tests the student has already started or completed
                    if (studentRoll) {
                        targetTests = targetTests.filter(t => {
                            const attemptExists = allAnalytics.find(a => a.studentRoll === studentRoll && a.testId === t.id);
                            return !attemptExists; // Return only tests never opened
                        });
                    }

                    return createResponse(targetTests);
                }
            } catch (e) {
                console.warn("Student test URL parsing failed", e);
            }
            return createResponse(allTests);
        }

        // Test Enforced Session Start
        if (url.match(/\/api\/tests\/.*\/start/) && method === 'POST') {
            const parts = url.split('/');
            const testIdIndex = parts.indexOf('tests') + 1;
            const testId = parts[testIdIndex];

            const existingAnalytics = getCollection<any>('db_analytics');
            const preventDuplicate = existingAnalytics.find(a => a.studentRoll === body.student_roll && a.testId === testId);
            
            if (preventDuplicate) {
                 return createError('You have already attempted or forcibly exited this test.', 403);
            }

            const studentStats = getCollection<any>('db_students').find(s => s.rollNumber === body.student_roll);
            const test = getCollection<any>('db_tests').find(t => t.id === testId);

            existingAnalytics.push({
                 id: `attempt-${Date.now()}`,
                 studentRoll: body.student_roll,
                 year: studentStats?.year || test?.year || "Unknown",
                 branch: studentStats?.branch || test?.branch || "Unknown",
                 section: studentStats?.section || test?.section || "Unknown",
                 source: 'Exam', // Classify as standard exam execution dynamically
                 subject: test?.title || test?.subject || "Online Test",
                 score: 0,
                 max_score: test?.questions?.length || 0,
                 testId: testId,
                 status: 'in_progress',
                 date: new Date().toISOString()
            });

            saveCollection('db_analytics', existingAnalytics);
            return createResponse({ message: 'Session securely started.' });
        }

        // Test Submission and Auto-Grading Interceptor
        if (url.match(/\/api\/tests\/.*\/submit/) && method === 'POST') {
            const parts = url.split('/');
            const testIdIndex = parts.indexOf('tests') + 1;
            const testId = parts[testIdIndex];

            const test = getCollection<any>('db_tests').find(t => t.id === testId);
            let score = 0;
            if (test && test.questions && body.answers) {
                 test.questions.forEach((q: any) => {
                     if (body.answers[q.id] === q.correct_answer) score++;
                 });
            }

            const existingAnalytics = getCollection<any>('db_analytics');
            const attemptIndex = existingAnalytics.findIndex(a => a.studentRoll === body.student_roll && a.testId === testId);

            if (attemptIndex !== -1) {
                existingAnalytics[attemptIndex].score = score;
                existingAnalytics[attemptIndex].status = 'completed';
                existingAnalytics[attemptIndex].date = new Date().toISOString();
                saveCollection('db_analytics', existingAnalytics);
            }

            return createResponse({ message: 'Test submitted', score, total_questions: test?.questions?.length || 0 });
        }

        if (url.match(/\/api\/tests\/.*\/questions/) && method === 'GET') {
            try {
                const cleanUrl = url.split('?')[0];
                const parts = cleanUrl.split('/');
                const testIdIndex = parts.indexOf('tests') + 1;
                const testId = parts[testIdIndex];
                
                console.log(`[Mock API] Fetching questions for test ID: ${testId}`);
                const test = getCollection<any>('db_tests').find(t => t.id === testId);
                if (test && test.questions && test.questions.length > 0) {
                    // Normalize field names on read to handle legacy/inconsistent data
                    const normalized = test.questions.map((q: any, i: number) => ({
                        id: q.id || `q-${testId}-${i}`,
                        question: q.question || q.question_text || q.questionText || q.text || q.prompt || `Question ${i + 1}`,
                        option_a: q.option_a || q.optionA || q.option_1 || q.a || q.options?.[0] || 'Option A',
                        option_b: q.option_b || q.optionB || q.option_2 || q.b || q.options?.[1] || 'Option B',
                        option_c: q.option_c || q.optionC || q.option_3 || q.c || q.options?.[2] || 'Option C',
                        option_d: q.option_d || q.optionD || q.option_4 || q.d || q.options?.[3] || 'Option D',
                        correct_answer: q.correct_answer || q.correctAnswer || q.answer || q.correct_option || q.correct || ''
                    }));
                    console.log(`[Mock API] Returning ${normalized.length} normalized questions for test ${testId}`);
                    return createResponse(normalized);
                } else {
                    console.warn(`[Mock API] No questions found for test ${testId}. Test exists: ${!!test}, Questions array: ${test?.questions?.length ?? 'undefined'}`);
                }
            } catch (e) {
                console.error('[Mock API] Error in questions endpoint:', e);
            }
            return createResponse([]);
        }

        // Excel Marks JSON Upload
        if (url.includes('/api/upload-marks/json') && method === 'POST') {
            const existing = getCollection<any>('db_analytics');
            saveCollection('db_analytics', [...existing, ...(body.analytics || [])]);
            return createResponse({ message: 'Marks uploaded successfully', data: body.analytics });
        }

        // Analytics Performance Retrieval Pipeline
        if (url.match(/\/api\/students\/.*\/analytics/) && method === 'GET') {
            const parts = url.split('/');
            const studentIdx = parts.indexOf('students') + 1;
            const roll = parts[studentIdx];
            
            const allAnalytics = getCollection<any>('db_analytics');
            const filtered = allAnalytics.filter(a => String(a.studentRoll) === String(roll));
            return createResponse(filtered);
        }

        if (url.match(/\/api\/students\/.*\/report\/pdf/) && method === 'GET') {
            // In a real app this generates a binary PDF.
            // In our mock, we return a successful response to prevent UI errors.
            // The UI will receive this and we can handle it or just mock success.
            return new Response(new Blob(["Mock PDF Content"], { type: 'application/pdf' }), {
                status: 200,
                headers: { 'Content-Disposition': 'attachment; filename="report.pdf"' }
            });
        }

        if (url.includes('/api/performance/class') && method === 'GET') {
            const urlObj = new URL(url, API_BASE_URL);
            const yearStr = urlObj.searchParams.get('year');
            const branchStr = urlObj.searchParams.get('branch');
            const sectionStr = urlObj.searchParams.get('section');

            const allAnalytics = getCollection<any>('db_analytics');

            const filteredArgs = allAnalytics.filter(a => 
                 (!yearStr || String(a.year).trim() === String(yearStr).trim()) &&
                 (!branchStr || String(a.branch).trim().toLowerCase() === String(branchStr).trim().toLowerCase()) &&
                 (!sectionStr || String(a.section).trim().toLowerCase() === String(sectionStr).trim().toLowerCase())
            );

            const studentMap = new Map();
            filteredArgs.forEach(record => {
                 const roll = String(record.studentRoll);
                 if (!studentMap.has(roll)) {
                     studentMap.set(roll, {
                         rollNumber: roll,
                         name: `Student ${roll}`,
                         subjects: [],
                         totalMarks: 0,
                         averageMarks: 0
                     });
                 }
                 const st = studentMap.get(roll);
                 st.subjects.push({
                     subjectName: record.subject || record.source || "Unknown Subject",
                     marks: Number(record.score) || 0,
                     finalScore: Number(record.score) || 0
                 });
                 st.totalMarks += (Number(record.score) || 0);
                 st.averageMarks = st.totalMarks / st.subjects.length;
            });

            return createResponse({
                year: yearStr,
                branch: branchStr,
                section: sectionStr,
                students: Array.from(studentMap.values())
            });
        }

        // --- ADMIN / STATS ---
        if (url.includes('/api/admin/stats') && method === 'GET') {
            const facultyCount = getCollection('db_teachers').length;
            const studentCount = getCollection('db_students').length;
            const testCount = getCollection('db_tests').length;
            
            const analytics = getCollection<any>('db_analytics');
            let totalScore = 0;
            let totalMax = 0;
            analytics.forEach(a => {
                totalScore += Number(a.score) || 0;
                totalMax += Number(a.max_score) || 0;
            });
            const avg_system_score = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

            return createResponse({
                total_faculty: facultyCount,
                total_students: studentCount,
                total_tests: testCount,
                avg_system_score: avg_system_score
            });
        }

        // --- TPO PASSWORD UPDATE ---
        if (url.includes('/api/admin/tpo/password') && method === 'PUT') {
            const teachers = getCollection<any>('db_teachers');
            let found = false;
            const updated = teachers.map((t: any) => {
                if (t.role === 'tpo') {
                    found = true;
                    return { ...t, password: body.newPassword };
                }
                return t;
            });
            if (found) {
                saveCollection('db_teachers', updated);
                return createResponse({ message: 'TPO password updated successfully' });
            }
            return createError('No TPO account found. Promote a faculty member to TPO first.', 404);
        }

        // --- JOBS & PLACEMENTS ---
        if (url.includes('/api/jobs') && !url.includes('/eligible-students') && method === 'POST') {
             const newJob = { ...body, id: Date.now().toString(), posted_at: new Date().toISOString() };
             insertItem('db_jobs', newJob);
             return createResponse({ message: 'Job posted successfully', job: newJob });
        }

        // Student-specific job fetching — filters by year/branch from student record
        if (url.match(/\/api\/student\/.*\/jobs/) && method === 'GET') {
            const parts = url.split('/');
            const studentIdx = parts.indexOf('student') + 1;
            const rollNumber = parts[studentIdx];
            
            const student = getCollection<any>('db_students').find(s => s.rollNumber === rollNumber);
            const allJobs = getCollection<any>('db_jobs');
            
            if (student) {
                const filtered = allJobs.filter(j => {
                    const yearMatch = !j.year || j.year === 'All' || j.year === student.year;
                    const branchMatch = !j.branch || j.branch === 'All' || String(j.branch).toLowerCase() === String(student.branch).toLowerCase();
                    return yearMatch && branchMatch;
                });
                return createResponse(filtered);
            }
            return createResponse(allJobs);
        }

        // Eligible students for a job
        if (url.match(/\/api\/jobs\/.*\/eligible-students/) && method === 'GET') {
            const parts = url.split('/');
            const jobIdx = parts.indexOf('jobs') + 1;
            const jobId = parts[jobIdx];
            
            const job = getCollection<any>('db_jobs').find(j => j.id === jobId);
            const students = getCollection<any>('db_students').filter(s => s.status === 'approved');
            
            if (!job) return createResponse([]);
            
            const eligible = students.filter(s => {
                const yearMatch = !job.year || job.year === 'All' || job.year === s.year;
                const branchMatch = !job.branch || job.branch === 'All' || String(job.branch).toLowerCase() === String(s.branch).toLowerCase();
                return yearMatch && branchMatch;
            });
            
            return createResponse(eligible.map(s => ({
                name: s.name || s.rollNumber,
                rollNumber: s.rollNumber,
                branch: s.branch,
                section: s.section,
                year: s.year
            })));
        }

        if ((url.endsWith('/api/jobs') || url.match(/\/api\/jobs\?/)) && method === 'GET') {
            return createResponse(getCollection('db_jobs'));
        }

        if (url.includes('/api/jobs/') && method === 'DELETE') {
            const jobId = url.split('/').pop();
            if (jobId) deleteItem('db_jobs', { id: jobId });
            return createResponse({ message: 'Job Deleted Successfully' });
        }

        // --- DASHBOARD DATA SAFE FALLBACKS ---
        if (url.includes('/analytics') && !url.includes('/profile') && !url.includes('/generate') && !url.includes('/leaderboard')) {
             if (method === 'GET') return createResponse([]);
        }

        if (url.includes('/goals') || url.includes('/test-history')) {
            if (method === 'GET') return createResponse([]);
        }

        if (url.includes('/api/tests') && method === 'GET' && !url.includes('/api/tests/faculty') && !url.includes('/api/tests/student') && !url.includes('/questions/all')) {
            return createResponse([]);
        }

        if (url.includes('/api/analytics/profile') || url.includes('/api/analytics/generate')) {
            if (method === 'GET') return createResponse({});
            if (method === 'POST') return createResponse({ profile: null });
        }
        
        if (url.includes('/api/analytics/leaderboard') && method === 'GET') {
            return createResponse([]);
        }
        
        if (url.includes('/api/students') && url.includes('/predictions') && method === 'GET') {
             return createResponse({ trend: 'insufficient_data' });
        }

        // Generic catch-all for anything missed
        if (method === 'GET' && (url.includes('/analytics') || url.includes('/goals'))) {
            return createResponse([]);
        }

        if (url.includes('/api/teachers') && method === 'GET' && !url.includes('login')) {
            return createResponse(getCollection('db_teachers'));
        }

        // --- DYNAMIC/PARAMETRIC ROUTES ---
        // Just mock generic success for any POST/PUT/DELETE to fake a fully working system
        if (method === 'POST') {
             // Fake generating an ID
             const genericItem = { ...body, id: Date.now().toString() };
             return createResponse(genericItem);
        }
        if (method === 'PUT') {
            return createResponse({ message: 'Updated successfully', ...body });
        }
        if (method === 'DELETE') {
            return createResponse({ message: 'Deleted successfully' });
        }

        // Default empty array for unknown GET requests (prevents UI from crashing)
        return createResponse([]);
    };
};
