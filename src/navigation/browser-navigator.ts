import type { HubGameLaunchTarget } from '../games/registry';
import type { LaunchNavigator } from './launch';

/** Browser navigation for door/direct launches. Route and external-url both
 *  use `location.assign` today — same-origin routes need a deployed static
 *  build at the target path; external URLs leave the hub origin per ADR-0003. */
export function createBrowserLaunchNavigator(): LaunchNavigator {
  return {
    navigate(target: string, _targetKind: Exclude<HubGameLaunchTarget['kind'], 'none'>): void {
      window.location.assign(target);
    },
  };
}
