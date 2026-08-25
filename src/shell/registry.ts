import type { Command, Registry } from './types';

/** Name-keyed command registry; duplicate names throw instead of silently
 *  letting the last registration win. */
export function createRegistry(): Registry {
  const commands = new Map<string, Command>();
  return {
    register(cmd: Command) {
      const existing = commands.get(cmd.name);
      if (existing && existing !== cmd) {
        throw new Error(`command "${cmd.name}" is already registered`);
      }
      commands.set(cmd.name, cmd);
    },
    get(name: string) {
      return commands.get(name);
    },
    list() {
      return [...commands.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
