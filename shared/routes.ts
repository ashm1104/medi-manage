import { z } from 'zod';
import { 
  insertFacilitySchema, insertPatientSchema, insertAckDocSchema, 
  insertPatientFacilitySchema, insertCaseSchema,
  facilities, patients, ack_docs, patient_facilities, cases 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  facilities: {
    list: {
      method: 'GET' as const,
      path: '/api/facilities' as const,
      responses: {
        200: z.array(z.custom<typeof facilities.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/facilities/:id' as const,
      responses: {
        200: z.object({
          facility: z.custom<typeof facilities.$inferSelect>(),
          patients: z.array(z.any()),
          acknowledgments: z.array(z.custom<typeof ack_docs.$inferSelect>()),
          cases: z.array(z.custom<typeof cases.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/facilities' as const,
      input: insertFacilitySchema,
      responses: {
        201: z.custom<typeof facilities.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/facilities/:id' as const,
      input: insertFacilitySchema.partial(),
      responses: {
        200: z.custom<typeof facilities.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/facilities/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients' as const,
      responses: {
        200: z.array(z.any()), // Extended with primary facility
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id' as const,
      responses: {
        200: z.object({
          patient: z.custom<typeof patients.$inferSelect>(),
          facilities: z.array(z.any()),
          acknowledgments: z.array(z.custom<typeof ack_docs.$inferSelect>()),
          cases: z.array(z.custom<typeof cases.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/patients' as const,
      input: insertPatientSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/patients/:id' as const,
      input: insertPatientSchema.partial(),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/patients/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    linkFacility: {
      method: 'POST' as const,
      path: '/api/patients/:id/facilities' as const,
      input: insertPatientFacilitySchema.omit({ patient_id: true }),
      responses: {
        201: z.custom<typeof patient_facilities.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  cases: {
    list: {
      method: 'GET' as const,
      path: '/api/cases' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/cases/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/cases' as const,
      input: insertCaseSchema,
      responses: {
        201: z.custom<typeof cases.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  acknowledgments: {
    list: {
      method: 'GET' as const,
      path: '/api/acknowledgments' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/acknowledgments' as const,
      input: insertAckDocSchema,
      responses: {
        201: z.custom<typeof ack_docs.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/acknowledgments/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
