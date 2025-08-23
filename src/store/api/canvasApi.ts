import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define types for API responses
interface SessionInfo {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  participantCount: number;
}

interface SessionStats {
  shapeCount: number;
  groupCount: number;
  activeUsers: number;
  lastActivity: string;
}

interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number;
  includeMetadata?: boolean;
}

interface ExportResult {
  url: string;
  filename: string;
  size: number;
}

// Create the API slice
export const canvasApi = createApi({
  reducerPath: 'canvasApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
      // Add authentication headers if needed
      // const token = (getState() as RootState).auth.token;
      // if (token) {
      //   headers.set('authorization', `Bearer ${token}`);
      // }
      return headers;
    },
  }),
  tagTypes: ['Session', 'Stats'],
  endpoints: (builder) => ({
    // Session management
    createSession: builder.mutation<SessionInfo, { name: string }>({
      query: (body) => ({
        url: 'sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
    }),
    
    getSession: builder.query<SessionInfo, string>({
      query: (sessionId) => `sessions/${sessionId}`,
      providesTags: (result, error, sessionId) => [
        { type: 'Session', id: sessionId },
      ],
    }),
    
    updateSession: builder.mutation<SessionInfo, { id: string; name: string }>({
      query: ({ id, ...body }) => ({
        url: `sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Session', id },
      ],
    }),
    
    deleteSession: builder.mutation<void, string>({
      query: (sessionId) => ({
        url: `sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, sessionId) => [
        { type: 'Session', id: sessionId },
      ],
    }),
    
    // Session statistics
    getSessionStats: builder.query<SessionStats, string>({
      query: (sessionId) => `sessions/${sessionId}/stats`,
      providesTags: (result, error, sessionId) => [
        { type: 'Stats', id: sessionId },
      ],
    }),
    
    // Export functionality
    exportCanvas: builder.mutation<ExportResult, { sessionId: string; options: ExportOptions }>({
      query: ({ sessionId, options }) => ({
        url: `sessions/${sessionId}/export`,
        method: 'POST',
        body: options,
      }),
    }),
    
    // Template management (for future use)
    getTemplates: builder.query<SessionInfo[], void>({
      query: () => 'templates',
      providesTags: ['Session'],
    }),
    
    createTemplate: builder.mutation<SessionInfo, { sessionId: string; name: string }>({
      query: (body) => ({
        url: 'templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
    }),
    
    // Health check
    healthCheck: builder.query<{ status: string; timestamp: string }, void>({
      query: () => 'health',
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useCreateSessionMutation,
  useGetSessionQuery,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useGetSessionStatsQuery,
  useExportCanvasMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useHealthCheckQuery,
} = canvasApi;