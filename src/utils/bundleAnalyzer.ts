/**
 * Bundle analysis utilities for build-time optimization
 * Helps identify optimization opportunities for Raspberry Pi deployment
 */

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  recommendations: OptimizationRecommendation[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isVendor: boolean;
  isAsync: boolean;
}

export interface DependencyInfo {
  name: string;
  size: number;
  version: string;
  isTreeShakeable: boolean;
  unusedExports?: string[];
}

export interface OptimizationRecommendation {
  type: 'code-split' | 'tree-shake' | 'lazy-load' | 'bundle-size' | 'dependency';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  solution: string;
}

export class BundleAnalyzer {
  private readonly RASPBERRY_PI_LIMITS = {
    maxBundleSize: 1024 * 1024, // 1MB for main bundle
    maxChunkSize: 512 * 1024,   // 512KB for chunks
    maxDependencySize: 256 * 1024, // 256KB for individual dependencies
    // ARM-specific limits
    maxTotalSize: 2 * 1024 * 1024, // 2MB total for all chunks
    maxChunkCount: 15, // Optimal number of chunks for HTTP/2
    targetLoadTime: 10000, // 10 seconds on Raspberry Pi
    memoryLimit: 2048 * 1024 * 1024, // 2GB RAM limit
  };

  /**
   * Analyze bundle for Raspberry Pi optimization opportunities
   */
  analyzeBundleForRaspberryPi(bundleStats: any): BundleAnalysis {
    const chunks = this.extractChunkInfo(bundleStats);
    const dependencies = this.extractDependencyInfo(bundleStats);
    const recommendations = this.generateRecommendations(chunks, dependencies);

    return {
      totalSize: this.calculateTotalSize(chunks),
      gzippedSize: this.calculateGzippedSize(chunks),
      chunks,
      dependencies,
      recommendations,
    };
  }

  private extractChunkInfo(bundleStats: any): ChunkInfo[] {
    if (!bundleStats?.chunks) return [];

    return bundleStats.chunks.map((chunk: any) => ({
      name: chunk.name || 'unnamed',
      size: chunk.size || 0,
      gzippedSize: this.estimateGzippedSize(chunk.size || 0),
      modules: chunk.modules?.map((m: any) => m.name || m.id) || [],
      isVendor: this.isVendorChunk(chunk),
      isAsync: chunk.initial === false,
    }));
  }

  private extractDependencyInfo(bundleStats: any): DependencyInfo[] {
    if (!bundleStats?.modules) return [];

    const dependencies = new Map<string, DependencyInfo>();

    bundleStats.modules.forEach((module: any) => {
      const depName = this.extractDependencyName(module.name || module.id);
      if (depName && depName.includes('node_modules')) {
        const cleanName = this.cleanDependencyName(depName);
        if (!dependencies.has(cleanName)) {
          dependencies.set(cleanName, {
            name: cleanName,
            size: 0,
            version: 'unknown',
            isTreeShakeable: this.isTreeShakeable(cleanName),
          });
        }
        const dep = dependencies.get(cleanName)!;
        dep.size += module.size || 0;
      }
    });

    return Array.from(dependencies.values());
  }

  private generateRecommendations(
    chunks: ChunkInfo[],
    dependencies: DependencyInfo[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check bundle size recommendations
    recommendations.push(...this.analyzeBundleSize(chunks));
    
    // Check dependency recommendations
    recommendations.push(...this.analyzeDependencies(dependencies));
    
    // Check code splitting opportunities
    recommendations.push(...this.analyzeCodeSplitting(chunks));

    // ARM-specific recommendations
    recommendations.push(...this.analyzeARMOptimizations(chunks, dependencies));

    return recommendations.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private analyzeBundleSize(chunks: ChunkInfo[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    chunks.forEach(chunk => {
      if (chunk.size > this.RASPBERRY_PI_LIMITS.maxChunkSize) {
        recommendations.push({
          type: 'bundle-size',
          severity: chunk.size > this.RASPBERRY_PI_LIMITS.maxChunkSize * 2 ? 'high' : 'medium',
          description: `Chunk "${chunk.name}" is too large (${this.formatSize(chunk.size)})`,
          impact: 'Slow loading on Raspberry Pi with limited bandwidth',
          solution: 'Consider splitting this chunk further or lazy loading non-critical modules',
        });
      }
    });

    return recommendations;
  }

  private analyzeDependencies(dependencies: DependencyInfo[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    dependencies.forEach(dep => {
      if (dep.size > this.RASPBERRY_PI_LIMITS.maxDependencySize) {
        recommendations.push({
          type: 'dependency',
          severity: dep.size > this.RASPBERRY_PI_LIMITS.maxDependencySize * 2 ? 'high' : 'medium',
          description: `Dependency "${dep.name}" is large (${this.formatSize(dep.size)})`,
          impact: 'Increases bundle size and loading time on resource-constrained devices',
          solution: dep.isTreeShakeable 
            ? 'Enable tree shaking or import only needed modules'
            : 'Consider lighter alternatives or lazy loading',
        });
      }

      // Check for common heavy dependencies that have lighter alternatives
      if (this.hasLighterAlternative(dep.name)) {
        recommendations.push({
          type: 'dependency',
          severity: 'medium',
          description: `"${dep.name}" has lighter alternatives available`,
          impact: 'Could reduce bundle size significantly',
          solution: this.getLighterAlternativeSuggestion(dep.name),
        });
      }
    });

    return recommendations;
  }

  private analyzeCodeSplitting(chunks: ChunkInfo[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check if main chunk is too large
    const mainChunk = chunks.find(c => c.name === 'main' || c.name === 'index');
    if (mainChunk && mainChunk.size > this.RASPBERRY_PI_LIMITS.maxBundleSize) {
      recommendations.push({
        type: 'code-split',
        severity: 'high',
        description: 'Main bundle is too large for optimal Raspberry Pi performance',
        impact: 'Slow initial page load and poor user experience',
        solution: 'Implement route-based code splitting and lazy load non-critical components',
      });
    }

    // Check for opportunities to lazy load components
    const largeComponents = chunks.filter(c => 
      c.modules.some(m => m.includes('components/')) && 
      c.size > 50 * 1024 // 50KB
    );

    if (largeComponents.length > 0) {
      recommendations.push({
        type: 'lazy-load',
        severity: 'medium',
        description: 'Large components could be lazy loaded',
        impact: 'Faster initial page load',
        solution: 'Use React.lazy() for components that are not immediately visible',
      });
    }

    return recommendations;
  }

  /**
   * ARM-specific optimization analysis
   */
  private analyzeARMOptimizations(
    chunks: ChunkInfo[],
    dependencies: DependencyInfo[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const totalSize = this.calculateTotalSize(chunks);

    // Check total bundle size for ARM constraints
    if (totalSize > this.RASPBERRY_PI_LIMITS.maxTotalSize) {
      recommendations.push({
        type: 'bundle-size',
        severity: 'high',
        description: `Total bundle size (${this.formatSize(totalSize)}) exceeds ARM-optimized target`,
        impact: 'Slow loading and high memory usage on Raspberry Pi',
        solution: 'Implement aggressive code splitting and lazy loading strategies',
      });
    }

    // Check for animation libraries that impact ARM performance
    const animationDeps = dependencies.filter(dep => 
      dep.name.includes('framer-motion') || 
      dep.name.includes('lottie') ||
      dep.name.includes('animation')
    );
    
    if (animationDeps.length > 0) {
      recommendations.push({
        type: 'lazy-load',
        severity: 'medium',
        description: 'Animation libraries detected - consider ARM-optimized loading',
        impact: 'Reduced frame rates and increased CPU usage on ARM processors',
        solution: 'Lazy load animation libraries and provide reduced motion alternatives',
      });
    }

    // Check chunk count for HTTP/2 optimization
    if (chunks.length > this.RASPBERRY_PI_LIMITS.maxChunkCount) {
      recommendations.push({
        type: 'code-split',
        severity: 'medium',
        description: `Too many chunks (${chunks.length}) for optimal ARM loading`,
        impact: 'Increased connection overhead on slower ARM networking',
        solution: 'Consolidate related chunks or implement intelligent preloading',
      });
    }

    // Check for heavy icon libraries
    const iconDeps = dependencies.filter(dep => 
      dep.name.includes('heroicons') || 
      dep.name.includes('react-icons') ||
      dep.name.includes('icons')
    );
    
    const iconSize = iconDeps.reduce((total, dep) => total + dep.size, 0);
    if (iconSize > 100 * 1024) { // 100KB threshold
      recommendations.push({
        type: 'tree-shake',
        severity: 'low',
        description: `Icon libraries contribute ${this.formatSize(iconSize)} to bundle`,
        impact: 'Increased parsing time on ARM CPU',
        solution: 'Use tree shaking or consider SVG sprite sheets for better ARM performance',
      });
    }

    // Check for polyfills that might not be needed on modern ARM browsers
    const polyfillDeps = dependencies.filter(dep => 
      dep.name.includes('polyfill') || 
      dep.name.includes('core-js')
    );
    
    if (polyfillDeps.length > 0) {
      recommendations.push({
        type: 'dependency',
        severity: 'low',
        description: 'Polyfills detected - may not be needed for modern ARM browsers',
        impact: 'Unnecessary code execution on ARM processors',
        solution: 'Review polyfill requirements for target ARM browser versions',
      });
    }

    return recommendations;
  }

  private calculateTotalSize(chunks: ChunkInfo[]): number {
    return chunks.reduce((total, chunk) => total + chunk.size, 0);
  }

  private calculateGzippedSize(chunks: ChunkInfo[]): number {
    return chunks.reduce((total, chunk) => total + chunk.gzippedSize, 0);
  }

  private estimateGzippedSize(size: number): number {
    // Rough estimate: gzipped size is typically 25-30% of original
    return Math.round(size * 0.3);
  }

  private isVendorChunk(chunk: any): boolean {
    return chunk.name?.includes('vendor') || 
           chunk.modules?.some((m: any) => (m.name || m.id)?.includes('node_modules'));
  }

  private extractDependencyName(modulePath: string): string {
    if (!modulePath) return '';
    const match = modulePath.match(/node_modules\/([^\/]+)/);
    return match ? match[1] : '';
  }

  private cleanDependencyName(name: string): string {
    // Remove scoped package prefixes and version info
    return name.replace(/^@[^\/]+\//, '').replace(/@.*$/, '');
  }

  private isTreeShakeable(depName: string): boolean {
    // List of known tree-shakeable libraries
    const treeShakeableLibs = [
      'lodash-es', 'date-fns', 'rxjs', 'ramda',
      '@heroicons/react', 'lucide-react'
    ];
    return treeShakeableLibs.includes(depName);
  }

  private hasLighterAlternative(depName: string): boolean {
    const heavyLibs = ['moment', 'lodash', 'axios'];
    return heavyLibs.includes(depName);
  }

  private getLighterAlternativeSuggestion(depName: string): string {
    const alternatives: Record<string, string> = {
      'moment': 'Use date-fns or dayjs for smaller bundle size',
      'lodash': 'Use lodash-es with tree shaking or native ES6 methods',
      'axios': 'Consider using fetch API or a lighter HTTP client like ky',
    };
    return alternatives[depName] || 'Research lighter alternatives';
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate optimization report for Raspberry Pi deployment
   */
  generateOptimizationReport(analysis: BundleAnalysis): string {
    let report = '# Bundle Optimization Report for Raspberry Pi\n\n';
    
    report += `## Bundle Summary\n`;
    report += `- Total Size: ${this.formatSize(analysis.totalSize)}\n`;
    report += `- Gzipped Size: ${this.formatSize(analysis.gzippedSize)}\n`;
    report += `- Number of Chunks: ${analysis.chunks.length}\n`;
    report += `- Dependencies: ${analysis.dependencies.length}\n\n`;

    if (analysis.recommendations.length > 0) {
      report += `## Optimization Recommendations\n\n`;
      analysis.recommendations.forEach((rec, index) => {
        report += `### ${index + 1}. ${rec.description} (${rec.severity.toUpperCase()})\n`;
        report += `**Impact:** ${rec.impact}\n`;
        report += `**Solution:** ${rec.solution}\n\n`;
      });
    }

    report += `## Chunk Analysis\n\n`;
    analysis.chunks.forEach(chunk => {
      report += `- **${chunk.name}**: ${this.formatSize(chunk.size)} `;
      report += `(${chunk.isVendor ? 'vendor' : 'app'}, `;
      report += `${chunk.isAsync ? 'async' : 'sync'})\n`;
    });

    return report;
  }
}

// Export singleton instance
export const bundleAnalyzer = new BundleAnalyzer();