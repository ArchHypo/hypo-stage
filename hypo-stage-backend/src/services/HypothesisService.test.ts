import { createHypothesisService } from './HypothesisService';
import { DatabaseService, LoggerService } from '@backstage/backend-plugin-api';

describe('HypothesisService', () => {
  let mockLogger: jest.Mocked<LoggerService>;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockDb: any;
  let mockTrx: any;
  let service: any;

  function createChain(mockDel: jest.Mock) {
    const chain = {
      where: jest.fn().mockReturnThis(),
      del: mockDel,
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };
    chain.returning.mockResolvedValue([{}]);
    return chain;
  }

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const delMock = jest.fn().mockResolvedValue(1);
    mockTrx = jest.fn((_table: string) => createChain(delMock));

    const defaultChain = {
      select: jest.fn().mockResolvedValue([]),
      where: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }),
    };
    mockDb = jest.fn((_table: string) => defaultChain) as any;
    mockDb.transaction = jest.fn((callback: (trx: any) => Promise<void>) =>
      callback(mockTrx),
    );

    mockDatabase = {
      getClient: jest.fn().mockResolvedValue(mockDb),
    } as any;

    service = null;
  });

  describe('deleteHypothesis', () => {
    it('should delete hypothesis and related data in transaction', async () => {
      const hypothesisId = 'test-hypothesis-id';
      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.deleteHypothesis(hypothesisId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTrx).toHaveBeenCalledWith('technicalPlanning');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockLogger.info).toHaveBeenCalledWith('Deleting hypothesis and related data', {
        id: hypothesisId,
      });
    });

    it('should throw error when hypothesis not found', async () => {
      const hypothesisId = 'non-existent-id';
      const delMock = jest
        .fn()
        .mockResolvedValueOnce(0) // technicalPlanning
        .mockResolvedValueOnce(0) // hypothesisEvents
        .mockResolvedValueOnce(0); // hypothesis
      mockTrx = jest.fn((_table: string) => createChain(delMock));
      mockDb.transaction = jest.fn((callback: (trx: typeof mockTrx) => Promise<void>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await expect(service.deleteHypothesis(hypothesisId)).rejects.toThrow('Hypothesis not found');
    });

    it('should delete technical planning and events before hypothesis', async () => {
      const hypothesisId = 'test-hypothesis-id';
      const tablesCalled: string[] = [];
      mockTrx = jest.fn((table: string) => {
        tablesCalled.push(table);
        return createChain(jest.fn().mockResolvedValue(1));
      });
      mockDb.transaction = jest.fn((callback: (trx: typeof mockTrx) => Promise<void>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.deleteHypothesis(hypothesisId);

      expect(tablesCalled).toEqual(['technicalPlanning', 'hypothesisEvents', 'hypothesis']);
    });
  });

  describe('create', () => {
    it('should create hypothesis with event', async () => {
      const input = {
        statement: 'Test hypothesis statement here',
        entityRefs: [],
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: [],
        uncertainty: 'Medium' as const,
        impact: 'High' as const,
        notes: null,
      };

      const createdHypothesis = {
        id: '1',
        ...input,
        status: 'Open',
        entityRefs: JSON.stringify(input.entityRefs),
        relatedArtefacts: JSON.stringify(input.relatedArtefacts),
        qualityAttributes: JSON.stringify(input.qualityAttributes),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const techPlanChain = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([]),
      };
      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning
        .mockResolvedValueOnce([createdHypothesis])
        .mockResolvedValueOnce([{ id: 'event-1' }]);
      mockTrx = jest.fn((table: string) => {
        if (table === 'technicalPlanning') return techPlanChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      const result = await service.create(input);

      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(result).toBeDefined();
    });
  });

  describe('createTechnicalPlanning', () => {
    it('should update hypothesis and create TECHNICAL_PLANNING_CREATE event when uncertainty/impact provided', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
        uncertainty: 'High' as const,
        impact: 'Low' as const,
      };

      const createdTechPlan = {
        id: 'tp-1',
        hypothesisId,
        ...input,
        documentations: JSON.stringify(input.documentations),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([createdTechPlan]).mockResolvedValueOnce([{}]);

      const updateChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const tablesCalled: string[] = [];
      mockTrx = jest.fn((table: string) => {
        tablesCalled.push(table);
        if (table === 'hypothesis') return updateChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.createTechnicalPlanning(hypothesisId, input);

      expect(mockTrx).toHaveBeenCalledWith('technicalPlanning');
      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(updateChain.where).toHaveBeenCalledWith('id', hypothesisId);
    });

    it('should NOT create event when uncertainty/impact not provided', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
      };

      const createdTechPlan = {
        id: 'tp-1',
        hypothesisId,
        ...input,
        documentations: JSON.stringify(input.documentations),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([createdTechPlan]);

      const tablesCalled: string[] = [];
      mockTrx = jest.fn((table: string) => {
        tablesCalled.push(table);
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.createTechnicalPlanning(hypothesisId, input);

      expect(tablesCalled).toEqual(['technicalPlanning']);
      expect(tablesCalled).not.toContain('hypothesisEvents');
    });

    it('should update hypothesis when only uncertainty is provided (no impact)', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
        uncertainty: 'High' as const,
      };

      const createdTechPlan = {
        id: 'tp-1',
        hypothesisId,
        ...input,
        documentations: JSON.stringify(input.documentations),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([createdTechPlan]).mockResolvedValueOnce([{}]);

      const updateChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const tablesCalled: string[] = [];
      mockTrx = jest.fn((table: string) => {
        tablesCalled.push(table);
        if (table === 'hypothesis') return updateChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.createTechnicalPlanning(hypothesisId, input);

      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ uncertainty: 'High' }),
      );
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ impact: expect.anything() }),
      );
    });

    it('should update hypothesis when only impact is provided (no uncertainty)', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
        impact: 'Very High' as const,
      };

      const createdTechPlan = {
        id: 'tp-1',
        hypothesisId,
        ...input,
        documentations: JSON.stringify(input.documentations),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([createdTechPlan]).mockResolvedValueOnce([{}]);

      const updateChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const tablesCalled: string[] = [];
      mockTrx = jest.fn((table: string) => {
        tablesCalled.push(table);
        if (table === 'hypothesis') return updateChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.createTechnicalPlanning(hypothesisId, input);

      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ impact: 'Very High' }),
      );
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ uncertainty: expect.anything() }),
      );
    });

    it('should include technicalPlanningId in changes JSON when creating event', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
        uncertainty: 'High' as const,
        impact: 'Low' as const,
      };

      const createdTechPlan = {
        id: 'tp-1',
        hypothesisId,
        ...input,
        documentations: JSON.stringify(input.documentations),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const techPlanInsertChain = createChain(jest.fn());
      techPlanInsertChain.insert.mockReturnValue(techPlanInsertChain);
      techPlanInsertChain.returning.mockResolvedValueOnce([createdTechPlan]);

      const updateChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const eventsInsertChain = {
        insert: jest.fn().mockReturnThis(),
      };

      mockTrx = jest.fn((table: string) => {
        if (table === 'technicalPlanning') return techPlanInsertChain;
        if (table === 'hypothesis') return updateChain;
        return eventsInsertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.createTechnicalPlanning(hypothesisId, input);

      expect(eventsInsertChain.insert).toHaveBeenCalled();
      const insertArg = eventsInsertChain.insert.mock.calls[0][0];
      expect(insertArg).toBeDefined();
      const changes = JSON.parse(insertArg.changes);
      expect(changes.technicalPlanningId).toBe('tp-1');
    });
  });

  describe('updateTechnicalPlanning', () => {
    it('should update hypothesis and create TECHNICAL_PLANNING_UPDATE event when uncertainty/impact provided', async () => {
      const techPlanId = 'tp-1';
      const input = {
        expectedOutcome: 'Updated outcome',
        documentations: ['https://example.com/updated'],
        uncertainty: 'Very High' as const,
        impact: 'Medium' as const,
      };

      const updatedTechPlan = {
        id: techPlanId,
        hypothesisId: 'hyp-1',
        ...input,
        documentations: JSON.stringify(input.documentations),
        updatedAt: new Date(),
      };

      const updateTpChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTechPlan]),
      };

      const updateHypChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([{}]);

      const tablesCalled: string[] = [];
      mockTrx = jest.fn((table: string) => {
        tablesCalled.push(table);
        if (table === 'technicalPlanning') return updateTpChain;
        if (table === 'hypothesis') return updateHypChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.updateTechnicalPlanning(techPlanId, input);

      expect(mockTrx).toHaveBeenCalledWith('technicalPlanning');
      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(updateHypChain.where).toHaveBeenCalledWith('id', 'hyp-1');
    });

    it('should update hypothesis when only uncertainty is provided during edit', async () => {
      const techPlanId = 'tp-1';
      const input = {
        expectedOutcome: 'Updated outcome',
        documentations: ['https://example.com/updated'],
        uncertainty: 'Low' as const,
      };

      const updatedTechPlan = {
        id: techPlanId,
        hypothesisId: 'hyp-1',
        ...input,
        documentations: JSON.stringify(input.documentations),
        updatedAt: new Date(),
      };

      const updateTpChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTechPlan]),
      };

      const updateHypChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([{}]);

      mockTrx = jest.fn((table: string) => {
        if (table === 'technicalPlanning') return updateTpChain;
        if (table === 'hypothesis') return updateHypChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.updateTechnicalPlanning(techPlanId, input);

      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(updateHypChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ uncertainty: 'Low' }),
      );
      expect(updateHypChain.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ impact: expect.anything() }),
      );
    });

    it('should update hypothesis when only impact is provided during edit', async () => {
      const techPlanId = 'tp-1';
      const input = {
        expectedOutcome: 'Updated outcome',
        documentations: ['https://example.com/updated'],
        impact: 'High' as const,
      };

      const updatedTechPlan = {
        id: techPlanId,
        hypothesisId: 'hyp-1',
        ...input,
        documentations: JSON.stringify(input.documentations),
        updatedAt: new Date(),
      };

      const updateTpChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTechPlan]),
      };

      const updateHypChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const insertChain = createChain(jest.fn());
      insertChain.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValueOnce([{}]);

      mockTrx = jest.fn((table: string) => {
        if (table === 'technicalPlanning') return updateTpChain;
        if (table === 'hypothesis') return updateHypChain;
        return insertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.updateTechnicalPlanning(techPlanId, input);

      expect(mockTrx).toHaveBeenCalledWith('hypothesis');
      expect(mockTrx).toHaveBeenCalledWith('hypothesisEvents');
      expect(updateHypChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ impact: 'High' }),
      );
      expect(updateHypChain.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ uncertainty: expect.anything() }),
      );
    });

    it('should include technicalPlanningId in changes JSON when updating event', async () => {
      const techPlanId = 'tp-1';
      const input = {
        expectedOutcome: 'Updated outcome',
        documentations: ['https://example.com/updated'],
        uncertainty: 'Very High' as const,
        impact: 'Medium' as const,
      };

      const updatedTechPlan = {
        id: techPlanId,
        hypothesisId: 'hyp-1',
        ...input,
        documentations: JSON.stringify(input.documentations),
        updatedAt: new Date(),
      };

      const updateTpChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTechPlan]),
      };

      const updateHypChain = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      const eventsInsertChain = {
        insert: jest.fn().mockReturnThis(),
      };

      mockTrx = jest.fn((table: string) => {
        if (table === 'technicalPlanning') return updateTpChain;
        if (table === 'hypothesis') return updateHypChain;
        return eventsInsertChain;
      });
      mockDb.transaction = jest.fn((callback: (trx: any) => Promise<any>) =>
        callback(mockTrx),
      );

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      await service.updateTechnicalPlanning(techPlanId, input);

      expect(eventsInsertChain.insert).toHaveBeenCalled();
      const insertArg = eventsInsertChain.insert.mock.calls[0][0];
      expect(insertArg).toBeDefined();
      const changes = JSON.parse(insertArg.changes);
      expect(changes.technicalPlanningId).toBe(techPlanId);
    });
  });

  describe('getAll', () => {
    it('should return all hypotheses with technical plannings', async () => {
      const mockHypotheses = [
        {
          id: '1',
          statement: 'Test',
          entityRefs: JSON.stringify([]),
          relatedArtefacts: JSON.stringify([]),
          qualityAttributes: JSON.stringify([]),
        },
      ];

      (mockDb as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hypothesis') {
          return { select: jest.fn().mockResolvedValue(mockHypotheses) };
        }
        return {
          where: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue([]),
          }),
        };
      });

      service = await createHypothesisService({
        logger: mockLogger,
        database: mockDatabase,
      });

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].entityRefs).toEqual([]);
    });
  });
});
