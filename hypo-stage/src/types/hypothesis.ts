export type FiveStarRating = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export type Status = 'Research' | 'In Progress' | 'Validated' | 'Planning' | 'Testing' | 'Completed';

export type Hypothesis = {
  entityRef: string;
  createdAt: Date;
  updatedAt: Date;
  id: string;
  text: string;
  uncertainty: FiveStarRating;
  impact: FiveStarRating;
  status: Status;
  technicalPlanning: string;
};
