import * as core from "@actions/core";
import { run } from './index';

if (require.main === module) {
  run().catch((err) => {
    core.setFailed(`Action failed with error: ${err.message}`);
  });
}