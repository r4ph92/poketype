export function pickMessages<Namespace extends object, Key extends keyof Namespace>(namespace: Namespace, keys: readonly Key[]): Pick<Namespace, Key> {
  return Object.fromEntries(keys.map((key) => [key, namespace[key]])) as Pick<Namespace, Key>;
}
