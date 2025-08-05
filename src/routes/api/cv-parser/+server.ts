import { json } from "@sveltejs/kit";
import { openai } from "$lib/openai";
import type { RequestHandler } from "./$types";

// Define the structure we want to extract from CVs
interface ExtractedCVData {
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  experience: {
    title: string;
    company: string;
    duration: string;
    description: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
    field: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    year: string;
  }[];
  achievements: string[];
}

const systemPrompt = `You are an expert CV/Resume parser. Extract structured information from the provided CV text.
Return a JSON object with the following structure:
{
  "summary": "A brief 2-3 sentence professional summary",
  "skills": {
    "technical": ["skill1", "skill2", ...],
    "soft": ["skill1", "skill2", ...],
    "languages": ["language1 (proficiency)", ...]
  },
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "description": "Brief description of key responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/School Name",
      "year": "Graduation Year",
      "field": "Field of Study"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "year": "Year Obtained"
    }
  ],
  "achievements": ["achievement1", "achievement2", ...]
}

Be accurate and extract only information that is clearly stated in the CV. If a section is not present, return an empty array or appropriate empty value.`;

/**
 * POST /api/cv-parser
 * Body: { cvText: string, fileType: 'pdf' | 'doc' | 'docx' }
 * Returns: { extractedData: ExtractedCVData, success: boolean, error?: string }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { cvText, fileType } = await request.json();

    if (!cvText || typeof cvText !== "string") {
      return json({ 
        success: false, 
        error: "CV text is required" 
      }, { status: 400 });
    }

    // Use GPT-4 for better extraction accuracy
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Parse the following CV and extract structured information:\n\n${cvText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 2000,
    });

    const extractedData = JSON.parse(
      completion.choices[0].message?.content ?? "{}"
    );

    // Validate the extracted data structure
    const validatedData: ExtractedCVData = {
      summary: extractedData.summary || "",
      skills: {
        technical: Array.isArray(extractedData.skills?.technical) 
          ? extractedData.skills.technical 
          : [],
        soft: Array.isArray(extractedData.skills?.soft) 
          ? extractedData.skills.soft 
          : [],
        languages: Array.isArray(extractedData.skills?.languages) 
          ? extractedData.skills.languages 
          : [],
      },
      experience: Array.isArray(extractedData.experience) 
        ? extractedData.experience 
        : [],
      education: Array.isArray(extractedData.education) 
        ? extractedData.education 
        : [],
      certifications: Array.isArray(extractedData.certifications) 
        ? extractedData.certifications 
        : [],
      achievements: Array.isArray(extractedData.achievements) 
        ? extractedData.achievements 
        : [],
    };

    return json({
      success: true,
      extractedData: validatedData,
    });
  } catch (error) {
    console.error("CV parsing failed:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse CV",
    }, { status: 500 });
  }
};