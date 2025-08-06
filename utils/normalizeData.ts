/**
 * Utility functions for normalizing and cleaning data
 */

/**
 * Normalizes program names to standard format for timetable matching
 * @param program - Raw program name from Excel
 * @returns Normalized program name
 */
export function normalizeProgram(program: string): string {
  console.log(`🔄 Normalizing program: "${program}"`);
  
  if (!program) return '';
  
  const normalized = program.toLowerCase().trim();
  
  // Define normalization rules
  const programMappings: { [key: string]: string } = {
    // B.Tech CSE variations
    'btech cse': 'B.Tech CSE',
    'b.tech cse': 'B.Tech CSE',
    'btech computer science': 'B.Tech CSE',
    'b.tech computer science': 'B.Tech CSE',
    'bachelor of technology cse': 'B.Tech CSE',
    'bachelor of technology computer science': 'B.Tech CSE',
    'cse': 'B.Tech CSE',
    'computer science engineering': 'B.Tech CSE',
    
    // B.Tech IT variations
    'btech it': 'B.Tech IT',
    'b.tech it': 'B.Tech IT',
    'btech information technology': 'B.Tech IT',
    'b.tech information technology': 'B.Tech IT',
    'bachelor of technology it': 'B.Tech IT',
    'bachelor of technology information technology': 'B.Tech IT',
    'it': 'B.Tech IT',
    'information technology': 'B.Tech IT',
    
    // BCA variations
    'bca': 'BCA',
    'bachelor of computer applications': 'BCA',
    'bachelor in computer applications': 'BCA',
    
    // B.Sc CS variations
    'bsc cs': 'B.Sc CS',
    'b.sc cs': 'B.Sc CS',
    'bsc computer science': 'B.Sc CS',
    'b.sc computer science': 'B.Sc CS',
    'bachelor of science cs': 'B.Sc CS',
    'bachelor of science computer science': 'B.Sc CS',
    'bsc': 'B.Sc CS', // Assuming default is CS
    'b.sc': 'B.Sc CS'
  };
  
  // Check for exact matches first
  if (programMappings[normalized]) {
    console.log(`✅ Normalized "${program}" to "${programMappings[normalized]}"`);
    return programMappings[normalized];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(programMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log(`✅ Normalized "${program}" to "${value}" (partial match)`);
      return value;
    }
  }
  
  // If no match found, return original with proper casing
  const fallback = program
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  console.log(`⚠️ No normalization rule found for "${program}", using fallback: "${fallback}"`);
  return fallback;
}

/**
 * Normalizes section names to standard format
 * @param section - Raw section name
 * @returns Normalized section name
 */
export function normalizeSection(section: string): string {
  if (!section) return '';
  
  // Convert to uppercase and remove extra spaces
  const normalized = section.trim().toUpperCase();
  
  // Handle common variations
  if (normalized.match(/^[A-Z]$/)) {
    return `Section ${normalized}`;
  }
  
  if (normalized.startsWith('SEC')) {
    return normalized.replace('SEC', 'Section');
  }
  
  if (!normalized.startsWith('SECTION')) {
    return `Section ${normalized}`;
  }
  
  return normalized;
}

/**
 * Normalizes semester to standard format
 * @param semester - Raw semester value
 * @returns Normalized semester
 */
export function normalizeSemester(semester: string): string {
  if (!semester) return '';
  
  const normalized = semester.toString().trim();
  
  // Extract number from semester string
  const semesterMatch = normalized.match(/(\d+)/);
  if (semesterMatch) {
    return semesterMatch[1];
  }
  
  return normalized;
}

/**
 * Cleans and trims text data
 * @param text - Raw text
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .toString()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n\t]/g, ' '); // Replace line breaks and tabs with space
}

/**
 * Validates if a string is not empty after cleaning
 * @param text - Text to validate
 * @returns boolean indicating if text is valid
 */
export function isValidText(text: string): boolean {
  return cleanText(text).length > 0;
}

/**
 * Converts time string to standard format (HH:MM)
 * @param time - Raw time string
 * @returns Standardized time string
 */
export function normalizeTime(time: string): string {
  if (!time) return '';
  
  const cleaned = cleanText(time);
  
  // Handle various time formats
  const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2];
    return `${hours}:${minutes}`;
  }
  
  return cleaned;
}

/**
 * Groups students by program and section
 * @param students - Array of students
 * @returns Map of grouped students
 */
export function groupStudentsByProgramSection<T extends { normalizedProgram: string; section: string }>(
  students: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  students.forEach(student => {
    const key = `${student.normalizedProgram} - ${student.section}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    
    groups.get(key)!.push(student);
  });
  
  console.log(`📊 Grouped students into ${groups.size} program-section combinations`);
  return groups;
}
