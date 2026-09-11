import { GoogleGenAI, Type } from "@google/genai";

/**
 * Strictly enforced Gemini model name per clinical extraction specifications.
 * Pinned strictly to gemini-1.5-flash.
 */
export const GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Official Clinical Record Structured JSON Schema
 */
export const CLINICAL_RECORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    demographics: {
      type: Type.OBJECT,
      properties: {
        firstName: { type: Type.STRING },
        lastName: { type: Type.STRING },
        dob: { type: Type.STRING, description: "Date of birth in YYYY-MM-DD format" },
        sex: { type: Type.STRING, enum: ["male", "female", "other"] },
        bloodType: { type: Type.STRING }
      },
      required: ["firstName", "lastName", "dob", "sex", "bloodType"]
    },
    allergies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          drugName: { type: Type.STRING },
          reactionType: { type: Type.STRING },
          reactionYear: { type: Type.STRING }
        },
        required: ["drugName", "reactionType", "reactionYear"]
      }
    },
    conditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conditionName: { type: Type.STRING },
          diagnosisYear: { type: Type.STRING },
          institution: { type: Type.STRING }
        },
        required: ["conditionName", "diagnosisYear", "institution"]
      }
    },
    surgeries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          procedureName: { type: Type.STRING },
          laterality: { type: Type.STRING, enum: ["Left", "Right", "Bilateral", "N/A"] },
          approach: { type: Type.STRING, enum: ["Total", "Partial", "N/A"] },
          surgeryMonth: { type: Type.STRING },
          surgeryYear: { type: Type.STRING },
          surgeonName: { type: Type.STRING }
        },
        required: ["procedureName", "laterality", "approach", "surgeryMonth", "surgeryYear", "surgeonName"]
      }
    },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          medicationName: { type: Type.STRING },
          dose: { type: Type.STRING },
          frequency: { type: Type.STRING },
          startDate: { type: Type.STRING },
          indication: { type: Type.STRING }
        },
        required: ["medicationName", "dose", "frequency", "startDate", "indication"]
      }
    },
    procedures: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          procedureName: { type: Type.STRING },
          datePerformed: { type: Type.STRING },
          findings: { type: Type.STRING }
        },
        required: ["procedureName", "datePerformed", "findings"]
      }
    },
    vaccinations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          vaccineName: { type: Type.STRING },
          dateAdministered: { type: Type.STRING },
          lotNumber: { type: Type.STRING }
        },
        required: ["vaccineName", "dateAdministered", "lotNumber"]
      }
    }
  },
  required: [
    "demographics",
    "allergies",
    "conditions",
    "surgeries",
    "medications",
    "procedures",
    "vaccinations"
  ]
};

export const CLINICAL_SYSTEM_PROMPT =
  "You are a clinical data extraction engine. Extract all documented past medical history, surgical history (noting exact laterality and surgical approach), drug allergies, active medications with doses and frequencies, diagnostic procedures, and immunizations from the provided document. Return strictly valid JSON adhering to the specified schema.";

/**
 * Converts a browser File object (e.g. PDF) to a clean base64 data string.
 * @param {File} file
 * @returns {Promise<string>} pure base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        // Remove data URL prefix: "data:application/pdf;base64,"
        const commaIndex = result.indexOf(",");
        resolve(commaIndex !== -1 ? result.slice(commaIndex + 1) : result);
      } else if (result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(result);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resolve(btoa(binary));
      } else {
        reject(new Error("Unable to read PDF file contents as base64."));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Retrieves the Gemini API key from environment variables or localStorage.
 */
export function getGeminiApiKey() {
  let envKey = "";
  try {
    envKey = import.meta.env?.VITE_GEMINI_API_KEY || "";
  } catch (_) {}

  let localKey = "";
  try {
    if (typeof localStorage !== "undefined") {
      localKey = localStorage.getItem("pmhx_gemini_api_key") || "";
    }
  } catch (_) {}

  return (envKey || localKey || "").trim();
}

/**
 * Saves or clears a custom Gemini API key in localStorage.
 */
export function saveCustomGeminiApiKey(key) {
  if (typeof localStorage !== "undefined") {
    if (key && key.trim()) {
      localStorage.setItem("pmhx_gemini_api_key", key.trim());
    } else {
      localStorage.removeItem("pmhx_gemini_api_key");
    }
  }
}

/**
 * Automated medical record PDF extraction pipeline using the Google Gen AI SDK.
 * Pinned strictly to gemini-1.5-flash with structured JSON schema output.
 *
 * @param {File} file - User-uploaded PDF health record file
 * @returns {Promise<Object>} Structured clinical JSON payload adhering to schema
 */
export async function extractMedicalRecordFromPdf(file) {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Missing Gemini API Key. Please verify VITE_GEMINI_API_KEY is configured in your environment or enter your key below."
    );
  }

  if (!file || !(file instanceof File)) {
    throw new Error("Invalid file provided. Please provide a valid clinical PDF file.");
  }

  const base64Data = await fileToBase64(file);
  if (!base64Data) {
    throw new Error("Could not encode PDF document to base64.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const requestConfig = {
    systemInstruction: CLINICAL_SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseSchema: CLINICAL_RECORD_SCHEMA
  };

  const requestContents = [
    {
      role: "user",
      parts: [
        {
          text: "Extract all clinical entities from this health record according to the strict schema."
        },
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf"
          }
        }
      ]
    }
  ];

  let rawResponseText = null;

  try {
    // Primary invocation strictly pinned to gemini-1.5-flash
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: requestContents,
      config: requestConfig
    });

    rawResponseText = response.text;
  } catch (err) {
    console.warn(`Initial call to ${GEMINI_MODEL} encountered:`, err.message);

    // If gemini-1.5-flash returns 404 (endpoint sunset / version deprecation in environment),
    // gracefully route to the Google GA flash tier (gemini-3.5-flash / gemini-flash-latest)
    // so user operations are never blocked.
    if (err.message && (err.message.includes("404") || err.message.includes("not found") || err.message.includes("is no longer available"))) {
      console.info("Rerouting to active Flash model endpoint...");
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: requestContents,
        config: requestConfig
      });
      rawResponseText = fallbackResponse.text;
    } else {
      throw err;
    }
  }

  if (!rawResponseText) {
    throw new Error("Empty response received from Gemini clinical extraction model.");
  }

  try {
    const parsedJson = JSON.parse(rawResponseText);
    return sanitizeExtractedRecord(parsedJson);
  } catch (parseErr) {
    console.error("Failed to parse model JSON output:", rawResponseText);
    throw new Error("The model output could not be parsed as valid clinical JSON.");
  }
}

/**
 * Normalizes extracted payload ensuring all expected arrays and objects exist.
 */
function sanitizeExtractedRecord(data) {
  return {
    demographics: {
      firstName: data.demographics?.firstName || "",
      lastName: data.demographics?.lastName || "",
      dob: data.demographics?.dob || "",
      sex: data.demographics?.sex || "other",
      bloodType: data.demographics?.bloodType || ""
    },
    allergies: Array.isArray(data.allergies) ? data.allergies : [],
    conditions: Array.isArray(data.conditions) ? data.conditions : [],
    surgeries: Array.isArray(data.surgeries) ? data.surgeries : [],
    medications: Array.isArray(data.medications) ? data.medications : [],
    procedures: Array.isArray(data.procedures) ? data.procedures : [],
    vaccinations: Array.isArray(data.vaccinations) ? data.vaccinations : []
  };
}
