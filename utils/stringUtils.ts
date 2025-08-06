/**
 * Calculates the Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns The Levenshtein distance (minimum number of single-character edits)
 */
export function levenshteinDistance(a: string, b: string): number {
  // Create a matrix to store distances
  const matrix: number[][] = [];
  
  // Initialize the matrix with base cases
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Normalizes a string for comparison by removing extra spaces and special characters
 * @param str - Input string
 * @returns Normalized string
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .trim();
}

/**
 * Compares two strings with fuzzy matching
 * @param a - First string
 * @param b - Second string
 * @param threshold - Similarity threshold (0-1)
 * @returns True if strings match according to the threshold
 */
export function fuzzyMatchStrings(a: string, b: string, threshold = 0.7): boolean {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);
  
  // Exact match
  if (normalizedA === normalizedB) return true;
  
  // Check if one string contains the other
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return true;
  }
  
  // Calculate similarity using Levenshtein distance
  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  const similarity = 1 - distance / maxLength;
  
  return similarity >= threshold;
}
