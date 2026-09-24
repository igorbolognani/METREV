import yaml from 'js-yaml';

import modelDefinitionYaml from '../../../bioelectrochem_agent_kit/domain/rules/mechanistic-model.yml';
import type { MechanisticModelDefinition } from './loaders';

export * from './browser';

export function loadMechanisticModelDefinition(): MechanisticModelDefinition {
  return yaml.load(modelDefinitionYaml) as MechanisticModelDefinition;
}
