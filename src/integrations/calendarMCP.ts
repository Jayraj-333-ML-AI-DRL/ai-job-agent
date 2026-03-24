import { getClient, MODEL } from "./anthropic";
import { logger } from "../utils/logger";

export interface CalendarEvent {
  title: string;
  dateTime: string;   // ISO string
  description?: string;
}

export async function createCalendarEvent(event: CalendarEvent): Promise<void> {
  const client = getClient();

  try {
    await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Create a Google Calendar event:\nTitle: ${event.title}\nDateTime: ${event.dateTime}\nDescription: ${event.description ?? ""}`,
      }],
      // @ts-expect-error mcp_servers supported but not yet typed
      mcp_servers: [{
        type: "url",
        url:  "https://gcal.mcp.claude.com/mcp",
        name: "google-calendar-mcp",
      }],
    });

    logger.info(`Calendar event created: ${event.title}`);
  } catch (err) {
    logger.warn(`Calendar MCP unavailable, skipping: ${event.title}`, err);
  }
}
