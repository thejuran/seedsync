import { Record } from 'immutable';

interface IAutoQueuePattern {
  pattern: string | null;
}
const DefaultAutoQueuePattern: IAutoQueuePattern = {
  pattern: null,
};
const AutoQueuePatternRecord = Record(DefaultAutoQueuePattern);

export class AutoQueuePattern extends AutoQueuePatternRecord implements IAutoQueuePattern {
  declare pattern: string | null;

  constructor(props: Partial<IAutoQueuePattern>) {
    super(props);
  }
}

/**
 * AutoQueuePattern as serialized by the backend.
 * Note: naming convention matches that used in JSON
 */
export interface AutoQueuePatternJson {
  pattern: string;
}
