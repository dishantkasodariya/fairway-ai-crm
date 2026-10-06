import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  toCamelCaseDeep,
  IntelligenceApiError,
  callIntelligenceApi,
} from '../controllers/intelligence.controller.js';

describe('AI & Intelligence Service Utilities', () => {
  describe('toCamelCaseDeep transformation', () => {
    it('returns primitive values as-is', () => {
      assert.strictEqual(toCamelCaseDeep('hello'), 'hello');
      assert.strictEqual(toCamelCaseDeep(123), 123);
      assert.strictEqual(toCamelCaseDeep(null), null);
      assert.strictEqual(toCamelCaseDeep(undefined), undefined);
    });

    it('transforms snake_case keys to camelCase in objects', () => {
      const input = {
        company_name: 'Fairway Logistics',
        total_revenue_inr: 50000000,
        is_high_priority: true,
      };
      const expected = {
        companyName: 'Fairway Logistics',
        totalRevenueInr: 50000000,
        isHighPriority: true,
      };
      assert.deepStrictEqual(toCamelCaseDeep(input), expected);
    });

    it('recursively transforms nested objects and arrays', () => {
      const input = {
        opportunity_score: 85,
        target_warehouses: [
          { warehouse_id: 'wh_1', square_footage: 45000 },
          { warehouse_id: 'wh_2', square_footage: 60000 },
        ],
        contact_person: {
          first_name: 'Bhavya',
          last_name: 'Sharma',
          office_address: {
            postal_code: 382443,
          },
        },
      };

      const result = toCamelCaseDeep(input);
      assert.strictEqual(result.opportunityScore, 85);
      assert.strictEqual(result.targetWarehouses[0].warehouseId, 'wh_1');
      assert.strictEqual(result.targetWarehouses[0].squareFootage, 45000);
      assert.strictEqual(result.contactPerson.firstName, 'Bhavya');
      assert.strictEqual(result.contactPerson.officeAddress.postalCode, 382443);
    });
  });

  describe('IntelligenceApiError class', () => {
    it('creates error with status code and code string', () => {
      const err = new IntelligenceApiError(503, 'AI Service Unavailable', 'AI_UNAVAILABLE');
      assert.strictEqual(err.status, 503);
      assert.strictEqual(err.message, 'AI Service Unavailable');
      assert.strictEqual(err.code, 'AI_UNAVAILABLE');
      assert.ok(err instanceof Error);
    });
  });

  describe('callIntelligenceApi with Mocked Fetch', () => {
    it('successfully fetches and returns data from AI provider', async () => {
      const originalFetch = global.fetch;
      try {
        const mockPayload = {
          success: true,
          discovery_run_id: 'run_123',
          prospects_count: 5,
        };

        global.fetch = async () => {
          return {
            ok: true,
            status: 200,
            json: async () => mockPayload,
          } as any;
        };

        const result = await callIntelligenceApi('/discovery/runs/run_123');
        assert.deepStrictEqual(result, mockPayload);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('retries on 503 Service Unavailable and succeeds on next attempt', async () => {
      const originalFetch = global.fetch;
      try {
        let attempts = 0;
        global.fetch = async () => {
          attempts++;
          if (attempts === 1) {
            return {
              ok: false,
              status: 503,
              text: async () => 'Service Unavailable',
            } as any;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'completed', attempts }),
          } as any;
        };

        const result = await callIntelligenceApi('/health', {}, 2, 1000);
        assert.strictEqual(attempts, 2);
        assert.strictEqual(result.status, 'completed');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('throws IntelligenceApiError when max retries exceeded', async () => {
      const originalFetch = global.fetch;
      try {
        global.fetch = async () => {
          return {
            ok: false,
            status: 500,
            json: async () => ({ detail: 'Internal Server Crash in Python LLM engine' }),
            text: async () => 'Internal Server Crash in Python LLM engine',
          } as any;
        };

        await assert.rejects(
          async () => {
            await callIntelligenceApi('/crash', {}, 1, 1000);
          },
          (err: any) => {
            assert.strictEqual(err.status, 500);
            assert.ok(err.message.includes('Internal Server Crash'));
            return true;
          }
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
