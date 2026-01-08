import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { 
  ChallengeNotificationConfigService,
  type ConfigChangeEvent
} from '../challengeNotificationConfigService';

describe('Configuration Hot-Reloading Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage BEFORE resetting instance
    localStorage.clear();
    // Reset the singleton so a fresh instance is created
    ChallengeNotificationConfigService.resetInstance();
  });

  afterEach(() => {
    localStorage.clear();
    ChallengeNotificationConfigService.resetInstance();
  });

  it('should apply configuration changes immediately', () => {
    fc.assert(
      fc.property(
        fc.record({
          displayDuration: fc.integer({ min: 1000, max: 30000 }),
          position: fc.constantFrom('top-right', 'top-center', 'center') as fc.Arbitrary<'top-right' | 'top-center' | 'center'>,
          maxQueueSize: fc.integer({ min: 1, max: 100 })
        }),
        (configUpdate) => {
          // Get a fresh instance for each property test iteration
          const configService = ChallengeNotificationConfigService.getInstance();
          
          const result = configService.updateConfig(configUpdate);
          const updatedConfig = configService.getConfig();

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
          expect(updatedConfig.displayDuration).toBe(configUpdate.displayDuration);
          expect(updatedConfig.position).toBe(configUpdate.position);
          expect(updatedConfig.maxQueueSize).toBe(configUpdate.maxQueueSize);

          // Reset for next iteration
          localStorage.clear();
          ChallengeNotificationConfigService.resetInstance();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should notify listeners of configuration changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          displayDuration: fc.integer({ min: 1000, max: 30000 }),
          enableNotifications: fc.boolean()
        }),
        (configUpdate) => {
          // Get a fresh instance for each property test iteration
          const configService = ChallengeNotificationConfigService.getInstance();
          const changeEvents: ConfigChangeEvent[] = [];
          
          const unsubscribe = configService.onConfigChange((event) => {
            changeEvents.push(event);
          });

          configService.updateConfig(configUpdate);

          expect(changeEvents).toHaveLength(1);
          expect(changeEvents[0].type).toBe('config_updated');
          expect(changeEvents[0].changes).toEqual(configUpdate);
          expect(changeEvents[0].timestamp).toBeInstanceOf(Date);

          unsubscribe();
          
          // Reset for next iteration
          localStorage.clear();
          ChallengeNotificationConfigService.resetInstance();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject invalid configuration changes', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ displayDuration: fc.integer({ max: 999 }) }),
          fc.record({ maxQueueSize: fc.integer({ max: 0 }) })
        ),
        (invalidUpdate) => {
          const configService = ChallengeNotificationConfigService.getInstance();
          const initialConfig = configService.getConfig();
          const result = configService.updateConfig(invalidUpdate as any);
          const currentConfig = configService.getConfig();

          expect(currentConfig.displayDuration).toBe(initialConfig.displayDuration);
          expect(currentConfig.maxQueueSize).toBe(initialConfig.maxQueueSize);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);

          // Reset for next iteration
          localStorage.clear();
          ChallengeNotificationConfigService.resetInstance();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should apply configuration changes atomically', () => {
    fc.assert(
      fc.property(
        fc.record({
          displayDuration: fc.integer({ min: 1000, max: 30000 }),
          position: fc.constantFrom('top-right', 'top-center', 'center') as fc.Arbitrary<'top-right' | 'top-center' | 'center'>,
          invalidField: fc.integer({ max: 0 })
        }),
        (mixedUpdate) => {
          const configService = ChallengeNotificationConfigService.getInstance();
          const initialConfig = configService.getConfig();
          const updateWithInvalid = {
            displayDuration: mixedUpdate.displayDuration,
            position: mixedUpdate.position,
            maxQueueSize: mixedUpdate.invalidField
          };

          const result = configService.updateConfig(updateWithInvalid);
          const currentConfig = configService.getConfig();

          // Config should remain unchanged due to invalid maxQueueSize
          expect(currentConfig.displayDuration).toBe(initialConfig.displayDuration);
          expect(currentConfig.position).toBe(initialConfig.position);
          expect(currentConfig.maxQueueSize).toBe(initialConfig.maxQueueSize);
          expect(result.isValid).toBe(false);

          // Reset for next iteration
          localStorage.clear();
          ChallengeNotificationConfigService.resetInstance();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly apply challenge filtering', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        (enabledTypes, testType) => {
          const configService = ChallengeNotificationConfigService.getInstance();
          
          configService.updateConfig({
            enabledChallengeTypes: enabledTypes,
            enabledChallengeCategories: [],
            enableNotifications: true
          });

          const shouldNotify = configService.shouldNotifyForChallenge(testType, undefined);
          const typeAllowed = enabledTypes.includes(testType);
          expect(shouldNotify).toBe(typeAllowed);

          // Reset for next iteration
          localStorage.clear();
          ChallengeNotificationConfigService.resetInstance();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should allow all challenges when no filters are set', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (testType, testCategory) => {
          const configService = ChallengeNotificationConfigService.getInstance();
          
          configService.updateConfig({
            enabledChallengeTypes: [],
            enabledChallengeCategories: [],
            enableNotifications: true
          });

          const shouldNotify = configService.shouldNotifyForChallenge(testType, testCategory);
          expect(shouldNotify).toBe(true);

          // Reset for next iteration
          localStorage.clear();
          ChallengeNotificationConfigService.resetInstance();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
