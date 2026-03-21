import * as core from "@actions/core";
import { run } from './index.js';

run().catch((err) => {
    core.setFailed(`Action failed with error: ${err.message}`);
});