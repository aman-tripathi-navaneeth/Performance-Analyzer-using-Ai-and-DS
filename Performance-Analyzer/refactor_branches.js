const fs = require('fs');
const path = require('path');

const basePath = process.argv[2];

const files = [
  { p: 'src/pages/StudentRegistrationPage.tsx', hookPath: '../hooks/useBranches' },
  { p: 'src/pages/StudentLoginPage.tsx', hookPath: '../hooks/useBranches' },
  { p: 'src/components/training/UserManagementForm.tsx', hookPath: '../../hooks/useBranches' },
  { p: 'src/components/training/PerformanceFilter.tsx', hookPath: '../../hooks/useBranches' },
  { p: 'src/components/training/CreateTestForm.tsx', hookPath: '../../hooks/useBranches' },
  { p: 'src/components/training/UploadMarksTab.tsx', hookPath: '../../hooks/useBranches' },
  { p: 'src/components/admin/StudentData.tsx', hookPath: '../../hooks/useBranches' }
];

for (const {p, hookPath} of files) {
  const fullPath = path.join(basePath, p);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace import of branchOptions
  content = content.replace(/branchOptions\s*,\s*/g, '');
  content = content.replace(/,\s*branchOptions/g, '');
  content = content.replace(/{\s*branchOptions\s*}/g, '{}'); // If empty, can ignore safely
  
  // Add hook import at the top
  const firstImport = content.match(/import .* from .*;?/);
  if (firstImport) {
     content = content.replace(firstImport[0], `import { useBranches } from '${hookPath}';\n${firstImport[0]}`);
  }

  // Find the component start. Usually `const ComponentName = (props) => {`
  const compRegex = /(const\s+[A-Za-z0-9_]+\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>\s*{)/;
  if (compRegex.test(content)) {
     content = content.replace(compRegex, `$1\n    const { branchOptions } = useBranches();\n`);
  } else {
     // try function ComponentName
     const funcRegex = /(function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*{)/;
     if (funcRegex.test(content)) {
         content = content.replace(funcRegex, `$1\n    const { branchOptions } = useBranches();\n`);
     }
  }

  fs.writeFileSync(fullPath, content);
  console.log('Processed', p);
}
