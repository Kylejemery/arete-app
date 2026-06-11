// Custom entry: install the global crash capture BEFORE expo-router (and the
// rest of the app graph) evaluates, so fatal errors thrown during module
// initialization are recorded too. Import order is evaluation order here —
// keep crashCapture first.
import './lib/crashCapture';
import 'expo-router/entry';
