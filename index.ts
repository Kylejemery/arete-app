// Custom entry: install the global crash capture BEFORE expo-router (and the
// rest of the app graph) evaluates, so fatal errors thrown during module
// initialization are recorded too. Import order is evaluation order here —
// keep crashCapture first.
import { breadcrumb } from './lib/crashCapture';
import 'expo-router/entry';

// Imports above are hoisted, so this runs only after expo-router/entry (and
// the whole app module graph) finished evaluating. Together with the
// breadcrumb crashCapture sends during its own eval, this brackets the
// app-graph evaluation: if only the first breadcrumb arrives, boot died
// inside the module graph.
breadcrumb('entry: app module graph evaluated');
