// Plugin point for apps: each file in this directory exports a Command; add
// one here and it becomes part of the shell. Nothing else changes.
import type { Command } from '../shell/types';
import { cat } from './cat';
import { cd } from './cd';
import { clear } from './clear';
import { ls } from './ls';
import { pwd } from './pwd';
import { tree } from './tree';
import { whoami } from './whoami';

export const builtinApps: Command[] = [cat, cd, clear, ls, pwd, tree, whoami];
