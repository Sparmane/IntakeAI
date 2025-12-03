
import { FullSessionExport } from '../types';
import { AI_CONFIG } from '../config';

/**
 * Uploads the session data and a generated markdown document to the configured Azure endpoint.
 * Uses a generated GUID for the transaction/blob name.
 */
export const uploadSessionToCloud = async (data: FullSessionExport): Promise<{ success: boolean; message: string; guid: string }> => {
  const exportGuid = crypto.randomUUID();
  const endpoint = AI_CONFIG.azure.storageEndpoint;
  
  // 1. Generate the "Doc" version (Markdown)
  const markdownDoc = generateMarkdownReport(data);
  
  // 2. Prepare JSON payload
  const payload = {
    export_id: exportGuid,
    session_id: data.session_id,
    timestamp: new Date().toISOString(),
    project_name: data.artifacts?.project_charter?.fields?.problem_statement?.value?.slice(0, 50) || "Untitled Project",
    json_data: data,
    document_content: markdownDoc,
    document_format: 'markdown'
  };

  try {
    console.log(`[Storage] Pushing export ${exportGuid} to ${endpoint}...`);
    
    // Note: In a real scenario, this might be a POST to an Azure Function 
    // or a PUT to a Blob Storage URL with a SAS token.
    // We assume a REST API endpoint here.
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Export-ID': exportGuid
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
       // If it's a 404/405 on a placeholder, we might want to throw specific info
       throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    return { success: true, message: 'Upload successful', guid: exportGuid };
  } catch (error) {
    console.error("Storage upload failed:", error);
    
    // For User Experience with Placeholder:
    // If the endpoint is the default placeholder, we inform them it's not configured.
    if (endpoint.includes('placeholder')) {
        return { success: false, message: 'Placeholder Endpoint: Configure Azure Function URL in config.ts', guid: exportGuid };
    }

    return { success: false, message: error instanceof Error ? error.message : "Network error", guid: exportGuid };
  }
};

/**
 * Converts the Session JSON into a formatted Markdown document string.
 */
const generateMarkdownReport = (data: FullSessionExport): string => {
  const f = data.artifacts?.project_charter?.fields;
  const reqs = data.artifacts?.requirements;
  const stories = data.artifacts?.user_stories?.stories;
  
  let md = `# Project Intake Specification\n`;
  md += `**Session ID:** ${data.session_id}\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n`;
  md += `**Completeness:** ${Math.round(data.completeness_percentage)}%\n\n`;
  
  md += `## 1. Project Charter\n\n`;
  md += `### Problem Statement\n${f?.problem_statement?.value || 'N/A'}\n\n`;
  md += `### Business Objectives\n${f?.business_objectives?.value || 'N/A'}\n\n`;
  md += `### Scope\n**Inclusions:** ${f?.scope_inclusions?.value || 'N/A'}\n`;
  md += `**Exclusions:** ${(f?.scope_exclusions?.value || []).join(', ') || 'None'}\n\n`;
  
  md += `## 2. Functional Requirements\n\n`;
  if (reqs?.functional?.length) {
    md += `| ID | Description | Status |\n|---|---|---|\n`;
    reqs.functional.forEach(r => {
      md += `| ${r.id} | ${r.description.replace(/\|/g, '-')} | ${r.confirmed ? 'Confirmed' : 'Draft'} |\n`;
    });
  } else {
    md += `*No requirements captured.*\n`;
  }
  md += `\n`;

  md += `## 3. User Stories\n\n`;
  stories?.forEach(s => {
    md += `### ${s.id} (${s.priority})\n`;
    md += `**As a** ${s.as_a}, **I want** ${s.i_want}, **so that** ${s.so_that}.\n`;
    if (s.acceptance_criteria?.length) {
      md += `**Acceptance Criteria:**\n`;
      s.acceptance_criteria.forEach(ac => md += `- ${ac}\n`);
    }
    md += `\n`;
  });

  md += `## 4. Non-Functional Requirements\n\n`;
  const nfr = reqs?.non_functional;
  if (nfr) {
    md += `**Security:** ${(nfr.security || []).join(', ') || 'None'}\n`;
    md += `**Performance:** ${(nfr.performance || []).join(', ') || 'None'}\n`;
    md += `**Reliability:** ${(nfr.reliability || []).join(', ') || 'None'}\n`;
  }

  return md;
};
