/**
 * @format
 */

// Hermes (RN's JS engine) doesn't ship TextEncoder — polyfill before any import uses it
import 'fast-text-encoding';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
