import * as XLSX from 'xlsx';
import { Student, EventMetadata, ParsedExcelData } from '../types/od';
import { normalizeProgram, cleanText, toTitleCase } from './normalizeData';
import { levenshteinDistance } from './stringUtils';

// Type for column mapping
type ColumnMapping = {
  name: number | null;
  program: number | null;
  section: number | null;
  semester: number | null;
  [key: string]: number | null; // Allow dynamic keys for additional fields
};

// Define possible header variations with weights for fuzzy matching
const HEADER_VARIANTS = {
  name: [
    { text: 'student name', weight: 1.0 },
    { text: 'name', weight: 0.9 },
    { text: 'student_name', weight: 0.9 },
    { text: 'studentname', weight: 0.8 },
    { text: 'full name', weight: 0.8 },
    { text: 'fullname', weight: 0.7 }
  ],
  program: [
    { text: 'program', weight: 1.0 },
    { text: 'programme', weight: 0.9 },
    { text: 'branch', weight: 0.8 },
    { text: 'department', weight: 0.7 },
    { text: 'course', weight: 0.7 },
    { text: 'degree', weight: 0.6 }
  ],
  section: [
    { text: 'section', weight: 1.0 },
    { text: 'sec', weight: 0.9 },
    { text: 'group', weight: 0.8 },
    { text: 'batch', weight: 0.7 },
    { text: 'division', weight: 0.6 }
  ],
  semester: [
    { text: 'semester', weight: 1.0 },
    { text: 'sem', weight: 0.9 },
    { text: 'sem.', weight: 0.9 },
    { text: 'term', weight: 0.6 },
    { text: 'year', weight: 0.5 }
  ]
} as const;

// Metadata field mappings with variations
const METADATA_FIELDS = [
  { 
    key: 'eventName', 
    variations: ['event name', 'name of event', 'activity', 'title', 'name'] 
  },
  { 
    key: 'eventCoordinator', 
    variations: ['coordinator', 'incharge', 'faculty incharge', 'organizer', 'contact person'] 
  },
  { 
    key: 'eventDate', 
    variations: ['event date', 'date', 'date of event', 'on'] 
  },
  { 
    key: 'eventDay', 
    variations: ['day', 'weekday', 'day of week'] 
  },
  { 
    key: 'eventVenue', 
    variations: ['venue', 'place', 'location', 'address', 'where'] 
  },
  { 
    key: 'eventTime', 
    variations: ['time', 'event time', 'timing', 'schedule'] 
  }
] as const;

/**
 * Parses uploaded Excel file to extract event metadata and student data
 * @param file - The uploaded Excel file
 * @returns Promise<ParsedExcelData> - Parsed metadata and students
 */
/**
 * Ultra-robust Excel parser for OD automation.
 * Handles fuzzy, partial, and case-insensitive matching for headers and metadata.
 * Dynamically detects header row and normalizes all extracted data.
 * Throws detailed errors for missing columns/metadata.
 * Plug-and-play for OD server action.
 */
export async function parseExcel(file: File): Promise<ParsedExcelData> {
  // 1. Read file and convert to 2D array
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) as string[][];

  // 2. Extract metadata from top N rows (usually first 6)
  const metadata = extractEventMetadata(data);

  // 3. Find student header row and column mapping
  const { headerRowIdx, colMap, detectedHeaders } = findStudentHeaderRowAndMap(data);

  // 4. Extract students from rows below header
  const students = extractStudents(data, headerRowIdx, colMap);

  // 5. Error reporting
  if (!students.length) {
    throw new Error('No student data found below headers.');
  }

  return { metadata, students };
}

/**
 * Extracts event metadata from the top N rows of the sheet.
 * Flexible: ignores case, whitespace, colons, hyphens.
 */
function extractEventMetadata(data: string[][]): EventMetadata {
  // Define metadata keys and their fuzzy matchers
  const metaKeys: Record<string, keyof EventMetadata> = {
    eventname: 'eventName',
    coordinator: 'coordinator',
    eventdate: 'eventDate',
    day: 'day',
    place: 'place',
    eventtime: 'eventTime',
    eventvenue: 'eventVenue',
    organizingdepartment: 'organizingDepartment',
    facultyincharge: 'facultyIncharge',
    contactdetails: 'contactDetails',
  };
  // Initialize all fields to empty string
  const meta: EventMetadata = {
    eventName: '',
    eventDate: '',
    eventTime: '',
    eventVenue: '',
    organizingDepartment: '',
    facultyIncharge: '',
    contactDetails: '',
    coordinator: '',
    day: '',
    place: '',
  };
  for (let i = 0; i < Math.min(12, data.length); ++i) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    const rawKey = String(row[0] || '');
    const value = String(row[1] || '').trim();
    if (!value) continue;
    // Normalize: lowercase, remove spaces, colons, hyphens
    const norm = rawKey.toLowerCase().replace(/[^a-z]/g, '');
    // Robust: map both 'venue' and 'place' to eventVenue if found
    if (norm.includes('venue') || norm.includes('place')) {
      if (!meta.eventVenue) meta.eventVenue = value;
      if (!meta.place) meta.place = value;
      continue;
    }
    for (const [fuzzy, key] of Object.entries(metaKeys)) {
      if (norm.includes(fuzzy)) {
        meta[key] = value;
        break;
      }
    }
  }
  // Debug log for venue
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('Venue extracted:', meta.eventVenue, 'Place extracted:', meta.place);
  }
  // Error if none found
  const allMetaFields = [
    'eventName','eventDate','eventTime','eventVenue','organizingDepartment','facultyIncharge','contactDetails','coordinator','day','place'
  ];
  const missing = allMetaFields.filter((k) => !meta[k]);
  if (missing.length === allMetaFields.length) {
    throw new Error('Missing event details in rows 1-12.');
  }
  return meta;
}

/**
 * Finds the header row and maps columns for name, program, section, semester.
 * Uses fuzzy/partial/case-insensitive matching. Throws on missing columns.
 */
function findStudentHeaderRowAndMap(data: string[][]): {
  headerRowIdx: number;
  colMap: { name: number; program: number; section: number; semester: number };
  detectedHeaders: string[];
} {
  // Helper: normalize header text (strip non-letters, lowercase)
  const norm = (s: string) => s.replace(/[^a-z]/gi, '').toLowerCase();
  // Acceptable header keys
  const HEADERS = {
    name: ["studentname", "name"],
    program: ["program", "programme", "branch"],
    section: ["section", "sec"],
    semester: ["semester", "sem"]
  };
  for (let i = 0; i < Math.min(30, data.length); ++i) {
    const row = data[i];
    if (!row) continue;
    const map: any = {};
    let matchCount = 0;
    const detected: string[] = [];
    for (let j = 0; j < row.length; ++j) {
      const cell = String(row[j] || '').trim();
      if (!cell) continue;
      detected.push(cell);
      const ncell = norm(cell);
      for (const [key, variants] of Object.entries(HEADERS)) {
        if (map[key] != null) continue;
        if (variants.some(v => ncell.includes(v))) {
          map[key] = j;
          matchCount++;
          break;
        }
      }
    }
    if (matchCount >= 3) {
      // Check for missing columns
      for (const req of Object.keys(HEADERS)) {
        if (map[req] == null) {
          throw new Error(
            `Missing column: ${req}. Detected headers: [${row.filter(Boolean).join(', ')}]. Allowed: Student Name, Program, Section, Semester (flexible: any similar word or casing accepted).`
          );
        }
      }
      return { headerRowIdx: i, colMap: map, detectedHeaders: row.filter(Boolean) };
    }
  }
  throw new Error('Student headers not found. Expected: Student Name, Program, Section, Semester.');
}

/**
 * Extracts student rows below the detected header row, normalizing fields.
 */
function extractStudents(
  data: string[][],
  headerRowIdx: number,
  colMap: { name: number; program: number; section: number; semester: number }
): Student[] {
  const students: Student[] = [];
  for (let i = headerRowIdx + 1; i < data.length; ++i) {
    const row = data[i];
    if (!row || row.every(cell => !String(cell).trim())) continue;
    const name = toTitleCase(String(row[colMap.name] || '').trim());
    const rawProgram = String(row[colMap.program] || '').trim();
    const program = normalizeProgram(rawProgram);
    const section = String(row[colMap.section] || '').trim().toUpperCase();
    const semester = String(row[colMap.semester] || '').trim();
    if (!name && !program && !section && !semester) continue;
    students.push({
      name,
      program,
      section,
      semester,
      normalizedProgram: program,
      originalData: {
        program: rawProgram,
        section,
        semester,
      },
    });
  }
  return students;
}

/**
 * Normalizes text for comparison (lowercase, trim, remove special chars)
 */
function normalizeText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ');    // Normalize spaces
}

/**
 * Finds the best matching metadata field for a given label
 */
function findMatchingMetadataField(label: string): string | null {
  const normalizedLabel = normalizeText(label);
  
  for (const field of METADATA_FIELDS) {
    for (const variation of field.variations) {
      if (normalizedLabel.includes(normalizeText(variation))) {
        return field.key;
      }
    }
  }
  
  return null;
}

/**
 * Parses event metadata from unstructured data
 * @param jsonData - Raw Excel data as 2D array
 * @returns EventMetadata object
 */
function parseMetadata(jsonData: string[][]): EventMetadata {
  console.log('🔍 Parsing metadata...');
  
  const metadata: EventMetadata = {
    eventName: '',
    eventDate: '',
    eventTime: '',
    eventVenue: '',
    organizingDepartment: '',
    facultyIncharge: '',
    contactDetails: ''
  };
  
  // Scan first 10 rows for metadata
  const scanRows = Math.min(10, jsonData.length);
  
  for (let i = 0; i < scanRows; i++) {
    const row = jsonData[i] || [];
    if (row.length < 2) continue;
    
    const label = String(row[0] || '').trim();
    const value = String(row[1] || '').trim();
    
    if (!label || !value) continue;
    
    const field = findMatchingMetadataField(label);
    if (field) {
      metadata[field as keyof EventMetadata] = value;
    }
  }
  
  // Set default values for required fields if empty
  if (!metadata.eventName) metadata.eventName = 'Untitled Event';
  if (!metadata.eventDate) metadata.eventDate = new Date().toISOString().split('T')[0];
  
  console.log('✅ Metadata parsing complete');
  return metadata;
}

/**
 * Finds the header row and maps column indices to student data fields
 * @param jsonData - Raw Excel data as 2D array
 * @returns Object with column indices for each field and the header row index
 */
function findHeaderRowAndMapColumns(jsonData: string[][]): { mapping: ColumnMapping; headerRowIndex: number } {
  console.log('🔍 Finding header row...');
  
  const mapping: ColumnMapping = {
    name: null,
    program: null,
    section: null,
    semester: null
  };
  
  let headerRowIndex = -1;
  let bestMatchScore = 0;
  let bestMapping = { ...mapping };
  
  // Scan first 15 rows to find the best header match
  const scanRows = Math.min(15, jsonData.length);
  
  for (let i = 0; i < scanRows; i++) {
    const row = jsonData[i] || [];
    const currentMapping: ColumnMapping = { ...mapping };
    let rowMatchScore = 0;
    
    // Check each cell in the row
    for (let col = 0; col < row.length; col++) {
      const cellValue = String(row[col] || '').trim().toLowerCase();
      if (!cellValue) continue;
      
      // Check against each header type with weighted matching
      for (const [field, variants] of Object.entries(HEADER_VARIANTS)) {
        for (const { text, weight } of variants) {
          if (fuzzyMatch(cellValue, text, 0.7)) {
            // Only set if not already found or if this is a better match
            if (currentMapping[field as keyof ColumnMapping] === null || weight > 0.8) {
              currentMapping[field as keyof ColumnMapping] = col;
              rowMatchScore += weight;
            }
            break;
          }
        }
      }
    }
    
    // Track the best matching row
    if (rowMatchScore > bestMatchScore) {
      bestMatchScore = rowMatchScore;
      bestMapping = { ...currentMapping };
      headerRowIndex = i;
    }
  }
  
  // Validate we found at least 2 required columns
  const foundColumns = Object.values(bestMapping).filter(Boolean).length;
  if (foundColumns < 2) {
    const foundHeaders = Object.entries(bestMapping)
      .filter(([_, col]) => col !== null)
      .map(([field]) => field);
      
    throw new Error(
      `Could not find required columns. Found: ${foundHeaders.join(', ') || 'none'}. ` +
      `Required at least 2 of: student name, program, section, or semester`
    );
  }
  
  return { mapping: bestMapping, headerRowIndex };
}

/**
 * Parses student data from the Excel file
 * @param jsonData - Raw Excel data as 2D array
 * @returns Array of Student objects
 */
function parseStudentData(jsonData: string[][]): Student[] {
  console.log('👥 Parsing student data...');
  
  // Find the header row and map columns
  const { mapping, headerRowIndex } = findHeaderRowAndMapColumns(jsonData);
  
  const students: Student[] = [];
  let emptyRowCount = 0;
  const maxEmptyRows = 5; // Maximum consecutive empty rows before stopping
  
  // Start processing from the row after the header
  for (let rowIndex = headerRowIndex + 1; rowIndex < jsonData.length; rowIndex++) {
    const row = jsonData[rowIndex] || [];
    
    // Skip empty rows
    if (row.every(cell => !String(cell).trim())) {
      emptyRowCount++;
      if (emptyRowCount >= maxEmptyRows) {
        console.log(`ℹ️  Stopping at row ${rowIndex + 1} after ${emptyRowCount} empty rows`);
        break;
      }
      continue;
    }
    
    // Reset empty row counter if we find data
    emptyRowCount = 0;
    
    try {
      // Extract values using the column mapping
      const name = cleanText(row[mapping.name!] || '');
      const program = cleanText(row[mapping.program!] || '');
      const section = cleanText(row[mapping.section!] || '');
      const semester = cleanText(row[mapping.semester!] || '');
      
      // Skip if required fields are empty
      if (!name || !program || !section || !semester) {
        console.log(`⚠️  Skipping row ${rowIndex + 1}: Missing required field`);
        continue;
      }
      
      // Normalize data
      const normalizedProgram = normalizeProgram(program);
      const normalizedSection = section.toUpperCase().trim();
      const normalizedSemester = semester.replace(/\D/g, ''); // Extract numbers only
      
      const student: Student = {
        name,
        program,
        section: normalizedSection,
        semester: normalizedSemester,
        normalizedProgram,
        originalData: {
          program,
          section,
          semester
        }
      };
      
      students.push(student);
      console.log(`✅ Added student: ${name} - ${normalizedProgram} ${normalizedSection} Sem ${normalizedSemester}`);
      
    } catch (error) {
      console.error(`⚠️  Error processing row ${rowIndex + 1}:`, error);
    }
  }
  
  console.log(`🎯 Successfully parsed ${students.length} students`);
  return students;
}

/**
 * Validates if the Excel file has the expected structure
 * @param jsonData - Raw Excel data as 2D array
 * @returns boolean indicating if structure is valid
 */
export function validateExcelStructure(jsonData: string[][]): boolean {
  console.log('🔍 Validating Excel structure...');
  
  // Check if we have at least 10 rows (metadata + header + at least 1 student)
  if (jsonData.length < 10) {
    console.error('❌ Excel must have at least 10 rows');
    return false;
  }
  
  // Check if row 10 (index 9) has at least 4 columns for student data
  if (!jsonData[9] || jsonData[9].length < 4) {
    console.error('❌ Row 10 must have at least 4 columns (Name, Program, Section, Semester)');
    return false;
  }
  
  console.log('✅ Excel structure validation passed');
  return true;
}

/**
 * Performs fuzzy matching between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @param threshold - Similarity threshold (0-1)
 * @returns boolean indicating if strings match
 */
function fuzzyMatch(str1: string, str2: string, threshold = 0.7): boolean {
  if (!str1 || !str2) return false;
  
  // Normalize strings
  const normalize = (s: string) => 
    String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')  // Remove special chars
      .replace(/\s+/g, ' ');     // Normalize spaces
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Direct match
  if (s1 === s2) return true;
  
  // Check if one contains the other (with word boundary check)
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Check for partial matches (e.g., 'student name' matches 'name')
  if (words1.some(w1 => words2.includes(w1)) || 
      words2.some(w2 => words1.includes(w2))) {
    return true;
  }
  
  // Check for abbreviations (e.g., 'sec' matches 'section')
  const isAbbreviation = (short: string, long: string): boolean => {
    if (short.length > long.length) return isAbbreviation(long, short);
    return long.startsWith(short) && (long.length <= short.length + 2);
  };
  
  if (words1.length === 1 && words2.length === 1 && isAbbreviation(s1, s2)) {
    return true;
  }
  
  // Check if strings are similar enough using Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - distance / maxLength;
  
  return similarity >= threshold;
}

/**
 * Suggests the closest matching header from a list of options
 * @param input - The input string to match
 * @param options - Array of possible options
 * @returns The closest matching option or null if no good match
 */
function suggestHeaderMatch(input: string, options: string[]): string | null {
  if (!input) return null;
  
  const cleanInput = cleanText(input).toLowerCase();
  
  // First try exact match
  const exactMatch = options.find(opt => 
    cleanText(opt).toLowerCase() === cleanInput
  );
  if (exactMatch) return exactMatch;
  
  // Then try contains match
  const containsMatch = options.find(opt => 
    cleanText(opt).toLowerCase().includes(cleanInput) || 
    cleanInput.includes(cleanText(opt).toLowerCase())
  );
  if (containsMatch) return containsMatch;
  
  // Finally, try fuzzy match
  for (const opt of options) {
    if (fuzzyMatch(cleanInput, opt)) {
      return opt;
    }
  }
  
  return null;
}
