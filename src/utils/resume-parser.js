/**
 * Resume Parser Utility
 * 
 * This utility provides functions to parse resume files (PDF and DOCX)
 * and extract relevant information for job applications.
 */

// Import the required libraries for parsing
// Use pdf.js library which is browser-compatible
import * as pdfjs from 'pdfjs-dist';
import { PDFWorker } from 'pdfjs-dist';
import mammoth from 'mammoth';

/**
 * Parse a resume file and extract information
 * @param {File} file - The resume file (PDF or DOCX)
 * @returns {Promise<Object>} - Parsed resume data
 */
export async function parseResume(file) {
  try {
    let text = '';
    
    // Extract text based on file type
    if (file.type === 'application/pdf') {
      text = await parsePdf(file);
    } else if (
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await parseDocx(file);
    } else {
      throw new Error('Unsupported file type');
    }
    
    // Extract information from the text
    return extractInformation(text);
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
}

/**
 * Parse PDF file to extract text
 * @param {File} file - The PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function parsePdf(file) {
  try {
    // Set the worker source for PDF.js - use local worker file instead of CDN
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;
    }
    
    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Load the PDF document with better error handling
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      // Disable range requests to avoid CORS issues
      disableRange: true,
      // Disable streaming to improve compatibility
      disableStream: true
    });
    
    console.log('PDF loading task created');
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate the text items with better spacing
      let lastY;
      let pageText = '';
      
      for (const item of textContent.items) {
        // Add newline if Y position changes significantly
        if (lastY !== undefined && Math.abs(lastY - item.transform[5]) > 5) {
          pageText += '\n';
        }
        
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      
      fullText += pageText + '\n\n';
    }
    
    console.log('PDF parsing completed successfully');
    return fullText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Parse DOCX file to extract text
 * @param {File} file - The DOCX file
 * @returns {Promise<string>} - Extracted text
 */
async function parseDocx(file) {
  try {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({
      arrayBuffer: buffer
    });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw error;
  }
}

/**
 * Extract structured information from resume text
 * @param {string} text - The extracted text from resume
 * @returns {Object} - Structured resume data
 */
function extractInformation(text) {
  // Enhanced implementation for Overleaf template compatibility
  // Uses more sophisticated patterns to extract information accurately
  
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // First extract the name to avoid duplicate processing
  const nameInfo = extractName(text);
  
  // Extract education information
  const educationInfo = extractEducation(text);
  
  // Enhanced extraction logic with better structure for Overleaf templates
  const data = {
    // Personal Information - refined for Overleaf templates
    firstName: nameInfo.firstName || '',
    middleName: nameInfo.middleName || '',
    lastName: nameInfo.lastName || '',
    email: extractEmail(text) || '',
    contactNumber: extractPhone(text) || '',
    linkedinUrl: extractLinkedIn(text) || 'https://linkedin.com/in/',
    githubUrl: extractGithubUrl(text) || '',
    portfolioUrl: extractPortfolioUrl(text) || '',
    address: extractAddress(text) || '',
    
    // Education details - structured for academic CV templates
    collegeName: educationInfo.collegeName || '',
    degree: educationInfo.degree || '',
    universityName: educationInfo.universityName || '',
    specialization: educationInfo.specialization || '',
    graduationYear: educationInfo.graduationYear || '',
    startYear: educationInfo.startYear || '',
    endYear: educationInfo.endYear || '',
    location: educationInfo.location || '',
    cgpa: educationInfo.cgpa || '',
    
    // Skills with categorization for technical resumes
    skills: extractSkills(text),
    technicalSkills: extractTechnicalSkills(text) || '',
    softSkills: extractSoftSkills(text) || '',
    languages: extractLanguages(text) || '',
    
    // Projects with enhanced metadata for Overleaf templates
    projects: extractProjects(text),
    
    // Work experience with improved date parsing for Overleaf templates
    workExperiences: extractWorkExperience(text),
    
    // Additional sections common in Overleaf templates
    certifications: extractCertifications(text) || '',
    experience: calculateExperience(text) || 0,
    
    // Default education level if not specified
    educationLevel: extractEducationLevel(text) || ''
  };
  
  return data;
}

/**
 * Extract education level from text
 * @param {string} text - Resume text
 * @returns {string} - Education level
 */
function extractEducationLevel(text) {
  // Look for education level indicators
  const educationLevelPatterns = {
    'Intermediate': /\b(?:intermediate|high school|secondary|12th|hsc)\b/i,
    'Graduate': /\b(?:graduate|bachelor'?s|bachelors|b\.?tech|b\.?e|b\.?sc|b\.?a|b\.?com)\b/i,
    'Post Graduate': /\b(?:post[\s-]?graduate|master'?s|masters|m\.?tech|m\.?e|m\.?sc|m\.?a|m\.?com|mba|pgdm|ph\.?d|doctorate)\b/i
  };
  
  // Check for education level in the entire text
  for (const [level, pattern] of Object.entries(educationLevelPatterns)) {
    if (pattern.test(text)) {
      return level;
    }
  }
  
  // If no match found, try to infer from degree information
  const educationSection = extractSection(text, ['education', 'academic background', 'academic qualifications']);
  if (educationSection) {
    for (const [level, pattern] of Object.entries(educationLevelPatterns)) {
      if (pattern.test(educationSection)) {
        return level;
      }
    }
  }
  
  return '';
}

/**
 * Extract name from text
 * @param {string} text - Resume text
 * @returns {Object} - First, middle, and last name
 */
function extractName(text) {
  // Enhanced implementation for Overleaf templates
  // Look for name patterns with various formats and headers
  
  // First try to find explicitly labeled name
  const labeledNameRegex = /(?:\bname\s*:?\s*|\bfull\s+name\s*:?\s*|\bresume\s+of\s+|\bcv\s+of\s+)([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,3})/i;
  const labeledMatch = text.match(labeledNameRegex);
  
  if (labeledMatch) {
    const fullName = labeledMatch[1].trim();
    return parseFullName(fullName);
  }
  
  // Look for name at the beginning of the document (common in resumes)
  const firstLineRegex = /^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,3})$/m;
  const firstLineMatch = text.match(firstLineRegex);
  
  if (firstLineMatch) {
    const fullName = firstLineMatch[1].trim();
    return parseFullName(fullName);
  }
  
  // Look for name in contact section
  const contactSection = extractSection(text, ['contact', 'personal information', 'personal details']);
  if (contactSection) {
    const contactNameRegex = /([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,3})\s*(?:\n|$)/;
    const contactMatch = contactSection.match(contactNameRegex);
    if (contactMatch) {
      const fullName = contactMatch[1].trim();
      return parseFullName(fullName);
    }
  }
  
  // Fallback to a more general pattern if the specific ones don't match
  const fallbackRegex = /([A-Z][a-zA-Z'-]+)\s+(?:([A-Z][a-zA-Z'-]+)\s+)?([A-Z][a-zA-Z'-]+)/;
  const fallbackMatch = text.match(fallbackRegex);
  
  if (fallbackMatch) {
    return {
      firstName: fallbackMatch[1] || '',
      middleName: fallbackMatch[2] || '',
      lastName: fallbackMatch[3] || fallbackMatch[2] || ''
    };
  }
  
  return { firstName: '', middleName: '', lastName: '' };
}

/**
 * Helper function to parse a full name into first, middle, and last name
 * @param {string} fullName - Full name string
 * @returns {Object} - Object with firstName, middleName, and lastName
 */
function parseFullName(fullName) {
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      middleName: '',
      lastName: ''
    };
  } else if (nameParts.length === 2) {
    return {
      firstName: nameParts[0],
      middleName: '',
      lastName: nameParts[1]
    };
  } else {
    return {
      firstName: nameParts[0],
      middleName: nameParts.slice(1, -1).join(' '),
      lastName: nameParts[nameParts.length - 1]
    };
  }
}

/**
 * Extract email from text
 * @param {string} text - Resume text
 * @returns {string|null} - Email address
 */
function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

/**
 * Extract phone number from text
 * @param {string} text - Resume text
 * @returns {string|null} - Phone number
 */
function extractPhone(text) {
  // Look for phone numbers with common formats and labels
  const phoneRegexes = [
    // Look for labeled phone numbers first
    /(?:phone|mobile|cell|contact|tel)\s*:?\s*((?:\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4})/i,
    // Then try general phone number patterns
    /(?:\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}/
  ];
  
  for (const regex of phoneRegexes) {
    const match = text.match(regex);
    if (match) {
      // If it's a labeled match, return the captured group, otherwise return the whole match
      return regex.toString().includes('phone|mobile') ? match[1] : match[0];
    }
  }
  
  return null;
}

/**
 * Extract LinkedIn URL from text
 * @param {string} text - Resume text
 * @returns {string|null} - LinkedIn URL
 */
function extractLinkedIn(text) {
  // Look for LinkedIn URLs with common formats and labels
  const linkedinRegexes = [
    // Look for labeled LinkedIn URLs first
    /(?:linkedin|profile|social)\s*:?\s*((?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+(?:\/[\w-]+)*)/i,
    // Then try general LinkedIn URL patterns
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+(?:\/[\w-]+)*/
  ];
  
  for (const regex of linkedinRegexes) {
    const match = text.match(regex);
    if (match) {
      // If it's a labeled match, return the captured group, otherwise return the whole match
      const url = regex.toString().includes('linkedin|profile') ? match[1] : match[0];
      
      // Ensure the URL has the https:// prefix
      if (!url.startsWith('http')) {
        return 'https://' + url;
      }
      return url;
    }
  }
  
  return null;
}

/**
 * Extract GitHub URL from text
 * @param {string} text - Resume text
 * @returns {string|null} - GitHub URL
 */
function extractGithubUrl(text) {
  // Look for GitHub URLs with common formats and labels
  const githubRegexes = [
    // Look for labeled GitHub URLs first
    /(?:github|git|repo|repository|code)\s*:?\s*((?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+(?:\/[\w-]+)*)/i,
    // Then try general GitHub URL patterns
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+(?:\/[\w-]+)*/
  ];
  
  for (const regex of githubRegexes) {
    const match = text.match(regex);
    if (match) {
      // If it's a labeled match, return the captured group, otherwise return the whole match
      const url = regex.toString().includes('github|git|repo') ? match[1] : match[0];
      
      // Ensure the URL has the https:// prefix
      if (!url.startsWith('http')) {
        return 'https://' + url;
      }
      return url;
    }
  }
  
  return null;
}

/**
 * Extract Portfolio URL from text
 * @param {string} text - Resume text
 * @returns {string|null} - Portfolio URL
 */
function extractPortfolioUrl(text) {
  // Look for portfolio URLs with common formats and labels
  const portfolioRegexes = [
    // Look for labeled portfolio URLs first
    /(?:portfolio|website|personal site|web|homepage)\s*:?\s*((?:https?:\/\/)?(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[\w-\.\/?%&=]*)?)/i,
    // Then try to find URLs that aren't LinkedIn or GitHub
    /(?:https?:\/\/)?(?:www\.)?(?!linkedin\.com|github\.com)[\w-]+\.[a-z]{2,}(?:\/[\w-\.\/?%&=]*)?\/[\w-\.\/?%&=]*/
  ];
  
  for (const regex of portfolioRegexes) {
    const match = text.match(regex);
    if (match) {
      // If it's a labeled match, return the captured group, otherwise return the whole match
      const url = regex.toString().includes('portfolio|website|personal') ? match[1] : match[0];
      
      // Ensure the URL has the https:// prefix
      if (!url.startsWith('http')) {
        return 'https://' + url;
      }
      return url;
    }
  }
  
  return null;
}

/**
 * Extract address from text
 * @param {string} text - Resume text
 * @returns {string|null} - Address
 */
function extractAddress(text) {
  // Look for address in contact section
  const contactSection = extractSection(text, ['contact', 'personal information', 'personal details']);
  if (contactSection) {
    // Look for labeled address
    const addressRegex = /(?:address|location|residence)\s*:?\s*([^\n]+)/i;
    const match = contactSection.match(addressRegex);
    if (match) {
      return match[1].trim();
    }
    
    // Look for address patterns (city, state/province, zip/postal code)
    const cityStateRegex = /([A-Za-z\s]+),\s*([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)/;
    const cityStateMatch = contactSection.match(cityStateRegex);
    if (cityStateMatch) {
      return cityStateMatch[0].trim();
    }
  }
  
  return null;
}

/**
 * Extract education information
 * @param {string} text - Resume text
 * @returns {Object} - Education details
 */
function extractEducation(text) {
  // Extract education section with expanded section headers for Overleaf templates
  const educationSection = extractSection(text, [
    'education', 'academic background', 'academic qualifications', 'educational qualifications',
    'academic history', 'academic record', 'academic profile'
  ]);
  
  // Initialize with empty values - structured for Overleaf CV templates
  const education = {
    collegeName: '',
    degree: '',
    universityName: '',
    specialization: '',
    graduationYear: '',
    cgpa: '',
    startYear: '',
    endYear: '',
    location: ''
  };
  
  if (educationSection) {
    // Try to extract with labeled patterns first - expanded for Overleaf formats
    education.collegeName = extractPattern(educationSection, /(?:college|school|institute|institution)\s*:?\s*([^\n,]+)/i);
    education.degree = extractPattern(educationSection, /(?:degree|qualification|program|course|diploma)\s*:?\s*([^\n,]+)/i);
    education.universityName = extractPattern(educationSection, /(?:university|institute|academy|alma mater)\s*:?\s*([^\n,]+)/i);
    education.specialization = extractPattern(educationSection, /(?:specialization|major|field|concentration|subject|discipline|focus)\s*:?\s*([^\n,]+)/i);
    
    // Extract graduation year with expanded patterns
    education.graduationYear = extractPattern(educationSection, /(?:year|graduated|graduation|completed|class of|completion|finished)\s*:?\s*([0-9]{4})/i);
    
    // Extract CGPA/GPA with expanded patterns
    education.cgpa = extractPattern(educationSection, /(?:cgpa|gpa|grade|score|percentage|marks)\s*:?\s*([0-9.]+%?)/i);
    
    // Extract date ranges for education
    const dateRangeRegex = /((?:19|20)\d{2})\s*(?:-|to|–|—)\s*((?:19|20)\d{2}|present|current|now)/i;
    const dateRangeMatch = educationSection.match(dateRangeRegex);
    if (dateRangeMatch) {
      education.startYear = dateRangeMatch[1];
      education.endYear = dateRangeMatch[2].toLowerCase() === 'present' || 
                         dateRangeMatch[2].toLowerCase() === 'current' || 
                         dateRangeMatch[2].toLowerCase() === 'now' ? 
                         new Date().getFullYear().toString() : dateRangeMatch[2];
      
      // If graduation year is empty, use end year
      if (!education.graduationYear && education.endYear !== new Date().getFullYear().toString()) {
        education.graduationYear = education.endYear;
      }
    }
    
    // Extract location information
    education.location = extractPattern(educationSection, /(?:location|city|place|campus)\s*:?\s*([^\n,]+)/i);
    if (!education.location) {
      // Try to find location patterns like "City, Country" or "City (Country)"
      const locationRegex = /([A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+|[A-Z][a-zA-Z\s]+\s*\([A-Z][a-zA-Z\s]+\))/;
      const locationMatch = educationSection.match(locationRegex);
      if (locationMatch) {
        education.location = locationMatch[1].trim();
      }
    }
    
    // If university name is empty but college name is not, use college name as university name
    if (!education.universityName && education.collegeName) {
      education.universityName = education.collegeName;
    }
    
    // If no labeled patterns found, try to extract from general text
    if (!education.degree) {
      // Look for common degree abbreviations and names - expanded for international degrees
      const degreeRegex = /\b(B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?S|M\.?S|Ph\.?D|B\.?A|M\.?A|MBA|PGDM|Bachelor|Master|Doctorate|BSc|MSc|BBA|BCA|MCA|LLB|LLM|MD|MBBS)\b[^\n,]*(?:in|of)?\s*([^\n,]+)?/i;
      const degreeMatch = educationSection.match(degreeRegex);
      if (degreeMatch) {
        education.degree = degreeMatch[1].trim();
        if (degreeMatch[2]) {
          education.specialization = degreeMatch[2].trim();
        }
      }
    }
    
    // Look for year patterns if not found earlier
    if (!education.graduationYear) {
      const yearRegex = /\b(20\d{2}|19\d{2})\b/;
      const yearMatch = educationSection.match(yearRegex);
      if (yearMatch) {
        education.graduationYear = yearMatch[1];
      }
    }
    
    // Look for university/college names if not found earlier
    if (!education.universityName && !education.collegeName) {
      // Look for lines that might contain institution names
      const lines = educationSection.split('\n');
      for (const line of lines) {
        // Skip lines that are likely not institution names
        if (/degree|year|gpa|grade|score|major|field|specialization/i.test(line)) {
          continue;
        }
        
        // Look for capitalized words that might be institution names - expanded pattern
        const institutionRegex = /([A-Z][A-Za-z\s&,'.\-]+(?:University|College|Institute|School|Academy|Center|Centre))/;
        const institutionMatch = line.match(institutionRegex);
        if (institutionMatch) {
          education.universityName = institutionMatch[1].trim();
          break;
        }
      }
    }
  }
  
  return education;
}

/**
 * Extract skills from text
 * @param {string} text - Resume text
 * @returns {string} - Comma-separated skills
 */
function extractSkills(text) {
  // Extract skills section with expanded section headers for Overleaf templates
  const skillsSection = extractSection(text, [
    'skills', 'technical skills', 'core competencies', 'key skills',
    'professional skills', 'expertise', 'proficiencies', 'qualifications'
  ]);
  
  if (!skillsSection) {
    return '';
  }
  
  // Look for skill lists in various formats
  const skills = [];
  
  // Pattern 1: Skills listed with bullets or dashes
  const bulletedSkills = skillsSection.match(/(?:•|-|\*|\+)\s*([^•\-\*\+\n]+)/g);
  if (bulletedSkills) {
    bulletedSkills.forEach(skill => {
      const cleanedSkill = skill.replace(/^[•\-\*\+\s]+/, '').trim();
      if (cleanedSkill && !skills.includes(cleanedSkill)) {
        skills.push(cleanedSkill);
      }
    });
  }
  
  // Pattern 2: Skills separated by commas
  const commaSkills = skillsSection.match(/([^,\n]+(?:,\s*|$))/g);
  if (commaSkills) {
    commaSkills.forEach(skill => {
      const cleanedSkill = skill.replace(/,$/, '').trim();
      if (cleanedSkill && !skills.includes(cleanedSkill) && cleanedSkill.length < 50) {
        skills.push(cleanedSkill);
      }
    });
  }
  
  // Pattern 3: Skills on separate lines
  const lineSkills = skillsSection.split('\n');
  lineSkills.forEach(line => {
    const cleanedLine = line.trim();
    // Skip lines that are likely headers or too long to be a skill
    if (cleanedLine && !cleanedLine.toLowerCase().includes('skill') && 
        cleanedLine.length < 50 && !skills.includes(cleanedLine)) {
      skills.push(cleanedLine);
    }
  });
  
  // Return unique skills as a comma-separated string
  return [...new Set(skills)].join(', ');
}

/**
 * Extract technical skills from text
 * @param {string} text - Resume text
 * @returns {string} - Technical skills as a formatted string
 */
function extractTechnicalSkills(text) {
  // Extract technical skills section with expanded section headers for Overleaf templates
  const technicalSection = extractSection(text, [
    'technical skills', 'technical expertise', 'technical proficiencies',
    'programming languages', 'technologies', 'tools', 'software', 'frameworks',
    'development skills', 'computer skills', 'technical competencies',
    'computational skills', 'digital skills', 'it skills', 'coding skills',
    'programming skills', 'technical tools', 'development tools'
  ]);
  
  if (!technicalSection) {
    return '';
  }
  
  // Process the technical skills section
  const technicalSkills = [];
  
  // Pattern 1: Skills listed with bullets or dashes
  const bulletedSkills = technicalSection.match(/(?:•|-|\*|\+)\s*([^•\-\*\+\n]+)/g);
  if (bulletedSkills) {
    bulletedSkills.forEach(skill => {
      const cleanedSkill = skill.replace(/^[•\-\*\+\s]+/, '').trim();
      if (cleanedSkill && !technicalSkills.includes(cleanedSkill)) {
        technicalSkills.push(cleanedSkill);
      }
    });
  }
  
  // Pattern 2: Skills on separate lines or in categories
  const lines = technicalSection.split('\n');
  let currentCategory = '';
  
  lines.forEach(line => {
    const cleanedLine = line.trim();
    
    // Check if this line is a category header
    if (cleanedLine.endsWith(':') || cleanedLine.endsWith('-')) {
      currentCategory = cleanedLine.replace(/[:|-]$/, '').trim();
    } 
    // Otherwise, it might be a skill or skill list
    else if (cleanedLine && cleanedLine.length < 100) {
      // Handle comma-separated skills within a line
      const lineSkills = cleanedLine.split(/,|;/).map(s => s.trim()).filter(Boolean);
      
      if (lineSkills.length > 0) {
        if (currentCategory) {
          technicalSkills.push(`${currentCategory}: ${lineSkills.join(', ')}`);
          currentCategory = ''; // Reset after using
        } else {
          lineSkills.forEach(skill => {
            if (!technicalSkills.includes(skill)) {
              technicalSkills.push(skill);
            }
          });
        }
      }
    }
  });
  
  // Pattern 3: Academic CV format with proficiency levels
  const proficiencyPattern = /(\w+(?:\s+\w+)*)\s*[-–:]\s*(beginner|intermediate|advanced|expert|proficient|fluent|native|basic|working knowledge|professional)/gi;
  let proficiencyMatch;
  
  while ((proficiencyMatch = proficiencyPattern.exec(technicalSection)) !== null) {
    const skill = proficiencyMatch[1].trim();
    const level = proficiencyMatch[2].trim();
    
    if (skill && level && !technicalSkills.includes(`${skill} - ${level}`)) {
      technicalSkills.push(`${skill} - ${level}`);
    }
  }
  
  // Pattern 4: Look for common programming languages and technologies
  if (technicalSkills.length === 0) {
    const commonTechPattern = /\b(java|python|javascript|js|typescript|ts|c\+\+|c#|ruby|php|swift|kotlin|go|rust|html|css|sql|nosql|react|angular|vue|node|express|django|flask|spring|docker|kubernetes|aws|azure|gcp|git|github|gitlab|bitbucket|jira|agile|scrum|machine learning|ml|ai|data science|blockchain)\b/gi;
    let techMatch;
    
    const foundTech = new Set();
    while ((techMatch = commonTechPattern.exec(text)) !== null) {
      const tech = techMatch[0].trim();
      foundTech.add(tech.toLowerCase());
    }
    
    foundTech.forEach(tech => {
      technicalSkills.push(tech);
    });
  }
  
  return technicalSkills.join('\n');
}

/**
 * Extract soft skills from text
 * @param {string} text - Resume text
 * @returns {string} - Soft skills as a formatted string
 */
function extractSoftSkills(text) {
  // Extract soft skills section with expanded section headers for Overleaf templates
  const softSkillsSection = extractSection(text, [
    'soft skills', 'interpersonal skills', 'personal skills', 'professional skills',
    'transferable skills', 'core competencies', 'strengths', 'attributes',
    'personal attributes', 'personal qualities', 'key competencies', 'communication skills',
    'leadership skills', 'management skills', 'people skills', 'teamwork skills'
  ]);
  
  if (!softSkillsSection) {
    // If no dedicated section found, try to find soft skills in the summary or profile section
    const summarySection = extractSection(text, ['summary', 'profile', 'about me', 'professional summary', 'career objective']);
    if (summarySection) {
      return extractSoftSkillsFromText(summarySection);
    }
    return '';
  }
  
  return extractSoftSkillsFromText(softSkillsSection);
}

/**
 * Helper function to extract soft skills from text
 * @param {string} text - Text to extract soft skills from
 * @returns {string} - Formatted soft skills string
 */
function extractSoftSkillsFromText(text) {
  // Process the soft skills section
  const softSkills = [];
  
  // Pattern 1: Skills listed with bullets or dashes
  const bulletedSkills = text.match(/(?:•|-|\*|\+)\s*([^•\-\*\+\n]+)/g);
  if (bulletedSkills) {
    bulletedSkills.forEach(skill => {
      const cleanedSkill = skill.replace(/^[•\-\*\+\s]+/, '').trim();
      if (cleanedSkill && !softSkills.includes(cleanedSkill)) {
        softSkills.push(cleanedSkill);
      }
    });
  }
  
  // Pattern 2: Skills separated by commas
  const commaSkills = text.match(/([^,\n]+(?:,\s*|$))/g);
  if (commaSkills) {
    commaSkills.forEach(skill => {
      const cleanedSkill = skill.replace(/,$/, '').trim();
      if (cleanedSkill && !softSkills.includes(cleanedSkill) && cleanedSkill.length < 50) {
        softSkills.push(cleanedSkill);
      }
    });
  }
  
  // Pattern 3: Look for common soft skills
  const commonSoftSkills = [
    'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
    'adaptability', 'flexibility', 'time management', 'organization', 'creativity',
    'interpersonal', 'negotiation', 'conflict resolution', 'decision making', 'emotional intelligence',
    'attention to detail', 'analytical', 'presentation', 'public speaking', 'writing',
    'collaboration', 'team player', 'self-motivated', 'proactive', 'initiative',
    'multitasking', 'planning', 'prioritization', 'customer service', 'client relations'
  ];
  
  if (softSkills.length === 0) {
    commonSoftSkills.forEach(skill => {
      const skillRegex = new RegExp(`\\b${skill}\\b`, 'i');
      if (skillRegex.test(text)) {
        softSkills.push(skill);
      }
    });
  }
  
  // Return unique soft skills as a formatted string
  return [...new Set(softSkills)].join(', ');
}

/**
 * Extract languages from text
 * @param {string} text - Resume text
 * @returns {string} - Languages as a formatted string
 */
function extractLanguages(text) {
  // Extract languages section with expanded section headers for Overleaf templates
  const languagesSection = extractSection(text, [
    'languages', 'language skills', 'language proficiency', 'linguistic skills',
    'foreign languages', 'spoken languages', 'language competencies', 'multilingual skills',
    'language qualifications', 'language certificates'
  ]);
  
  if (!languagesSection) {
    return '';
  }
  
  // Process the languages section
  const languages = [];
  
  // Pattern 1: Languages listed with bullets or dashes
  const bulletedLanguages = languagesSection.match(/(?:•|-|\*|\+)\s*([^•\-\*\+\n]+)/g);
  if (bulletedLanguages) {
    bulletedLanguages.forEach(lang => {
      const cleanedLang = lang.replace(/^[•\-\*\+\s]+/, '').trim();
      if (cleanedLang && !languages.includes(cleanedLang)) {
        languages.push(cleanedLang);
      }
    });
  }
  
  // Pattern 2: Languages on separate lines
  const lines = languagesSection.split('\n');
  lines.forEach(line => {
    const cleanedLine = line.trim();
    // Skip lines that are likely headers
    if (cleanedLine && !cleanedLine.toLowerCase().includes('language') && 
        cleanedLine.length < 50 && !languages.includes(cleanedLine)) {
      languages.push(cleanedLine);
    }
  });
  
  // Pattern 3: Languages with proficiency levels - enhanced for academic CV formats
  const languageWithLevel = languagesSection.match(/([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*[-:–]\s*([A-Za-z\s]+)/g);
  if (languageWithLevel) {
    languageWithLevel.forEach(lang => {
      if (!languages.includes(lang.trim())) {
        languages.push(lang.trim());
      }
    });
  }
  
  // Pattern 4: Common language proficiency formats (CEFR, ILR, ACTFL)
  const cefrPattern = /([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*[-:–]?\s*(?:CEFR)?\s*(A1|A2|B1|B2|C1|C2)/gi;
  let cefrMatch;
  while ((cefrMatch = cefrPattern.exec(languagesSection)) !== null) {
    const language = cefrMatch[1].trim();
    const level = cefrMatch[2].toUpperCase();
    const formattedLang = `${language} - ${level}`;
    
    if (!languages.includes(formattedLang)) {
      languages.push(formattedLang);
    }
  }
  
  // Pattern 5: Common language level descriptors
  const levelPattern = /([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*[-:–]?\s*(native|fluent|proficient|advanced|intermediate|beginner|basic|elementary|professional|working|limited)/gi;
  let levelMatch;
  while ((levelMatch = levelPattern.exec(languagesSection)) !== null) {
    const language = levelMatch[1].trim();
    const level = levelMatch[2].trim();
    const formattedLang = `${language} - ${level}`;
    
    if (!languages.includes(formattedLang)) {
      languages.push(formattedLang);
    }
  }
  
  // Pattern 6: Common languages if none found
  if (languages.length === 0) {
    const commonLanguages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Russian', 'Portuguese', 'Italian'];
    
    for (const lang of commonLanguages) {
      const langRegex = new RegExp(`\\b${lang}\\b`, 'i');
      if (langRegex.test(text)) {
        languages.push(lang);
      }
    }
  }
  
  return languages.join(', ');
}

/**
 * Extract projects from text
 * @param {string} text - Resume text
 * @returns {Array} - Array of project objects
 */
function extractProjects(text) {
  // Enhanced implementation for Overleaf templates with more structured project information
  const projectsSection = extractSection(text, [
    'projects', 'personal projects', 'academic projects', 'portfolio', 'work samples',
    'research projects', 'key projects', 'notable projects', 'selected projects',
    'academic works', 'publications', 'implementations', 'software projects'
  ]);
  
  const projects = [];
  
  if (projectsSection) {
    // Try multiple patterns to extract projects with enhanced metadata for Overleaf templates
    
    // Pattern 1: Project with title and description on separate lines with metadata
    const projectPattern1 = /(?:project|application|portfolio item|publication)\s*:?\s*([^\n]+)\n([^\n]+)(?:[\s\S]*?(?:technology|tech stack|tools|languages|framework|library)\s*:?\s*([^\n]+))?/gi;
    let match1;
    while ((match1 = projectPattern1.exec(projectsSection)) !== null) {
      // Extract GitHub and live links if present
      const githubLink = extractGithubProjectUrl(match1[0]);
      const liveLink = extractLiveProjectUrl(match1[0]);
      
      // Extract date range
      const dateRange = extractDateRange(match1[0]);
      
      projects.push({
        name: match1[1].trim(),
        description: match1[2].trim(),
        technologies: match1[3] ? match1[3].trim() : '',
        githubLink: githubLink || '',
        liveLink: liveLink || '',
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || '',
        role: extractProjectRole(match1[0]) || ''
      });
    }
    
    // Pattern 2: Projects with bullet points - enhanced to capture technologies and links
    if (projects.length === 0) {
      const projectTitleRegex = /[•\-*]\s*([A-Z][^\n:]+)(?::|\n)/g;
      let match2;
      while ((match2 = projectTitleRegex.exec(projectsSection)) !== null) {
        const projectName = match2[1].trim();
        const startIndex = match2.index + match2[0].length;
        let endIndex = projectsSection.indexOf('•', startIndex) > -1 ? 
          projectsSection.indexOf('•', startIndex) : projectsSection.length;
        
        // Look for the next project marker
        const nextProjectMarker = /[•\-*]\s*[A-Z]/g;
        nextProjectMarker.lastIndex = startIndex;
        const nextMatch = nextProjectMarker.exec(projectsSection);
        if (nextMatch && nextMatch.index < endIndex) {
          endIndex = nextMatch.index;
        }
        
        const projectContent = projectsSection.substring(startIndex, endIndex).trim();
        
        // Try to extract technologies from the project description
        let description = projectContent;
        let technologies = '';
        
        // Look for technology indicators
        const techIndicators = [
          /(?:technology|tech stack|tools|languages|built with|developed using|implemented with|framework|library|technologies used)\s*:?\s*([^\n]+)/i,
          /using\s+([^\n.,]+(?:\s*,\s*[^\n.,]+)*)/i,
          /with\s+([^\n.,]+(?:\s*,\s*[^\n.,]+)*)/i
        ];
        
        for (const indicator of techIndicators) {
          const techMatch = projectContent.match(indicator);
          if (techMatch) {
            technologies = techMatch[1].trim();
            // Remove the technology part from the description
            description = projectContent.replace(techMatch[0], '').trim();
            break;
          }
        }
        
        // Extract GitHub and live links
        const githubLink = extractGithubProjectUrl(projectContent);
        const liveLink = extractLiveProjectUrl(projectContent);
        
        // Extract date range
        const dateRange = extractDateRange(projectContent);
        
        // Extract role if present
        const role = extractProjectRole(projectContent);
        
        projects.push({
          name: projectName,
          description: description,
          technologies: technologies,
          githubLink: githubLink || '',
          liveLink: liveLink || '',
          startDate: dateRange.startDate || '',
          endDate: dateRange.endDate || '',
          role: role || ''
        });
      }
    }
    
    // Pattern 3: Projects separated by blank lines - enhanced for Overleaf format
    if (projects.length === 0) {
      const projectBlocks = projectsSection.split(/\n\s*\n/);
      projectBlocks.forEach(block => {
        if (block.trim()) {
          const lines = block.split('\n');
          if (lines.length >= 2) {
            // Try to identify project name, description, and technologies
            const projectName = lines[0].trim();
            let description = '';
            let technologies = '';
            
            // Look for technology indicators in the remaining lines
            const techLineIndex = lines.findIndex(line => 
              /(?:technology|tech stack|tools|languages|built with|developed using|implemented with|using|with|framework|library|technologies used)\s*:?/i.test(line)
            );
            
            if (techLineIndex > 0) {
              // Extract technologies from the tech line
              const techLine = lines[techLineIndex];
              const techMatch = techLine.match(/(?::|-)\s*(.+)$/);
              technologies = techMatch ? techMatch[1].trim() : techLine.replace(/.*?(?::|-)\s*/i, '').trim();
              
              // Description is everything between project name and tech line
              description = lines.slice(1, techLineIndex).join(' ').trim();
            } else {
              // No tech line found, description is everything after project name
              description = lines.slice(1).join(' ').trim();
            }
            
            // Extract GitHub and live links
            const githubLink = extractGithubProjectUrl(block);
            const liveLink = extractLiveProjectUrl(block);
            
            // Extract date range
            const dateRange = extractDateRange(block);
            
            // Extract role if present
            const role = extractProjectRole(block);
            
            projects.push({
              name: projectName,
              description: description,
              technologies: technologies,
              githubLink: githubLink || '',
              liveLink: liveLink || '',
              startDate: dateRange.startDate || '',
              endDate: dateRange.endDate || '',
              role: role || ''
            });
          }
        }
      });
    }
    
    // Pattern 4: Look for projects with date ranges (common in Overleaf templates)
    if (projects.length === 0) {
      const dateProjectRegex = /([A-Z][^\n]+)\s*\(\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}\s*(?:-|–|—)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|Present|Current|Now)\s*\d{0,4})\s*\)/gi;
      let dateMatch;
      
      while ((dateMatch = dateProjectRegex.exec(projectsSection)) !== null) {
        const projectName = dateMatch[1].trim();
        const projectDate = dateMatch[2].trim();
        const startIndex = dateMatch.index + dateMatch[0].length;
        let endIndex = projectsSection.length;
        
        // Find the next project with date
        dateProjectRegex.lastIndex = startIndex;
        const nextMatch = dateProjectRegex.exec(projectsSection);
        if (nextMatch) {
          dateProjectRegex.lastIndex = startIndex; // Reset for next iteration
          endIndex = nextMatch.index;
        }
        
        const projectContent = projectsSection.substring(startIndex, endIndex).trim();
        
        // Parse the date range
        const dateRange = extractDateRange(projectDate);
        
        // Extract GitHub and live links
        const githubLink = extractGithubProjectUrl(projectContent);
        const liveLink = extractLiveProjectUrl(projectContent);
        
        // Extract role if present
        const role = extractProjectRole(projectContent);
        
        // Extract technologies
        let technologies = '';
        const techMatch = projectContent.match(/(?:technology|tech stack|tools|languages|built with|developed using|implemented with|framework|library|technologies used)\s*:?\s*([^\n]+)/i);
        if (techMatch) {
          technologies = techMatch[1].trim();
        }
        
        projects.push({
          name: projectName,
          description: projectContent.replace(techMatch ? techMatch[0] : '', '').trim(),
          technologies: technologies,
          githubLink: githubLink || '',
          liveLink: liveLink || '',
          startDate: dateRange.startDate || '',
          endDate: dateRange.endDate || '',
          role: role || ''
        });
      }
    }
  }
  
  // If no projects found, add a default one
  if (projects.length === 0) {
    projects.push({
      name: 'Project',
      description: 'Please add your project description here',
      technologies: '',
      githubLink: '',
      liveLink: '',
      startDate: '',
      endDate: '',
      role: ''
    });
  }
  
  return projects;
}

/**
 * Extract GitHub project URL from text
 * @param {string} text - Project text
 * @returns {string|null} - GitHub project URL
 */
function extractGithubProjectUrl(text) {
  // Look for GitHub project URLs with common formats and labels
  const githubRegexes = [
    // Look for labeled GitHub URLs first
    /(?:github|repository|repo|source code|code)\s*:?\s*((?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+(?:\/[\w-]+)*)/i,
    // Then try general GitHub URL patterns
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+(?:\/[\w-]+)*/
  ];
  
  for (const regex of githubRegexes) {
    const match = text.match(regex);
    if (match) {
      // If it's a labeled match, return the captured group, otherwise return the whole match
      const url = regex.toString().includes('github|repository|repo') ? match[1] : match[0];
      
      // Ensure the URL has the https:// prefix
      if (!url.startsWith('http')) {
        return 'https://' + url;
      }
      return url;
    }
  }
  
  return null;
}

/**
 * Extract live project URL from text
 * @param {string} text - Project text
 * @returns {string|null} - Live project URL
 */
function extractLiveProjectUrl(text) {
  // Look for live project URLs with common formats and labels
  const liveRegexes = [
    // Look for labeled live URLs first
    /(?:live|demo|website|deployed|production|app|application|site|preview)\s*:?\s*((?:https?:\/\/)?(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[\w-\.\/?%&=]*)?)/i,
    // Then try to find URLs that aren't GitHub
    /(?:https?:\/\/)?(?:www\.)?(?!github\.com)[\w-]+\.[a-z]{2,}(?:\/[\w-\.\/?%&=]*)?/
  ];
  
  for (const regex of liveRegexes) {
    const match = text.match(regex);
    if (match) {
      // If it's a labeled match, return the captured group, otherwise return the whole match
      const url = regex.toString().includes('live|demo|website') ? match[1] : match[0];
      
      // Ensure the URL has the https:// prefix
      if (!url.startsWith('http')) {
        return 'https://' + url;
      }
      return url;
    }
  }
  
  return null;
}

/**
 * Extract project role from text
 * @param {string} text - Project text
 * @returns {string|null} - Project role
 */
function extractProjectRole(text) {
  // Look for role indicators in the project text
  const roleRegexes = [
    /(?:role|position|responsibility|title)\s*:?\s*([^\n,]+)/i,
    /(?:as|worked as)\s+(?:a|an)?\s+([^\n,\.]+)/i
  ];
  
  for (const regex of roleRegexes) {
    const match = text.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract work experience from text
 * @param {string} text - Resume text
 * @returns {Array} - Array of work experience objects
 */
function extractWorkExperience(text) {
  // Enhanced implementation for Overleaf templates with more structured work experience information
  const experienceSection = extractSection(text, [
    'experience', 'work experience', 'employment history', 'professional experience', 'work history',
    'career history', 'professional background', 'employment record', 'job history', 'professional appointments',
    'academic positions', 'teaching experience', 'research experience', 'industry experience'
  ]);
  
  const workExperiences = [];
  
  if (experienceSection) {
    // Try multiple patterns to extract work experiences with enhanced metadata
    
    // Pattern 1: Company with labeled format - enhanced for Overleaf templates
    const companyLabeledRegex = /(?:company|employer|organization|firm|institution|university|college)\s*:?\s*([^\n]+)/gi;
    let match1;
    while ((match1 = companyLabeledRegex.exec(experienceSection)) !== null) {
      const company = match1[1].trim();
      const startIndex = match1.index + match1[0].length;
      const endIndex = experienceSection.indexOf('company', startIndex) > -1 ? 
        experienceSection.indexOf('company', startIndex) : experienceSection.length;
      
      const experienceBlock = experienceSection.substring(startIndex, endIndex).trim();
      
      // Extract additional metadata
      const position = extractPattern(experienceBlock, /(?:position|title|role|designation|job title)\s*:?\s*([^\n,]+)/i);
      const duration = extractPattern(experienceBlock, /(?:duration|period|timeframe)\s*:?\s*([^\n,]+)/i);
      const location = extractPattern(experienceBlock, /(?:location|place|city|site|address)\s*:?\s*([^\n,]+)/i);
      
      // Extract date range
      const dateRange = extractDateRange(experienceBlock);
      
      // Extract responsibilities and achievements
      let responsibilities = '';
      let achievements = '';
      
      // Look for responsibilities section
      const respMatch = experienceBlock.match(/(?:responsibilities|duties|tasks|key responsibilities)\s*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
      if (respMatch) {
        responsibilities = respMatch[1].trim();
      }
      
      // Look for achievements section
      const achieveMatch = experienceBlock.match(/(?:achievements|accomplishments|key achievements|results)\s*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
      if (achieveMatch) {
        achievements = achieveMatch[1].trim();
      }
      
      // Extract responsibilities/description
      let description = experienceBlock;
      // Remove the extracted metadata from description
      if (position) description = description.replace(new RegExp(`(?:position|title|role|designation|job title)\\s*:?\\s*${escapeRegExp(position)}`, 'i'), '');
      if (duration) description = description.replace(new RegExp(`(?:duration|period|timeframe)\\s*:?\\s*${escapeRegExp(duration)}`, 'i'), '');
      if (location) description = description.replace(new RegExp(`(?:location|place|city|site|address)\\s*:?\\s*${escapeRegExp(location)}`, 'i'), '');
      if (dateRange.startDate || dateRange.endDate) {
        const datePattern = new RegExp(`${dateRange.startDate}\\s*(?:-|to|–|—)\\s*${dateRange.endDate || 'present|current|now'}`, 'i');
        description = description.replace(datePattern, '');
      }
      if (respMatch) description = description.replace(respMatch[0], '');
      if (achieveMatch) description = description.replace(achieveMatch[0], '');
      
      description = description.trim();
      
      workExperiences.push({
        company,
        position: position || '',
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || '',
        duration: duration || '',
        location: location || '',
        description,
        responsibilities: responsibilities || '',
        achievements: achievements || ''
      });
    }
    
    // Pattern 2: Companies with bullet points or dates - enhanced for Overleaf templates
    if (workExperiences.length === 0) {
      // Look for company names followed by dates in parentheses or with bullet points
      const companyDateRegex = /[•\-*]?\s*([A-Z][^\n,]+)(?:[,\s]+|\s*\(|\s*-\s*)(?:[A-Za-z]+\s+)?(?:(?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December))/g;
      let match2;
      while ((match2 = companyDateRegex.exec(experienceSection)) !== null) {
        const company = match2[1].trim();
        const startIndex = match2.index + match2[0].length;
        let endIndex = experienceSection.length;
        
        // Find the next company or bullet point
        const nextCompanyMatch = /[•\-*]?\s*[A-Z][^\n,]+(?:[,\s]+|\s*\(|\s*-\s*)(?:[A-Za-z]+\s+)?(?:(?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December))/g;
        nextCompanyMatch.lastIndex = startIndex;
        const nextMatch = nextCompanyMatch.exec(experienceSection);
        if (nextMatch) {
          endIndex = nextMatch.index;
        }
        
        const experienceBlock = experienceSection.substring(startIndex, endIndex).trim();
        
        // Extract position/title - common in Overleaf templates
        let position = '';
        const positionMatch = experienceBlock.match(/^([^\n,]+?)(?:,|\n|\s{2,}|\s+at\s+|\s+in\s+)/i);
        if (positionMatch) {
          position = positionMatch[1].trim();
        }
        
        // Extract date range
        const dateRange = extractDateRange(experienceBlock);
        
        // Extract location
        let location = '';
        const locationMatch = experienceBlock.match(/(?:,\s*|\n|\s+at\s+|\s+in\s+)([A-Z][a-zA-Z\s,]+)(?:\.|\n|$)/i);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
        
        // Extract responsibilities and achievements
        let responsibilities = '';
        let achievements = '';
        
        // Look for responsibilities section
        const respMatch = experienceBlock.match(/(?:responsibilities|duties|tasks|key responsibilities)\s*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
        if (respMatch) {
          responsibilities = respMatch[1].trim();
        } else {
          // Try to extract responsibilities from bullet points
          const bulletPoints = experienceBlock.match(/[•\-*]\s*([^\n•\-*]+)/g);
          if (bulletPoints && bulletPoints.length > 0) {
            responsibilities = bulletPoints.map(point => point.replace(/^[•\-*]\s*/, '').trim()).join('\n');
          }
        }
        
        // Look for achievements section
        const achieveMatch = experienceBlock.match(/(?:achievements|accomplishments|key achievements|results)\s*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
        if (achieveMatch) {
          achievements = achieveMatch[1].trim();
        }
        
        // Extract description - everything after the first line or after metadata
        let description = experienceBlock;
        const firstLineEnd = experienceBlock.indexOf('\n');
        if (firstLineEnd > -1) {
          description = experienceBlock.substring(firstLineEnd).trim();
        } else if (position || dateRange.startDate || location) {
          // If we have metadata but no newline, try to extract description after metadata
          const metadataPattern = new RegExp(`^${escapeRegExp(position || '')}.*?${dateRange.startDate || ''}.*?${dateRange.endDate || ''}.*?${location || ''}`, 'i');
          const metadataMatch = experienceBlock.match(metadataPattern);
          if (metadataMatch) {
            description = experienceBlock.substring(metadataMatch[0].length).trim();
          }
        }
        
        // Clean up description - remove bullet points at the beginning of lines
        description = description.replace(/^[•\-*]\s*/gm, '').trim();
        
        // If we have responsibilities from bullet points but no description, use the first bullet as description
        if (!description && responsibilities) {
          const firstBullet = responsibilities.split('\n')[0];
          if (firstBullet) {
            description = firstBullet;
            responsibilities = responsibilities.replace(firstBullet, '').trim();
          }
        }
        
        workExperiences.push({
          company,
          position: position || '',
          startDate: dateRange.startDate || '',
          endDate: dateRange.endDate || '',
          location: location || '',
          description,
          responsibilities: responsibilities || '',
          achievements: achievements || ''
        });
      }
    }
    
    // Pattern 3: Experience blocks separated by blank lines - enhanced for Overleaf templates
    if (workExperiences.length === 0) {
      const experienceBlocks = experienceSection.split(/\n\s*\n/);
      experienceBlocks.forEach(block => {
        if (block.trim()) {
          const lines = block.split('\n');
          if (lines.length >= 2) {
            // First line typically contains company and/or position
            const firstLine = lines[0].trim();
            
            // Try to extract company and position from first line
            let company = firstLine;
            let position = '';
            
            // Check for common patterns like "Position at Company" or "Company - Position"
            const positionAtCompanyMatch = firstLine.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
            const companyDashPositionMatch = firstLine.match(/(.+?)\s*[-–—]\s*(.+)/i);
            
            if (positionAtCompanyMatch) {
              position = positionAtCompanyMatch[1].trim();
              company = positionAtCompanyMatch[2].trim();
            } else if (companyDashPositionMatch) {
              company = companyDashPositionMatch[1].trim();
              position = companyDashPositionMatch[2].trim();
            }
            
            // Extract date range
            const dateRange = extractDateRange(block);
            
            // Extract location
            let location = '';
            const locationMatch = block.match(/(?:,\s*|\n|\s+at\s+|\s+in\s+)([A-Z][a-zA-Z\s,]+)(?:\.|\n|$)/i);
            if (locationMatch) {
              location = locationMatch[1].trim();
            }
            
            // Extract responsibilities and achievements
            let responsibilities = '';
            let achievements = '';
            
            // Look for responsibilities section
            const respMatch = block.match(/(?:responsibilities|duties|tasks|key responsibilities)\s*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
            if (respMatch) {
              responsibilities = respMatch[1].trim();
            } else {
              // Try to extract responsibilities from bullet points
              const bulletPoints = block.match(/[•\-*]\s*([^\n•\-*]+)/g);
              if (bulletPoints && bulletPoints.length > 0) {
                responsibilities = bulletPoints.map(point => point.replace(/^[•\-*]\s*/, '').trim()).join('\n');
              }
            }
            
            // Look for achievements section
            const achieveMatch = block.match(/(?:achievements|accomplishments|key achievements|results)\s*:?\s*([^\n]+(?:\n[^\n]+)*)/i);
            if (achieveMatch) {
              achievements = achieveMatch[1].trim();
            }
            
            // Extract description - everything after the first line
            let description = lines.slice(1).join('\n').trim();
            
            // Clean up description - remove bullet points at the beginning of lines
            description = description.replace(/^[•\-*]\s*/gm, '').trim();
            
            // If we have responsibilities from bullet points but no description, use the first bullet as description
            if (!description && responsibilities) {
              const firstBullet = responsibilities.split('\n')[0];
              if (firstBullet) {
                description = firstBullet;
                responsibilities = responsibilities.replace(firstBullet, '').trim();
              }
            }
            
            workExperiences.push({
              company,
              position: position || '',
              startDate: dateRange.startDate || '',
              endDate: dateRange.endDate || '',
              location: location || '',
              description,
              responsibilities: responsibilities || '',
              achievements: achievements || ''
            });
          }
        }
      });
    }
    
    // Pattern 4: Academic CV format with teaching/research positions
    if (workExperiences.length === 0) {
      const academicPositionRegex = /(?:professor|lecturer|instructor|researcher|fellow|assistant|associate|adjunct|postdoc|post-doc|teaching assistant|research assistant)\s+(?:at|of|in)\s+([^\n,]+)/gi;
      let academicMatch;
      
      while ((academicMatch = academicPositionRegex.exec(experienceSection)) !== null) {
        const position = academicMatch[0].split(/\s+(?:at|of|in)\s+/)[0].trim();
        const company = academicMatch[1].trim();
        const startIndex = academicMatch.index + academicMatch[0].length;
        let endIndex = experienceSection.length;
        
        // Find the next academic position
        academicPositionRegex.lastIndex = startIndex;
        const nextMatch = academicPositionRegex.exec(experienceSection);
        if (nextMatch) {
          academicPositionRegex.lastIndex = startIndex; // Reset for next iteration
          endIndex = nextMatch.index;
        }
        
        const experienceBlock = experienceSection.substring(startIndex, endIndex).trim();
        
        // Extract date range
        const dateRange = extractDateRange(experienceBlock);
        
        // Extract location
        let location = '';
        const locationMatch = experienceBlock.match(/(?:,\s*|\n|\s+at\s+|\s+in\s+)([A-Z][a-zA-Z\s,]+)(?:\.|\n|$)/i);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
        
        // Extract description
        let description = experienceBlock;
        
        // Clean up description - remove bullet points at the beginning of lines
        description = description.replace(/^[•\-*]\s*/gm, '').trim();
        
        workExperiences.push({
          company,
          position,
          startDate: dateRange.startDate || '',
          endDate: dateRange.endDate || '',
          location: location || '',
          description,
          responsibilities: '',
          achievements: ''
        });
      }
    }
  }
  
  // If no work experience found, add a default one
  if (workExperiences.length === 0) {
    workExperiences.push({
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
      responsibilities: '',
      achievements: ''
    });
  }
  
  return workExperiences;
}

/**
 * Helper function to extract date range from text
 * @param {string} text - Text to extract date range from
 * @returns {Object} - Object with startDate and endDate
 */
function extractDateRange(text) {
  const result = {
    startDate: '',
    endDate: ''
  };
  
  // Look for date ranges in various formats
  const dateRangePatterns = [
    // YYYY-YYYY or YYYY to YYYY or YYYY — YYYY
    /((?:19|20)\d{2})\s*(?:-|to|–|—)\s*((?:19|20)\d{2}|present|current|now)/i,
    
    // Month YYYY - Month YYYY
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2})\s*(?:-|to|–|—)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2}|present|current|now)/i,
    
    // MM/YYYY - MM/YYYY
    /(\d{1,2}\/(?:19|20)\d{2})\s*(?:-|to|–|—)\s*(\d{1,2}\/(?:19|20)\d{2}|present|current|now)/i
  ];
  
  for (const pattern of dateRangePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.startDate = match[1];
      result.endDate = match[2].toLowerCase() === 'present' || 
                      match[2].toLowerCase() === 'current' || 
                      match[2].toLowerCase() === 'now' ? 
                      'Present' : match[2];
      break;
    }
  }
  
  return result;
}

/**
 * Helper function to escape special characters in a string for use in a regular expression
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract certifications from text
 * @param {string} text - Resume text
 * @returns {string} - Certifications
 */
function extractCertifications(text) {
  const certificationsSection = extractSection(text, ['certifications', 'certificates', 'credentials']);
  
  // Simple implementation
  if (certificationsSection) {
    return certificationsSection.replace(/certifications|certificates|credentials/gi, '').trim();
  }
  
  return '';
}

/**
 * Calculate years of experience from text
 * @param {string} text - Resume text
 * @returns {number} - Years of experience
 */
function calculateExperience(text) {
  // Look for patterns like "X years of experience"
  const experienceRegex = /(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience/i;
  const match = text.match(experienceRegex);
  
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // If no explicit mention, try to calculate from work history
  const experienceSection = extractSection(text, ['experience', 'work experience', 'employment history']);
  const yearRegex = /(?:19|20)\d{2}\s*-\s*(?:19|20)\d{2}|(?:19|20)\d{2}\s*-\s*present/gi;
  
  let totalYears = 0;
  let match2;
  
  while ((match2 = yearRegex.exec(experienceSection)) !== null) {
    const yearRange = match2[0];
    const years = yearRange.split(/\s*-\s*/);
    
    let startYear = parseInt(years[0], 10);
    let endYear;
    
    if (years[1].toLowerCase() === 'present') {
      endYear = new Date().getFullYear();
    } else {
      endYear = parseInt(years[1], 10);
    }
    
    totalYears += (endYear - startYear);
  }
  
  return totalYears || 0;
}

/**
 * Extract a section from text based on section headers
 * @param {string} text - Resume text
 * @param {Array} sectionHeaders - Possible section headers
 * @returns {string} - Extracted section text
 */
function extractSection(text, sectionHeaders) {
  let sectionText = '';
  
  // Common section headers that might appear in resumes and academic CVs
  const commonHeaders = [
    'education', 'experience', 'skills', 'projects', 'certifications',
    'achievements', 'publications', 'references', 'interests', 'summary',
    'objective', 'profile', 'contact', 'personal', 'work history',
    'employment', 'qualifications', 'languages', 'awards', 'volunteer',
    'research', 'teaching', 'grants', 'funding', 'conferences', 'presentations',
    'professional activities', 'memberships', 'affiliations', 'service',
    'honors', 'distinctions', 'extracurricular', 'activities', 'leadership',
    'technical skills', 'soft skills', 'coursework', 'training', 'workshops'
  ];
  
  for (const header of sectionHeaders) {
    // Try different patterns for section headers - enhanced for Overleaf templates
    const headerPatterns = [
      // Header with colon
      new RegExp(`\\b${header}\\s*:\\s*[^\n]*\n`, 'i'),
      // Header with underline (===== or -----)
      new RegExp(`\\b${header}\\b[^\n]*\n[-=]+\n`, 'i'),
      // Header in all caps
      new RegExp(`\\b${header.toUpperCase()}\\b[^\n]*\n`, 'i'),
      // Header with brackets or parentheses
      new RegExp(`\\[\\s*${header}\\s*\\]|\\(\\s*${header}\\s*\\)`, 'i'),
      // Header with special formatting (common in LaTeX/Overleaf templates)
      new RegExp(`\\\\section\\{${header}\\}|\\\\subsection\\{${header}\\}`, 'i'),
      // Header with numbering
      new RegExp(`\\d+\\.\\s*${header}\\b[^\n]*\n`, 'i'),
      // Standard header
      new RegExp(`\\b${header}\\b[^\n]*\n`, 'i')
    ];
    
    let match = null;
    let matchedPattern = null;
    
    // Try each pattern until we find a match
    for (const pattern of headerPatterns) {
      const patternMatch = text.match(pattern);
      if (patternMatch) {
        match = patternMatch;
        matchedPattern = pattern;
        break;
      }
    }
    
    if (match) {
      const startIndex = match.index + match[0].length;
      let endIndex = text.length;
      
      // Find the next section header
      for (const nextHeader of commonHeaders) {
        if (nextHeader === header) continue;
        
        // Try different patterns for the next header - enhanced for Overleaf templates
        const nextHeaderPatterns = [
          new RegExp(`\\b${nextHeader}\\s*:\\s*[^\n]*\n`, 'i'),
          new RegExp(`\\b${nextHeader}\\b[^\n]*\n[-=]+\n`, 'i'),
          new RegExp(`\\b${nextHeader.toUpperCase()}\\b[^\n]*\n`, 'i'),
          new RegExp(`\\[\\s*${nextHeader}\\s*\\]|\\(\\s*${nextHeader}\\s*\\)`, 'i'),
          new RegExp(`\\\\section\\{${nextHeader}\\}|\\\\subsection\\{${nextHeader}\\}`, 'i'),
          new RegExp(`\\d+\\.\\s*${nextHeader}\\b[^\n]*\n`, 'i'),
          new RegExp(`\\b${nextHeader}\\b[^\n]*\n`, 'i')
        ];
        
        for (const nextPattern of nextHeaderPatterns) {
          const nextMatch = text.substring(startIndex).match(nextPattern);
          
          if (nextMatch) {
            const nextHeaderIndex = startIndex + nextMatch.index;
            if (nextHeaderIndex < endIndex) {
              endIndex = nextHeaderIndex;
            }
            break;
          }
        }
      }
      
      sectionText = text.substring(startIndex, endIndex).trim();
      
      // If section is too short, it might be a false positive
      if (sectionText.length < 10 && sectionHeaders.length > 1) {
        continue; // Try the next header in the list
      }
      
      break;
    }
  }
  
  return sectionText;
}

/**
 * Extract a pattern from text
 * @param {string} text - Text to search in
 * @param {RegExp} regex - Regular expression pattern
 * @returns {string} - Extracted value or empty string
 */
function extractPattern(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}