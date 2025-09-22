# Testing Documentation

This document describes the comprehensive testing suite for the Chicken Race Ranking application.

## Test Structure

The testing suite is organized into several categories:

### 1. Unit Tests (`__tests__` directories)
- **Location**: Alongside source files in `__tests__` directories
- **Purpose**: Test individual components, hooks, services, and utilities in isolation
- **Coverage**: All components, hooks, services, stores, and utility functions
- **Tools**: Vitest, React Testing Library, Jest DOM

### 2. Integration Tests (`__tests__/*.integration.test.tsx`)
- **Location**: Within component `__tests__` directories
- **Purpose**: Test component interactions with stores, API services, and other components
- **Coverage**: Data flow, state management, API integration
- **Tools**: Vitest, React Testing Library, Mock API services

### 3. End-to-End Tests (`src/test/e2e/`)
- **Location**: `src/test/e2e/`
- **Purpose**: Test complete user workflows and application behavior
- **Coverage**: Full user journeys, cross-component interactions
- **Tools**: Vitest, React Testing Library, User Event

### 4. Error Scenario Tests (`src/test/scenarios/`)
- **Location**: `src/test/scenarios/`
- **Purpose**: Test error handling, edge cases, and recovery scenarios
- **Coverage**: Network failures, API errors, data validation, configuration issues
- **Tools**: Vitest, Mock implementations, Error simulation

### 5. Performance Tests (`src/test/performance/`)
- **Location**: `src/test/performance/`
- **Purpose**: Test rendering performance, memory usage, and optimization
- **Coverage**: Large datasets, animation performance, memory leaks
- **Tools**: Vitest, Performance API, Memory profiling

## Test Categories

### Component Tests
Each component has comprehensive tests covering:
- **Rendering**: Correct display of data and UI elements
- **Interactions**: User interactions (clicks, hovers, keyboard navigation)
- **Props**: Different prop combinations and edge cases
- **State**: Internal state management and updates
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: Mobile and desktop layouts

### Service Tests
API and utility services are tested for:
- **Functionality**: Core service methods and operations
- **Error Handling**: Network failures, API errors, timeouts
- **Data Validation**: Input validation and response parsing
- **Configuration**: Different configuration scenarios
- **Retry Logic**: Exponential backoff and retry mechanisms

### Store Tests
State management stores are tested for:
- **State Updates**: Correct state transitions
- **Actions**: All store actions and their effects
- **Selectors**: Data selection and computed values
- **Persistence**: State persistence and hydration
- **Concurrency**: Concurrent updates and race conditions

### Hook Tests
Custom hooks are tested for:
- **Functionality**: Core hook behavior and return values
- **Dependencies**: Dependency changes and effects
- **Cleanup**: Proper cleanup on unmount
- **Edge Cases**: Unusual usage patterns and error conditions
- **Performance**: Unnecessary re-renders and optimizations

## Test Utilities

### Mock Data (`src/test/utils/testUtils.tsx`)
Provides factory functions for creating test data:
- `createMockPlayer()`: Generate mock player data
- `createMockLeaderboard()`: Generate mock leaderboard data
- `createMockApiService()`: Create mock API service instances
- `mockPlayersSet`: Pre-defined player datasets (small, large, tied, etc.)
- `mockLeaderboardsSet`: Pre-defined leaderboard datasets

### Error Simulation
Helper functions for simulating different error conditions:
- `createNetworkError()`: Network connectivity issues
- `createApiError()`: HTTP status code errors
- `createTimeoutError()`: Request timeout scenarios

### Performance Testing
Utilities for measuring and asserting performance:
- `measureRenderTime()`: Measure component render time
- `expectRenderTimeUnder()`: Assert render time thresholds
- Animation frame helpers for testing smooth animations

### Environment Setup
- `mockEnvironmentVariables()`: Set up test environment variables
- `renderWithProviders()`: Render components with necessary providers

## Coverage Requirements

### Global Coverage Thresholds
- **Branches**: 85%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

### Critical Component Thresholds
- **ChickenRace Component**: 90% (core visualization)
- **API Service**: 95% (critical for data integrity)
- **Store Modules**: 90% (state management)

### Coverage Exclusions
- Example components (`src/components/examples/`)
- Test utilities and setup files
- Type definitions
- Configuration files
- Build artifacts

## Running Tests

### Basic Test Commands
```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Specific Test Categories
```bash
# Run only end-to-end tests
npm run test:e2e

# Run only performance tests
npm run test:performance

# Run only error scenario tests
npm run test:scenarios

# Run all test categories
npm run test:all
```

### CI/CD Integration
```bash
# Full CI test suite (used in GitHub Actions)
npm run test:coverage
```

## Test Patterns and Best Practices

### Component Testing Pattern
```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      // Test basic rendering
    });
    
    it('should render with custom props', () => {
      // Test prop variations
    });
  });

  describe('Interactions', () => {
    it('should handle user interactions', () => {
      // Test user events
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      // Test ARIA labels, keyboard navigation
    });
  });
});
```

### Service Testing Pattern
```typescript
describe('ServiceName', () => {
  describe('Success Cases', () => {
    it('should handle successful operations', () => {
      // Test normal operation
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      // Test error scenarios
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### Mock Strategy
- **API Services**: Always mocked in unit and integration tests
- **External Dependencies**: Mocked to ensure test isolation
- **Time-based Functions**: Use fake timers for predictable testing
- **Random Functions**: Mocked for deterministic results

### Assertion Guidelines
- Use semantic queries (`getByRole`, `getByLabelText`) over implementation details
- Test user-visible behavior, not internal implementation
- Assert on meaningful user outcomes
- Use `waitFor` for asynchronous operations
- Prefer `toBeInTheDocument()` over `toBeTruthy()` for DOM assertions

## Debugging Tests

### Common Issues
1. **Async Operations**: Use `waitFor` and `act` appropriately
2. **Timer Issues**: Ensure fake timers are properly set up and cleaned up
3. **Mock Cleanup**: Clear mocks between tests to avoid interference
4. **Memory Leaks**: Properly unmount components and clean up subscriptions

### Debugging Tools
- **Vitest UI**: Visual test runner for debugging
- **React Testing Library Debug**: `screen.debug()` for DOM inspection
- **Console Logging**: Strategic logging in test setup and teardown
- **Coverage Reports**: HTML coverage reports for identifying gaps

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline runs:
1. **Type Checking**: TypeScript compilation
2. **Linting**: ESLint code quality checks
3. **Unit Tests**: All unit and integration tests
4. **Coverage**: Code coverage analysis with thresholds
5. **Build**: Production build verification

### Coverage Reporting
- Coverage reports are generated in HTML and JSON formats
- Reports are uploaded to Codecov for tracking over time
- Pull requests show coverage diff and impact
- CI fails if coverage drops below thresholds

### Performance Monitoring
- Performance tests run in CI to catch regressions
- Memory usage is monitored for large dataset scenarios
- Animation performance is validated for smooth user experience

## Maintenance

### Adding New Tests
1. Follow the established directory structure
2. Use appropriate test utilities and mock data
3. Ensure proper cleanup in `afterEach` hooks
4. Add both positive and negative test cases
5. Update coverage thresholds if needed

### Updating Existing Tests
1. Maintain backward compatibility when possible
2. Update mock data to reflect API changes
3. Ensure tests still validate meaningful behavior
4. Update documentation for significant changes

### Test Data Management
- Keep mock data realistic and representative
- Update test data when API contracts change
- Use factory functions for consistent test data generation
- Avoid hardcoded values that may become outdated