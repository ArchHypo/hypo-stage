export type FiveStarRating = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export type Status = 'Research' | 'In Progress' | 'Validated' | 'Planning' | 'Testing' | 'Completed';

export type TechnicalPlanning = 'Architectural Spike' | 'Tracer Bullet' | 'Software Analytics';

export type Hypothesis = {
  createdAt: Date;
  updatedAt: Date;
  id: string;
  title: string;
  description: string;
  uncertainty: FiveStarRating;
  impact: FiveStarRating;
  technicalPlanning: TechnicalPlanning;
  status: Status;
  owner: string; // TODO associate with backstage entities
};
