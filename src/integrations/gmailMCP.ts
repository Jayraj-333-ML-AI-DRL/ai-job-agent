import { getClient, MODEL } from "./anthropic";
import { logger } from "../utils/logger";

export interface DraftParams {
  to?: string;
  subject: string;
  body: string;
}

export async function createGmailDraft(params: DraftParams): Promise<void> {
  const client = getClient();

  try {
    await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Create a Gmail draft with:\nTo: ${params.to ?? "(leave blank)"}\nSubject: ${params.subject}\nBody:\n${params.body}`,
      }],
      // MCP server connection
      // @ts-expect-error mcp_servers is supported but not yet in the type definitions
      mcp_servers: [{
        type: "url",
        url:  "https://gmail.mcp.claude.com/mcp",
        name: "gmail-mcp",
      }],
    });

    logger.info(`Gmail draft created: ${params.subject}`);
  } catch (err) {
    logger.warn(`Gmail MCP unavailable, skipping draft: ${params.subject}`, err);
  }
}
