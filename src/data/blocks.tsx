import { type ReactElement } from "react";

// Initialize variables and their colors from this file's variable definitions
import { useVariableStore, initializeVariableColors } from "@/stores";
import { getDefaultValues, variableDefinitions } from "./variables";
useVariableStore.getState().initialize(getDefaultValues());
initializeVariableColors(variableDefinitions);

// Import lesson sections
import { topologyLessonBlocks } from "./sections/TopologyLesson";

/**
 * ------------------------------------------------------------------
 * TOPOLOGY LESSON: STRETCHING AND SQUISHING
 * ------------------------------------------------------------------
 * A play-dough adventure for toddlers exploring algebraic topology concepts!
 *
 * Sections:
 * 1. Introduction - Meet your play-dough
 * 2. The Magic Rule - Stretch, squish, but no holes!
 * 3. Shape Transformations - Shape families
 * 4. The Impossible Challenge - Ball vs Donut
 * 5. Sorting Game - Interactive activity
 */

export const blocks: ReactElement[] = [
    ...topologyLessonBlocks,
];
