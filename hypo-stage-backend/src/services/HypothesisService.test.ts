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
