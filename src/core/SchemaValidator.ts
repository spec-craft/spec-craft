import { z } from "zod";

const variableSchema = z.object({
  type: z.enum(["string", "select", "boolean"]),
  required: z.boolean().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  options: z.array(z.string()).optional(),
  default: z.union([z.string(), z.boolean()]).optional(),
});

const executionConfigSchema = z
  .object({
    command: z.string().optional(),
    mode: z.enum(["incremental", "full"]).optional(),
    failFast: z.boolean().optional(),
    coverage: z.boolean().optional(),
  })
  .optional();

const chapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

const chapterGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  chapters: z.array(z.string()),
});

const knowledgeInjectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  skill: z.string().optional(),
  removeFromOutput: z.boolean().optional(),
});

const subAgentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  prompt: z.string(),
  dependsOn: z.array(z.string()).optional(),
});

const queryCheckSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    description: z.string().optional(),
  }),
]);

const commandSchema = z.object({
  description: z.string().optional(),
  type: z.enum(["template", "execution", "query", "interactive"]).optional(),
  template: z.string().optional(),
  output: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  autoRunDeps: z.boolean().optional(),
  execution: executionConfigSchema,
  checks: z.array(queryCheckSchema).optional(),
  chapters: z.array(chapterSchema).optional(),
  chapterGroups: z.array(chapterGroupSchema).optional(),
  injectKnowledge: z.array(knowledgeInjectionSchema).optional(),
  subAgents: z.array(subAgentSchema).optional(),
});

const contextManagementSchema = z
  .object({
    tokenThreshold: z.number().optional(),
    roundThreshold: z.number().optional(),
  })
  .optional();

const workflowSchema = z.object({
  name: z.string({ required_error: '"name" is required' }),
  version: z.string({ required_error: '"version" is required' }),
  description: z.string().optional(),
  variables: z.record(z.string(), variableSchema).optional(),
  contextManagement: contextManagementSchema,
  commands: z.record(z.string(), commandSchema).refine(
    (cmds) => Object.keys(cmds).length > 0,
    { message: '"commands" must contain at least one command' }
  ),
});

const marketplaceSchema = z.object({
  name: z.string({ required_error: '"name" is required' }),
  version: z.string({ required_error: '"version" is required' }),
  description: z.string().optional(),
  workflows: z.array(z.string()).optional(),
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class SchemaValidator {
  validateWorkflow(data: unknown): ValidationResult {
    const result = workflowSchema.safeParse(data);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    });

    return { valid: false, errors };
  }

  validateMarketplace(data: unknown): ValidationResult {
    const result = marketplaceSchema.safeParse(data);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    });

    return { valid: false, errors };
  }
}
