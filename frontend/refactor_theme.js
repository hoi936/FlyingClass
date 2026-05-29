import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const mappings = [
  // Backgrounds
  { regex: /(?<!dark:)(bg-slate-900)(\/[0-9]+)?/g, replace: 'bg-slate-50$2 dark:bg-slate-900$2' },
  { regex: /(?<!dark:)(bg-slate-800)(\/[0-9]+)?/g, replace: 'bg-white$2 dark:bg-slate-800$2' },
  { regex: /(?<!dark:)(bg-slate-700)(\/[0-9]+)?/g, replace: 'bg-slate-100$2 dark:bg-slate-700$2' },
  
  // Borders
  { regex: /(?<!dark:)(border-slate-700)(\/[0-9]+)?/g, replace: 'border-slate-200$2 dark:border-slate-700$2' },
  { regex: /(?<!dark:)(border-slate-600)(\/[0-9]+)?/g, replace: 'border-slate-300$2 dark:border-slate-600$2' },
  
  // Texts
  { regex: /(?<!dark:)(text-white)(\/[0-9]+)?/g, replace: 'text-slate-900$2 dark:text-white$2' },
  { regex: /(?<!dark:)(text-slate-100)(\/[0-9]+)?/g, replace: 'text-slate-900$2 dark:text-slate-100$2' },
  { regex: /(?<!dark:)(text-slate-200)(\/[0-9]+)?/g, replace: 'text-slate-800$2 dark:text-slate-200$2' },
  { regex: /(?<!dark:)(text-slate-300)(\/[0-9]+)?/g, replace: 'text-slate-700$2 dark:text-slate-300$2' },
  { regex: /(?<!dark:)(text-slate-400)(\/[0-9]+)?/g, replace: 'text-slate-600$2 dark:text-slate-400$2' },
  
  // Hovers
  { regex: /hover:bg-slate-800(\/[0-9]+)?/g, replace: 'hover:bg-slate-100$1 dark:hover:bg-slate-800$1' },
  { regex: /hover:bg-slate-700(\/[0-9]+)?/g, replace: 'hover:bg-slate-200$1 dark:hover:bg-slate-700$1' },
  { regex: /hover:text-white(\/[0-9]+)?/g, replace: 'hover:text-slate-900$1 dark:hover:text-white$1' },
  
  // Special handling for some inputs that should look light in light mode
  { regex: /(?<!dark:)(bg-slate-900)(\/[0-9]+)?(?!.*dark:bg-slate-900)/g, replace: 'bg-white$2 dark:bg-slate-900$2' },
];

const files = getAllFiles(SRC_DIR);

let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  mappings.forEach(({ regex, replace }) => {
    // Avoid double replacing if it's already "bg-white dark:bg-slate-900"
    // The negative lookbehind helps, but let's be safe.
    content = content.replace(regex, replace);
  });
  
  // Clean up any double dark: if created
  content = content.replace(/dark:dark:/g, 'dark:');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Refactored ${modifiedFiles} files.`);
