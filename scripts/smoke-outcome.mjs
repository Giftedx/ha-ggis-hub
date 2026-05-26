export function smokeDoorLaunchExitCode({ errors, navigations, expectedNavigationUrl }) {
  return smokeDoorLaunchFailures({ errors, navigations, expectedNavigationUrl }).length === 0 ? 0 : 1;
}

export function smokeDoorLaunchFailures({ errors, navigations, expectedNavigationUrl }) {
  const failures = [];
  if (errors.length > 0) {
    failures.push('page errors during smoke');
  }
  if (!navigations.some((navigation) => navigation.startsWith(expectedNavigationUrl))) {
    failures.push(`expected navigation not observed: ${expectedNavigationUrl}`);
  }
  return failures;
}
