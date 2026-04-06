import { z } from "zod";

export const TestWebSocketMessageSchema = z.object({
    type: z.union([z.literal("test_web_socket_message")]),
});

export type TestWebSocketMessage = z.infer<typeof TestWebSocketMessageSchema>;
