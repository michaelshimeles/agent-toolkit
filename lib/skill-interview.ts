// Interview state machine for guided skill creation

export type InterviewStep = 'problem' | 'workflow' | 'mcps' | 'examples' | 'review';

export interface InterviewAnswers {
  problemStatement: string;
  targetUsers: string;
  workflowSteps: string[];
  requiredMcps: string[];
  exampleInputs: string[];
  exampleOutputs: string[];
  documentationUrls: string[];
}

export interface InterviewState {
  currentStep: InterviewStep;
  answers: InterviewAnswers;
  isComplete: boolean;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'textarea' | 'array' | 'select';
}

export interface StepQuestions {
  title: string;
  description: string;
  questions: InterviewQuestion[];
}

export const INTERVIEW_QUESTIONS: Record<InterviewStep, StepQuestions> = {
  problem: {
    title: 'Problem Definition',
    description: 'Help us understand what problem this skill will solve.',
    questions: [
      {
        id: 'problemStatement',
        question: 'What specific problem does this skill solve?',
        placeholder: 'Describe the main problem or task this skill addresses...',
        required: true,
        type: 'textarea',
      },
      {
        id: 'targetUsers',
        question: 'Who are the primary users?',
        placeholder: 'e.g., developers, content writers, data analysts...',
        required: true,
        type: 'text',
      },
    ],
  },
  workflow: {
    title: 'Workflow Design',
    description: 'Define how Claude should approach solving this problem.',
    questions: [
      {
        id: 'workflowSteps',
        question: 'What are the main steps Claude should follow?',
        placeholder: 'Add each step in the workflow...',
        required: true,
        type: 'array',
      },
      {
        id: 'decisionPoints',
        question: 'Are there any decision points or conditional logic?',
        placeholder: 'Describe any branching logic or conditions...',
        required: false,
        type: 'textarea',
      },
    ],
  },
  mcps: {
    title: 'External Services',
    description: 'Select any MCP servers this skill needs to interact with.',
    questions: [
      {
        id: 'needsExternalServices',
        question: 'Does this skill need external services?',
        placeholder: 'Select yes if the skill needs to interact with external APIs or services',
        required: true,
        type: 'select',
      },
      {
        id: 'requiredMcps',
        question: 'Select the required MCP servers',
        placeholder: 'Choose the MCP servers this skill needs...',
        required: false,
        type: 'array',
      },
    ],
  },
  examples: {
    title: 'Examples',
    description: 'Provide examples to help Claude understand the expected behavior.',
    questions: [
      {
        id: 'exampleInputs',
        question: 'Provide an example input',
        placeholder: 'What would a typical user request look like?',
        required: true,
        type: 'array',
      },
      {
        id: 'exampleOutputs',
        question: 'What should the output look like?',
        placeholder: 'Describe or provide the expected output...',
        required: true,
        type: 'array',
      },
      {
        id: 'documentationUrls',
        question: 'Any documentation or reference URLs?',
        placeholder: 'Add relevant documentation links...',
        required: false,
        type: 'array',
      },
    ],
  },
  review: {
    title: 'Review & Confirm',
    description: 'Review your answers before generating the skill.',
    questions: [],
  },
};

const STEP_ORDER: InterviewStep[] = ['problem', 'workflow', 'mcps', 'examples', 'review'];

/**
 * Creates the initial interview state with empty answers
 */
export function createInitialState(): InterviewState {
  return {
    currentStep: 'problem',
    answers: {
      problemStatement: '',
      targetUsers: '',
      workflowSteps: [],
      requiredMcps: [],
      exampleInputs: [],
      exampleOutputs: [],
      documentationUrls: [],
    },
    isComplete: false,
  };
}

/**
 * Gets the next step in the interview flow
 * @returns The next step or null if at the end
 */
export function getNextStep(currentStep: InterviewStep): InterviewStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

/**
 * Gets the previous step in the interview flow
 * @returns The previous step or null if at the beginning
 */
export function getPreviousStep(currentStep: InterviewStep): InterviewStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

/**
 * Checks if a specific step has all required questions answered
 */
export function isStepComplete(state: InterviewState, step: InterviewStep): boolean {
  const { answers } = state;
  const stepQuestions = INTERVIEW_QUESTIONS[step];

  for (const question of stepQuestions.questions) {
    if (!question.required) continue;

    const answerId = question.id as keyof InterviewAnswers;
    const answer = answers[answerId];

    if (answer === undefined || answer === null) {
      return false;
    }

    if (typeof answer === 'string' && answer.trim() === '') {
      return false;
    }

    if (Array.isArray(answer) && answer.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if the user can proceed to the next step
 * This validates the current step is complete
 */
export function canProceed(state: InterviewState): boolean {
  // Review step is always complete (no required questions)
  if (state.currentStep === 'review') {
    // For review, check that all previous steps are complete
    return (
      isStepComplete(state, 'problem') &&
      isStepComplete(state, 'workflow') &&
      isStepComplete(state, 'examples')
    );
  }

  return isStepComplete(state, state.currentStep);
}

/**
 * Gets the current step index (0-based)
 */
export function getStepIndex(step: InterviewStep): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * Gets the total number of steps
 */
export function getTotalSteps(): number {
  return STEP_ORDER.length;
}

/**
 * Gets all steps in order
 */
export function getAllSteps(): InterviewStep[] {
  return [...STEP_ORDER];
}

/**
 * Formats the interview answers into a context string for Claude
 * This is used to provide context when generating the skill
 */
export function formatAnswersForPrompt(answers: InterviewAnswers): string {
  const sections: string[] = [];

  // Problem section
  if (answers.problemStatement || answers.targetUsers) {
    sections.push(`## Problem Definition

**Problem Statement:** ${answers.problemStatement || 'Not specified'}

**Target Users:** ${answers.targetUsers || 'Not specified'}`);
  }

  // Workflow section
  if (answers.workflowSteps.length > 0) {
    const stepsFormatted = answers.workflowSteps
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n');
    sections.push(`## Workflow Steps

${stepsFormatted}`);
  }

  // MCP section
  if (answers.requiredMcps.length > 0) {
    const mcpsFormatted = answers.requiredMcps.map((mcp) => `- ${mcp}`).join('\n');
    sections.push(`## Required MCP Servers

${mcpsFormatted}`);
  }

  // Examples section
  if (answers.exampleInputs.length > 0 || answers.exampleOutputs.length > 0) {
    let examplesContent = '';

    if (answers.exampleInputs.length > 0) {
      examplesContent += `### Example Inputs\n${answers.exampleInputs.map((input, i) => `${i + 1}. ${input}`).join('\n')}\n\n`;
    }

    if (answers.exampleOutputs.length > 0) {
      examplesContent += `### Expected Outputs\n${answers.exampleOutputs.map((output, i) => `${i + 1}. ${output}`).join('\n')}`;
    }

    sections.push(`## Examples

${examplesContent.trim()}`);
  }

  // Documentation section
  if (answers.documentationUrls.length > 0) {
    const docsFormatted = answers.documentationUrls.map((url) => `- ${url}`).join('\n');
    sections.push(`## Reference Documentation

${docsFormatted}`);
  }

  return sections.join('\n\n');
}

/**
 * Validates the entire interview state
 * Returns an object with validation results for each step
 */
export function validateInterviewState(state: InterviewState): Record<InterviewStep, boolean> {
  return {
    problem: isStepComplete(state, 'problem'),
    workflow: isStepComplete(state, 'workflow'),
    mcps: isStepComplete(state, 'mcps'),
    examples: isStepComplete(state, 'examples'),
    review: true, // Review is always valid
  };
}

/**
 * Updates the interview state with new answers
 * Returns a new state object (immutable update)
 */
export function updateAnswers(
  state: InterviewState,
  updates: Partial<InterviewAnswers>
): InterviewState {
  return {
    ...state,
    answers: {
      ...state.answers,
      ...updates,
    },
  };
}

/**
 * Moves to the next step if possible
 * Returns the updated state or the same state if can't proceed
 */
export function goToNextStep(state: InterviewState): InterviewState {
  if (!canProceed(state)) {
    return state;
  }

  const nextStep = getNextStep(state.currentStep);
  if (!nextStep) {
    return {
      ...state,
      isComplete: true,
    };
  }

  return {
    ...state,
    currentStep: nextStep,
  };
}

/**
 * Moves to the previous step
 * Returns the updated state or the same state if at the beginning
 */
export function goToPreviousStep(state: InterviewState): InterviewState {
  const previousStep = getPreviousStep(state.currentStep);
  if (!previousStep) {
    return state;
  }

  return {
    ...state,
    currentStep: previousStep,
    isComplete: false,
  };
}

/**
 * Jumps to a specific step (for navigation)
 * Only allows jumping to completed steps or the next available step
 */
export function goToStep(state: InterviewState, targetStep: InterviewStep): InterviewState {
  const targetIndex = getStepIndex(targetStep);
  const currentIndex = getStepIndex(state.currentStep);

  // Can always go backwards
  if (targetIndex <= currentIndex) {
    return {
      ...state,
      currentStep: targetStep,
      isComplete: false,
    };
  }

  // For going forwards, check if all intermediate steps are complete
  for (let i = currentIndex; i < targetIndex; i++) {
    if (!isStepComplete(state, STEP_ORDER[i])) {
      return state; // Can't skip ahead
    }
  }

  return {
    ...state,
    currentStep: targetStep,
  };
}
