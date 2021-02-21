/**
 * Shared context in a tutorial graph.
 */
export type TutorialContext = {
    [key: string]: any
}

/**
 * Node in the tutorial graph. Can be composed with tutStep and tutFork to build
 * a tutorial graph.
 */
export type TutorialStep = {
    /**
     * Called when the step is started. Should call complete when the step is done. Can use context to share data with other steps.
     */
    start: (context: TutorialContext, complete: () => void) => void

    /**
     * Called when the step is supposed to reset to its initial step.
     */
    reset: () => void
}

/**
 * Creates a tutorial step given the start and reset functions.
 * @param start Called when the step is started. Should call complete when the step is done. Can use context to share data with other steps.
 * @param reset Called when the step is supposed to reset to its initial state.
 */
export const tutStep = (start: (context: TutorialContext, complete: () => void) => void, reset: () => void): TutorialStep => {
    return { start, reset }
}

/**
 * Creates a tutorial step that waits for steps to complete in parallel before completing itself.
 * @param steps List of tutorial steps to wrap in parallel.
 */
export const tutFork = (...steps: TutorialStep[]): TutorialStep => {
    const stepsCompleted = steps.map(s => false)

    return tutStep((context, onComplete) => {
        // Once all steps are completed, complete ourselves
        for (let i = 0; i < steps.length; i++) {
            const stepIndex = i
            steps[stepIndex].start(context, () => {
                stepsCompleted[stepIndex] = true
                if (stepsCompleted.every(c => c)) {
                    onComplete()
                }
            })
        }
    }, () => steps.forEach(step => step.reset()))
}

/**
 * Creates a tutorial step that executes individual steps one after another. The step completes when the final step was completed.
 * @param steps List of tutorial steps to wrap sequentially.
 */
export const tutSeq = (...steps: TutorialStep[]): TutorialStep => {
    return tutStep((context, onComplete) => {
        const startStep = (i: number) => {
            const step = steps[i]

            if (i + 1 >= steps.length) {
                step.start(context, onComplete)
            } else {
                step.start(context, () => startStep(i +  1))
            }
        }

        startStep(0)
    }, () => steps.forEach(step => step.reset()))
}
