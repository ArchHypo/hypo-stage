/**
 * Entry for standalone demo build (Vercel).
 * Loads the dev app with mock API and seed data.
 */
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

import '../dev/demo';
