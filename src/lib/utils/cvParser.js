import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * Extract text content from a PDF file
 * @param {File | Blob} file - PDF file to extract text from
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text content from a Word document
 * Note: This is a placeholder - actual implementation would require
 * a library like mammoth.js or server-side processing
 * @param {File | Blob} file - Word document file
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromWord(file) {
  // For now, we'll return a message indicating server-side processing is needed
  // In a production environment, you'd use a library or API service
  throw new Error('Word document parsing requires server-side processing. Please use PDF format for now.');
}

/**
 * Extract text from CV file based on its type
 * @param {File} file - CV file (PDF or Word)
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromCV(file) {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (
    fileType === 'application/msword' || 
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.doc') || 
    fileName.endsWith('.docx')
  ) {
    return extractTextFromWord(file);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Word document.');
  }
}

/**
 * Parse CV file and extract structured data using AI
 * @param {File} file - CV file to parse
 * @returns {Promise<Object>} Parsed CV data
 */
export async function parseCV(file) {
  try {
    // Extract text from the CV file
    const cvText = await extractTextFromCV(file);
    
    // Call the CV parser API
    const response = await fetch('/api/cv-parser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvText,
        fileType: file.type,
      }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to parse CV');
    }
    
    return result.extractedData;
  } catch (error) {
    console.error('CV parsing failed:', error);
    throw error;
  }
}