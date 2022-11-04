export interface Step {
  show(): Promise<any>;
  setStepPosition(stepNumber: number, totalSteps: number): void;
}

export enum StepResultType {
  SUCCESS,
  ERROR,
  CANCEL,
}
