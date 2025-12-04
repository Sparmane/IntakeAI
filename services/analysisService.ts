

import { GoogleGenAI, Type } from "@google/genai";
import { FullSessionExport } from "../types";
import { AI_CONFIG, getAnalysisModelName } from "../config";

// Define the response schema structure for the API
const sessionExportSchema = {
  type: Type.OBJECT,
  properties: {
    session_id: { type: Type.STRING },
    completion_timestamp: { type: Type.STRING, nullable: true },
    completeness_percentage: { type: Type.NUMBER },
    data_quality: { type: Type.STRING },
    artifacts: {
      type: Type.OBJECT,
      properties: {
        project_charter: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            fields: {
              type: Type.OBJECT,
              properties: {
                problem_statement: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                business_objectives: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                scope_inclusions: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                scope_exclusions: { type: Type.OBJECT, properties: { value: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                assumptions: { type: Type.OBJECT, properties: { value: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                constraints: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                budget_range: { type: Type.OBJECT, properties: { value: { type: Type.STRING, nullable: true }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                key_stakeholders: { type: Type.OBJECT, properties: { value: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                success_criteria: { type: Type.OBJECT, properties: { value: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } },
                target_timeline: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, discussion_status: { type: Type.STRING }, captured_at: { type: Type.STRING, nullable: true }, confirmed: { type: Type.BOOLEAN } } }
              },
              required: ['problem_statement', 'business_objectives', 'scope_inclusions', 'scope_exclusions', 'assumptions', 'constraints', 'budget_range', 'key_stakeholders', 'success_criteria', 'target_timeline']
            }
          },
          required: ['status', 'fields']
        },
        requirements: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            functional: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  captured_at: { type: Type.STRING },
                  confirmed: { type: Type.BOOLEAN }
                },
                required: ['id', 'description', 'captured_at', 'confirmed']
              }
            },
            non_functional: {
              type: Type.OBJECT,
              properties: {
                performance: { type: Type.ARRAY, items: { type: Type.STRING } },
                security: { type: Type.ARRAY, items: { type: Type.STRING } },
                reliability: { type: Type.ARRAY, items: { type: Type.STRING } },
                usability: { type: Type.ARRAY, items: { type: Type.STRING } },
                scalability: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['performance', 'security', 'reliability', 'usability', 'scalability']
            },
            technical_constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
            integration_points: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['status', 'functional', 'non_functional', 'technical_constraints', 'integration_points']
        },
        user_stories: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            stories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  as_a: { type: Type.STRING },
                  i_want: { type: Type.STRING },
                  so_that: { type: Type.STRING },
                  acceptance_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                  priority: { type: Type.STRING },
                  story_points: { type: Type.NUMBER, nullable: true },
                  captured_at: { type: Type.STRING },
                  confirmed: { type: Type.BOOLEAN }
                },
                required: ['id', 'as_a', 'i_want', 'so_that', 'acceptance_criteria', 'priority', 'captured_at', 'confirmed']
              }
            }
          },
          required: ['status', 'stories']
        },
        prd_enhancements: {
           type: Type.OBJECT,
           properties: {
             status: { type: Type.STRING },
             business_rules: { type: Type.OBJECT, properties: { rules: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING } } },
             data_requirements: { type: Type.OBJECT, properties: { data_elements: { type: Type.ARRAY, items: { type: Type.STRING } }, integration_needs: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING } } },
             success_metrics: { type: Type.OBJECT, properties: { kpis: { type: Type.ARRAY, items: { type: Type.STRING } }, analytics_requirements: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING } } },
             user_journeys: { type: Type.OBJECT, properties: { journeys: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING } } },
             user_personas: { type: Type.OBJECT, properties: { personas: { type: Type.ARRAY, items: { type: Type.STRING } }, discussion_status: { type: Type.STRING } } }
           },
           required: ['status', 'business_rules', 'data_requirements', 'success_metrics', 'user_journeys', 'user_personas']
        }
      },
      required: ['project_charter', 'requirements', 'user_stories', 'prd_enhancements']
    },
    summary: {
      type: Type.OBJECT,
      properties: {
        completion_percentage: { type: Type.NUMBER },
        last_updated: { type: Type.STRING },
        project_id: { type: Type.STRING },
        stats: { type: Type.OBJECT, properties: { charter_fields_captured: { type: Type.NUMBER }, requirements_count: { type: Type.NUMBER }, user_stories_count: { type: Type.NUMBER } } }
      },
      required: ['completion_percentage', 'last_updated', 'stats']
    },
    next_stage_instructions: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING },
        usage: { type: Type.STRING },
        completeness: { type: Type.STRING }
      },
      required: ['description', 'usage', 'completeness']
    }
  },
  required: ['session_id', 'completeness_percentage', 'data_quality', 'artifacts', 'summary']
};

export const analyzeConversation = async (
  inputData: string, 
  currentData: FullSessionExport
): Promise<FullSessionExport> => {
  
  const apiKey = AI_CONFIG.provider === 'GEMINI' ? AI_CONFIG.gemini.apiKey : AI_CONFIG.azure.apiKey;

  if (!apiKey) {
    console.error(`No API Key available for ${AI_CONFIG.provider}`);
    return currentData;
  }

  // Avoid analyzing empty input
  if (!inputData || inputData.trim().length < 20) {
    return currentData;
  }

  const prompt = `
    TASK:
    Analyze the provided input text (conversation transcript or project documentation) below and update the Project Intake Artifacts.
    You must populate the JSON structure accurately based on the information provided.
    
    INPUT TEXT:
    "${inputData}"

    CURRENT DATA (Merge and update this):
    ${JSON.stringify(currentData)}

    GUIDELINES:
    1. Update 'discussion_status' to 'captured' if information was found.
    2. Create new 'Functional Requirements' (FR-00X) and 'User Stories' (US-00X) as needed.
    3. Update 'completeness_percentage' based on how many Charter fields and Requirements are filled (0-100).
    4. Set 'captured_at' to current ISO timestamp for new items.
    
    Return the FULL JSON object matching the provided schema.
  `;

  try {
    let responseText = "";

    if (AI_CONFIG.provider === 'GEMINI') {
      try {
        const ai = new GoogleGenAI({ apiKey: AI_CONFIG.gemini.apiKey });
        const response = await ai.models.generateContent({
          model: getAnalysisModelName(),
          contents: `You are a specialized "Requirements Analyst" and "Data Validator" AI. ${prompt}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: sessionExportSchema,
          }
        });
        responseText = response.text || "";
      } catch (geminiError) {
        console.warn("Gemini Analysis Error (likely momentary overload or network):", geminiError);
        // Fallback: return existing data instead of crashing
        return currentData;
      }
    } else {
      // --- AZURE OPENAI IMPLEMENTATION ---
      try {
        const deployment = AI_CONFIG.azure.analysisDeploymentName; // Use the specific analysis deployment
        const endpoint = AI_CONFIG.azure.endpoint.replace(/\/$/, ""); 
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${AI_CONFIG.azure.apiVersion}`;
        
        // Inject schema guidance into the prompt for Azure since it doesn't support responseSchema in the same way
        const azurePrompt = `${prompt}\n\nREQUIRED OUTPUT SCHEMA:\n${JSON.stringify(sessionExportSchema, null, 2)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': AI_CONFIG.azure.apiKey
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are a specialized Requirements Analyst AI. Output strictly JSON." },
              { role: "user", content: azurePrompt }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`Azure API Error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        responseText = data.choices[0].message.content;
      } catch (azureError) {
        console.warn("Azure Analysis Error:", azureError);
        return currentData;
      }
    }

    if (responseText) {
      const parsed = JSON.parse(responseText);
      
      // Validation: Ensure artifacts object exists
      if (!parsed.artifacts) {
        console.warn("Model response missing artifacts object, skipping update");
        return currentData;
      }

      // Safe Merge: Spread existing data then overlay parsed data
      return {
        ...currentData,
        ...parsed,
        artifacts: {
          ...currentData.artifacts,
          ...parsed.artifacts,
          project_charter: { ...currentData.artifacts.project_charter, ...parsed.artifacts.project_charter },
          requirements: { ...currentData.artifacts.requirements, ...parsed.artifacts.requirements },
          user_stories: { ...currentData.artifacts.user_stories, ...parsed.artifacts.user_stories },
          prd_enhancements: { ...currentData.artifacts.prd_enhancements, ...parsed.artifacts.prd_enhancements }
        }
      } as FullSessionExport;
    }
  } catch (error) {
    console.error("Requirements analysis skipped due to API error:", error);
  }

  return currentData;
};